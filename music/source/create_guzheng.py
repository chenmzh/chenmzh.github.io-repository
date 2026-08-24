#!/usr/bin/env python3
"""Render a small guzheng-style piece without third-party audio assets.

The renderer is intentionally deterministic: the composition JSON fixes the musical
input and the seed fixes the small amount of pluck noise/phase variation.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import struct
import wave
from pathlib import Path

import numpy as np


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_COMPOSITION = ROOT / "composition" / "moonlit_stream.json"
DEFAULT_WAV = ROOT / "outputs" / "moonlit_stream.wav"
DEFAULT_MIDI = ROOT / "outputs" / "moonlit_stream.mid"
DEFAULT_METADATA = ROOT / "outputs" / "moonlit_stream.metadata.json"


def midi_to_hz(note: int) -> float:
    return 440.0 * (2.0 ** ((note - 69) / 12.0))


def read_composition(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        composition = json.load(handle)
    required = ("title", "tempo_bpm", "bars", "events", "sample_rate", "seed")
    missing = [key for key in required if key not in composition]
    if missing:
        raise ValueError(f"composition missing keys: {', '.join(missing)}")
    if not composition["events"]:
        raise ValueError("composition contains no events")
    return composition


def expanded_events(events: list[dict]) -> list[dict]:
    """Expand small ornaments into ordinary note events for audio and MIDI."""
    result: list[dict] = []
    for event_index, event in enumerate(events):
        base = dict(event)
        ornament = base.pop("ornament", None)
        base["source_index"] = event_index
        if ornament == "grace":
            grace = dict(base)
            grace["start"] = max(0.0, float(event["start"]) - 0.20)
            grace["dur"] = 0.16
            grace["midi"] = int(event["midi"]) - 2
            grace["velocity"] = max(24, int(event["velocity"]) - 20)
            grace["layer"] = "grace"
            result.append(grace)
            base["start"] = float(event["start"]) - 0.015
        if ornament == "tremolo":
            start = float(event["start"])
            duration = float(event["dur"])
            step = 0.25
            count = max(2, int(math.ceil(duration / step)))
            for index in range(count):
                tremolo = dict(base)
                tremolo["start"] = start + index * step
                tremolo["dur"] = min(0.22, max(0.08, duration - index * step))
                tremolo["velocity"] = int(event["velocity"] * (1.0 if index % 4 == 0 else 0.78))
                tremolo["layer"] = "tremolo"
                result.append(tremolo)
            continue
        result.append(base)
    return sorted(result, key=lambda item: (float(item["start"]), int(item["midi"])))


def render_note(
    midi: int,
    seconds: float,
    velocity: int,
    layer: str,
    rng: np.random.Generator,
    sample_rate: int,
) -> np.ndarray:
    """Create one plucked-string voice with a bright attack and decaying body."""
    seconds = max(0.08, seconds)
    count = max(16, int(math.ceil(seconds * sample_rate)))
    t = np.arange(count, dtype=np.float64) / sample_rate
    frequency = midi_to_hz(midi)

    # A low register rings longer; upper strings decay more quickly.
    decay = 1.55 + max(0.0, 72.0 - midi) * 0.012
    if layer == "drone":
        decay *= 1.30
    if layer == "grace":
        decay *= 0.68
    if layer == "tremolo":
        decay *= 0.76

    # A tiny, deterministic drift keeps the additive partials from sounding sterile.
    phase = float(rng.uniform(0.0, 2.0 * math.pi))
    drift_rate = float(rng.uniform(4.3, 5.8))
    drift_depth = float(rng.uniform(0.0012, 0.0032))
    phase_mod = drift_depth * np.sin(2.0 * math.pi * drift_rate * t + phase)

    body = np.zeros_like(t)
    partial_amplitudes = (1.00, 0.47, 0.25, 0.14, 0.085, 0.050, 0.030, 0.018)
    nyquist_limit = sample_rate * 0.47
    for partial, partial_gain in enumerate(partial_amplitudes, start=1):
        partial_frequency = frequency * partial
        if partial_frequency >= nyquist_limit:
            break
        partial_decay = decay / (1.0 + 0.18 * (partial - 1))
        partial_phase = float(rng.uniform(0.0, 2.0 * math.pi))
        body += partial_gain * np.sin(
            2.0 * math.pi * partial_frequency * t + partial_phase + phase_mod * partial
        ) * np.exp(-t / partial_decay)

    # A short noise burst is the plectrum/string contact; it disappears quickly.
    pluck_noise = rng.normal(0.0, 1.0, count)
    pluck_noise *= np.exp(-t / 0.010)
    pluck_noise *= 0.070 if layer != "drone" else 0.040

    # A faint octave-lower body resonance gives the low strings a wooden soundboard.
    resonance = 0.075 * np.sin(2.0 * math.pi * frequency * 0.5 * t + phase)
    resonance *= np.exp(-t / (decay * 1.25))

    attack = 1.0 - np.exp(-t / 0.0038)
    envelope = attack * np.exp(-t / decay)
    voice = (body + pluck_noise + resonance) * envelope

    # Velocity and register are kept conservative so overlapping ringing strings do not clip.
    layer_gain = {"melody": 0.185, "drone": 0.070, "grace": 0.115, "tremolo": 0.145}.get(layer, 0.16)
    return voice * (max(1, min(127, velocity)) / 127.0) * layer_gain


def add_reverb(stereo: np.ndarray, sample_rate: int) -> np.ndarray:
    """Add a small deterministic room made from cross-fed delay taps."""
    wet = stereo.copy()
    taps = ((0.17, 0.135), (0.31, 0.095), (0.53, 0.068), (0.79, 0.045), (1.07, 0.028))
    for delay_seconds, gain in taps:
        delay = int(delay_seconds * sample_rate)
        if delay >= len(stereo):
            continue
        wet[delay:, 0] += stereo[:-delay, 1] * gain
        wet[delay:, 1] += stereo[:-delay, 0] * gain
    return wet


def render_wav(composition: dict, output_path: Path) -> dict:
    sample_rate = int(composition["sample_rate"])
    tempo = float(composition["tempo_bpm"])
    beat_seconds = 60.0 / tempo
    tail_seconds = 4.5
    total_seconds = float(composition["bars"]) * 4.0 * beat_seconds + tail_seconds
    frame_count = int(math.ceil(total_seconds * sample_rate))
    stereo = np.zeros((frame_count, 2), dtype=np.float64)
    rng = np.random.default_rng(int(composition["seed"]))
    events = expanded_events(composition["events"])

    for event_index, event in enumerate(events):
        start_seconds = float(event["start"]) * beat_seconds
        if start_seconds >= total_seconds:
            continue
        start_frame = max(0, int(round(start_seconds * sample_rate)))
        note_seconds = float(event["dur"]) * beat_seconds
        # Ring past the written duration, but cap every voice for a bounded render.
        ring_seconds = min(3.4, 1.0 + max(0.0, 72.0 - int(event["midi"])) * 0.010)
        voice = render_note(
            int(event["midi"]),
            note_seconds + ring_seconds,
            int(event["velocity"]),
            str(event.get("layer", "melody")),
            rng,
            sample_rate,
        )
        end_frame = min(frame_count, start_frame + len(voice))
        if end_frame <= start_frame:
            continue
        voice = voice[: end_frame - start_frame]
        # Mildly moving pan: higher strings lean right, grace notes lean left.
        pan = 0.50 + 0.16 * math.sin(int(event["midi"]) * 0.37 + event_index * 0.91)
        if event.get("layer") == "drone":
            pan = 0.46 + 0.08 * math.sin(event_index)
        left_gain = math.cos(pan * math.pi / 2.0)
        right_gain = math.sin(pan * math.pi / 2.0)
        stereo[start_frame:end_frame, 0] += voice * left_gain
        stereo[start_frame:end_frame, 1] += voice * right_gain

    # Short room reflections and a gentle master fade keep the coda natural.
    stereo = add_reverb(stereo, sample_rate)
    fade_in = min(frame_count, int(0.025 * sample_rate))
    fade_out = min(frame_count, int(2.8 * sample_rate))
    if fade_in:
        stereo[:fade_in] *= np.linspace(0.0, 1.0, fade_in)[:, None]
    if fade_out:
        stereo[-fade_out:] *= np.linspace(1.0, 0.0, fade_out)[:, None]

    peak_before = float(np.max(np.abs(stereo)))
    if peak_before > 0.0:
        stereo *= 0.90 / peak_before
    peak_after = float(np.max(np.abs(stereo)))
    rms = float(np.sqrt(np.mean(stereo * stereo)))
    # Deterministic low-level dither before 16-bit PCM conversion.
    dither = rng.uniform(-0.5, 0.5, stereo.shape) / 32768.0
    pcm = np.clip(np.round((stereo + dither) * 32767.0), -32768, 32767).astype(np.int16)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(output_path), "wb") as handle:
        handle.setnchannels(2)
        handle.setsampwidth(2)
        handle.setframerate(sample_rate)
        handle.writeframes(pcm.tobytes())

    return {
        "sample_rate_hz": sample_rate,
        "channels": 2,
        "sample_width_bits": 16,
        "duration_seconds": frame_count / sample_rate,
        "peak_normalized": peak_after,
        "rms_normalized": rms,
        "expanded_note_count": len(events),
        "source_event_count": len(composition["events"]),
        "tail_seconds": tail_seconds,
    }


def vlq(value: int) -> bytes:
    value = max(0, int(value))
    buffer = [value & 0x7F]
    value >>= 7
    while value:
        buffer.insert(0, (value & 0x7F) | 0x80)
        value >>= 7
    return bytes(buffer)


def midi_text(data: bytes) -> bytes:
    encoded = data.encode("utf-8")
    return b"\xff\x01" + vlq(len(encoded)) + encoded


def make_midi(composition: dict, output_path: Path) -> dict:
    ppq = 480
    tempo = float(composition["tempo_bpm"])
    microseconds_per_quarter = int(round(60_000_000 / tempo))
    events = expanded_events(composition["events"])
    midi_events: list[tuple[int, int, bytes]] = [
        (0, 0, b"\xff\x03" + vlq(len(composition["title"].encode("utf-8"))) + composition["title"].encode("utf-8")),
        (0, 0, b"\xff\x51\x03" + microseconds_per_quarter.to_bytes(3, "big")),
        (0, 0, b"\xff\x58\x04\x04\x02\x18\x08"),
        (0, 0, b"\xff\x59\x02\x02\x00"),
        (0, 0, b"\xc0\x6b"),  # GM program 108 (zero-based 107): Koto
        (0, 0, midi_text("Guzheng-style synthesized performance; D pentatonic")),
    ]
    for event in events:
        start_tick = max(0, int(round(float(event["start"]) * ppq)))
        end_tick = max(start_tick + 1, int(round((float(event["start"]) + float(event["dur"])) * ppq)))
        note = max(0, min(127, int(event["midi"])))
        velocity = max(1, min(127, int(event["velocity"])))
        midi_events.append((start_tick, 2, bytes((0x90, note, velocity))))
        midi_events.append((end_tick, 1, bytes((0x80, note, 0))))
    midi_events.sort(key=lambda item: (item[0], item[1]))

    track = bytearray()
    previous_tick = 0
    for tick, _order, message in midi_events:
        track.extend(vlq(tick - previous_tick))
        track.extend(message)
        previous_tick = tick
    track.extend(b"\x00\xff\x2f\x00")

    header = b"MThd" + struct.pack(">IHHH", 6, 0, 1, ppq)
    chunk = b"MTrk" + struct.pack(">I", len(track)) + bytes(track)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(header + chunk)
    return {"format": "SMF type 0", "ppq": ppq, "track_count": 1, "note_event_count": len(events)}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--composition", type=Path, default=DEFAULT_COMPOSITION)
    parser.add_argument("--wav", type=Path, default=DEFAULT_WAV)
    parser.add_argument("--midi", type=Path, default=DEFAULT_MIDI)
    parser.add_argument("--metadata", type=Path, default=DEFAULT_METADATA)
    args = parser.parse_args()

    composition = read_composition(args.composition)
    wav_info = render_wav(composition, args.wav)
    midi_info = make_midi(composition, args.midi)
    metadata = {
        "title": composition["title"],
        "title_en": composition.get("title_en"),
        "renderer": "src/create_guzheng.py",
        "renderer_version": "1.0.0",
        "seed": composition["seed"],
        "tempo_bpm": composition["tempo_bpm"],
        "time_signature": composition["time_signature"],
        "key_center": composition["key_center"],
        "mode": composition["mode"],
        "wav": wav_info,
        "midi": midi_info,
    }
    metadata["source_sha256"] = sha256(args.composition)
    metadata["wav_sha256"] = sha256(args.wav)
    metadata["midi_sha256"] = sha256(args.midi)
    args.metadata.parent.mkdir(parents=True, exist_ok=True)
    args.metadata.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metadata, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
