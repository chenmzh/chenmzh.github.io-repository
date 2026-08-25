#!/usr/bin/env python3
"""Render a guzheng-style piece with a licensed reference sample and a fallback model.

The renderer is intentionally deterministic: the composition JSON fixes the musical
input, the seed fixes small variations, and the optional CC0 reference sample supplies
the characteristic recorded guzheng attack/resonance that an additive oscillator alone
cannot reproduce.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import struct
import wave
from dataclasses import asdict, dataclass, field
from pathlib import Path

import numpy as np


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_COMPOSITION = ROOT / "composition" / "moonlit_stream.json"
if not DEFAULT_COMPOSITION.exists():
    # The public Pages copy keeps the composition beside this source file.
    DEFAULT_COMPOSITION = ROOT / "source" / "moonlit-stream.json"
DEFAULT_WAV = ROOT / "outputs" / "moonlit_stream.wav"
DEFAULT_MIDI = ROOT / "outputs" / "moonlit_stream.mid"
DEFAULT_METADATA = ROOT / "outputs" / "moonlit_stream.metadata.json"
DEFAULT_SAMPLE = ROOT / "assets" / "samples" / "guzheng-cc0-preview.wav"
REFERENCE_SAMPLE_MIDI = 57  # A3; the CC0 recording's first note is approximately 220 Hz.
REFERENCE_SAMPLE_SECONDS = 5.25  # Stop before the second attack in the public preview.


@dataclass(frozen=True)
class GuzhengTimbre:
    """Centralized synthesis and polyphony controls for a guzheng-like voice."""

    # A guzheng rings naturally, but a bounded pool prevents a long strum from
    # turning into an uncontrolled gain stack.
    max_voices: int = 24
    retrigger_fade_seconds: float = 0.008
    steal_fade_seconds: float = 0.045
    release_fade_seconds: float = 0.120
    recent_voice_protection_seconds: float = 0.180

    # Compared with the old bright model, the onset is gentler and the body rings
    # longer.  Upper partials still speak at the attack, then die away faster.
    attack_seconds: float = 0.008
    base_decay_seconds: float = 2.05
    low_register_decay_scale: float = 0.020
    ring_base_seconds: float = 1.65
    ring_register_scale: float = 0.018
    max_ring_seconds: float = 4.0
    partial_amplitudes: tuple[float, ...] = (1.0, 0.38, 0.17, 0.078, 0.036, 0.017, 0.008, 0.004)
    partial_decay_step: float = 0.26
    inharmonicity: float = 0.00025
    pluck_noise_gain: float = 0.032
    pluck_noise_decay_seconds: float = 0.006
    soundboard_resonance_gain: float = 0.058
    soundboard_decay_multiplier: float = 1.35

    # The sampled attack is retained, while its high-frequency edge closes down
    # quickly so the sustained sound does not become a pipa-like bright buzz.
    sample_body_cutoff_hz: float = 7600.0
    sample_brightness_decay_seconds: float = 0.18
    sample_sustain_decay_seconds: float = 2.40
    sample_sustain_crossfade_seconds: float = 0.060

    # Conservative per-voice levels leave room for chords and a short room tail.
    # Arpeggio is deliberately above the quiet harmony bed so it is audible as
    # a musical gesture rather than disappearing into the drone.
    additive_layer_gains: tuple[tuple[str, float], ...] = (
        ("melody", 0.155),
        ("motif", 0.130),
        ("upper_melody", 0.140),
        ("lower_melody", 0.070),
        ("drone", 0.058),
        ("harmony", 0.095),
        ("arpeggio", 0.125),
        ("grace", 0.095),
        ("tremolo", 0.115),
    )
    sample_layer_gains: tuple[tuple[str, float], ...] = (
        ("melody", 0.205),
        ("motif", 0.160),
        ("upper_melody", 0.170),
        ("lower_melody", 0.085),
        ("drone", 0.075),
        ("harmony", 0.110),
        ("arpeggio", 0.145),
        ("grace", 0.118),
        ("tremolo", 0.145),
    )
    master_gain: float = 0.76


TIMBRE_CONFIG = GuzhengTimbre()


@dataclass
class RenderedVoice:
    """One rendered note tracked independently by the offline voice pool."""

    midi: int
    start_frame: int
    audio: np.ndarray
    pan: float
    event_index: int
    layer: str
    stereo_pan_shift: float = 0.0
    active_end_frame: int = field(init=False)
    released: bool = False

    def __post_init__(self) -> None:
        self.active_end_frame = self.start_frame + len(self.audio)


class VoicePool:
    """Bounded polyphonic allocator with click-safe retriggering and stealing."""

    def __init__(self, sample_rate: int, max_voices: int = TIMBRE_CONFIG.max_voices) -> None:
        self.sample_rate = sample_rate
        self.max_voices = max(1, int(max_voices))
        self.retrigger_fade_frames = max(
            1, int(round(TIMBRE_CONFIG.retrigger_fade_seconds * sample_rate))
        )
        self.steal_fade_frames = max(
            1, int(round(TIMBRE_CONFIG.steal_fade_seconds * sample_rate))
        )
        self.voices: list[RenderedVoice] = []
        self.retrigger_count = 0
        self.steal_count = 0
        self.peak_active_voices = 0

    def _active_at(self, frame: int) -> list[RenderedVoice]:
        return [
            voice
            for voice in self.voices
            if not voice.released and voice.active_end_frame > frame
        ]

    def _level_at(self, voice: RenderedVoice, frame: int) -> float:
        offset = max(0, frame - voice.start_frame)
        end = min(
            len(voice.audio),
            offset + max(64, int(round(self.sample_rate * 0.025))),
            max(0, voice.active_end_frame - voice.start_frame),
        )
        if end <= offset:
            return 0.0
        window = voice.audio[offset:end]
        return float(np.sqrt(np.mean(window * window)))

    @staticmethod
    def _fade_out(voice: RenderedVoice, frame: int, fade_frames: int) -> None:
        offset = max(0, frame - voice.start_frame)
        if offset >= len(voice.audio):
            voice.active_end_frame = min(voice.active_end_frame, frame)
            voice.released = True
            return
        end = min(len(voice.audio), offset + max(1, fade_frames))
        # Equal-power release avoids the small amplitude dip that made dense
        # repeated notes sound like separate, clipped blocks.
        fade = np.cos(np.linspace(0.0, math.pi / 2.0, end - offset, dtype=np.float64))
        if voice.audio.ndim == 1:
            voice.audio[offset:end] *= fade
        else:
            voice.audio[offset:end] *= fade[:, None]
        if end < len(voice.audio):
            voice.audio[end:] = 0.0
        voice.active_end_frame = min(voice.active_end_frame, voice.start_frame + end)
        voice.released = True

    def _steal_key(self, voice: RenderedVoice, frame: int) -> tuple:
        age_seconds = max(0.0, (frame - voice.start_frame) / self.sample_rate)
        layer_priority = {
            "harmony": 0,
            "lower_melody": 1,
            "drone": 1,
            "arpeggio": 2,
            "grace": 3,
            "tremolo": 4,
            "motif": 5,
            "melody": 5,
            "upper_melody": 6,
        }
        # Keep a newly started melody/arpeggio alive; old quiet support voices
        # are the first victims when a real strum exceeds the pool size.
        recently_started = age_seconds < TIMBRE_CONFIG.recent_voice_protection_seconds
        return (
            recently_started,
            layer_priority.get(voice.layer, 3),
            self._level_at(voice, frame),
            voice.start_frame,
        )

    def add(self, voice: RenderedVoice) -> None:
        """Allocate a voice, fading an old same-pitch voice or quietest victim."""
        active = self._active_at(voice.start_frame)
        self.peak_active_voices = max(self.peak_active_voices, len(active))

        same_pitch = [candidate for candidate in active if candidate.midi == voice.midi]
        for candidate in same_pitch:
            self._fade_out(candidate, voice.start_frame, self.retrigger_fade_frames)
            self.retrigger_count += 1

        active = self._active_at(voice.start_frame)
        if len(active) >= self.max_voices:
            victim = min(active, key=lambda candidate: self._steal_key(candidate, voice.start_frame))
            self._fade_out(victim, voice.start_frame, self.steal_fade_frames)
            self.steal_count += 1

        self.voices.append(voice)
        self.peak_active_voices = max(
            self.peak_active_voices, len(self._active_at(voice.start_frame))
        )

    def summary(self) -> dict:
        return {
            "max_voices": self.max_voices,
            "peak_active_voices": self.peak_active_voices,
            "same_pitch_retriggers": self.retrigger_count,
            "voice_steals": self.steal_count,
            "rendered_voices": len(self.voices),
        }


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
        if ornament == "arpeggio":
            pattern = [int(interval) for interval in base.pop("pattern", (0, 4, 7, 12, 16, 12, 7, 4))]
            step = max(0.03, float(base.pop("step", 0.16)))
            note_duration = max(0.08, float(base.pop("note_dur", base["dur"])))
            start = float(event["start"])
            for index, interval in enumerate(pattern):
                arpeggio = dict(base)
                arpeggio["start"] = start + index * step
                arpeggio["dur"] = note_duration
                arpeggio["midi"] = int(event["midi"]) + interval
                accent = 1.08 if index == 0 else (0.96 if index == len(pattern) - 1 else 0.84)
                arpeggio["velocity"] = max(1, min(127, int(round(int(event["velocity"]) * accent))))
                arpeggio["layer"] = "arpeggio"
                arpeggio["arpeggio_index"] = index
                result.append(arpeggio)
            continue
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


def load_reference_sample(path: Path, sample_rate: int) -> np.ndarray | None:
    """Load the first pluck from the CC0 reference recording as stereo float audio."""
    if not path.exists():
        return None
    with wave.open(str(path), "rb") as handle:
        source_rate = handle.getframerate()
        channels = handle.getnchannels()
        frames = handle.getnframes()
        if source_rate != sample_rate:
            raise ValueError(
                f"reference sample must be {sample_rate} Hz, got {source_rate} Hz"
            )
        if channels not in (1, 2):
            raise ValueError(f"reference sample must be mono or stereo, got {channels} channels")
        raw = np.frombuffer(handle.readframes(frames), dtype="<i2")
    if channels == 1:
        source = np.column_stack((raw, raw)).astype(np.float64) / 32768.0
    else:
        source = raw.reshape(-1, channels).astype(np.float64) / 32768.0
    source = source[: int(REFERENCE_SAMPLE_SECONDS * sample_rate)].copy()
    if len(source) < int(0.25 * sample_rate):
        raise ValueError("reference sample is too short")
    source -= np.mean(source[: min(len(source), sample_rate // 20)], axis=0, keepdims=True)
    fade = min(len(source), int(0.12 * sample_rate))
    source[-fade:] *= np.linspace(1.0, 0.0, fade)[:, None]
    return source


def layer_gain(layer: str, sampled: bool) -> float:
    gains = TIMBRE_CONFIG.sample_layer_gains if sampled else TIMBRE_CONFIG.additive_layer_gains
    return dict(gains).get(layer, 0.16 if not sampled else 0.19)


def render_attack_detail(
    midi: int,
    velocity: int,
    layer: str,
    rng: np.random.Generator,
    sample_rate: int,
) -> np.ndarray:
    """Add a restrained synthetic nail transient above the sampled string body."""
    count = max(16, int(0.16 * sample_rate))
    t = np.arange(count, dtype=np.float64) / sample_rate
    frequency = midi_to_hz(midi)
    noise = rng.normal(0.0, 1.0, count) * np.exp(-t / 0.0055)
    detail = 0.022 * noise
    for partial, gain in ((3, 0.075), (5, 0.042), (7, 0.020)):
        partial_frequency = min(sample_rate * 0.42, frequency * partial)
        detail += gain * np.sin(2.0 * math.pi * partial_frequency * t + rng.uniform(0, 2 * math.pi))
    detail *= np.exp(-t / 0.032)
    detail_layer_gain = {
        "melody": 0.040,
        "motif": 0.034,
        "upper_melody": 0.036,
        "lower_melody": 0.018,
        "drone": 0.012,
        "harmony": 0.026,
        "arpeggio": 0.036,
        "grace": 0.028,
        "tremolo": 0.032,
    }.get(layer, 0.032)
    return detail * (max(1, min(127, velocity)) / 127.0) * detail_layer_gain


def one_pole_lowpass(stereo: np.ndarray, sample_rate: int, cutoff_hz: float) -> np.ndarray:
    """Apply a small deterministic body filter without adding an audio dependency."""
    cutoff_hz = max(20.0, min(float(cutoff_hz), sample_rate * 0.45))
    coefficient = 1.0 - math.exp(-2.0 * math.pi * cutoff_hz / sample_rate)
    filtered = np.empty_like(stereo)
    filtered[0] = stereo[0]
    for index in range(1, len(stereo)):
        filtered[index] = filtered[index - 1] + coefficient * (stereo[index] - filtered[index - 1])
    return filtered


def shape_sample_voice(voice: np.ndarray, sample_rate: int) -> np.ndarray:
    """Keep the nail edge but let the sustained spectrum settle into the soundboard."""
    if len(voice) == 0:
        return voice
    body = one_pole_lowpass(voice, sample_rate, TIMBRE_CONFIG.sample_body_cutoff_hz)
    brightness = np.exp(
        -np.arange(len(voice), dtype=np.float64)
        / (sample_rate * TIMBRE_CONFIG.sample_brightness_decay_seconds)
    )
    shaped = body + (voice - body) * brightness[:, None]
    attack_phase = np.minimum(
        1.0,
        np.arange(len(voice), dtype=np.float64) / (sample_rate * TIMBRE_CONFIG.attack_seconds),
    )
    onset = np.sin(attack_phase * math.pi / 2.0)
    return shaped * onset[:, None]


def render_sample_sustain_tail(
    midi: int,
    count: int,
    target_rms: float,
    rng: np.random.Generator,
    sample_rate: int,
) -> np.ndarray:
    """Extend high transposed notes with a quiet, phase-coherent body tail."""
    if count <= 0:
        return np.empty((0, 2), dtype=np.float64)
    t = np.arange(count, dtype=np.float64) / sample_rate
    frequency = midi_to_hz(midi)
    phase = float(rng.uniform(0.0, 2.0 * math.pi))
    left = np.zeros(count, dtype=np.float64)
    right = np.zeros(count, dtype=np.float64)
    for partial, partial_gain in enumerate((1.0, 0.32, 0.12, 0.045), start=1):
        partial_frequency = frequency * partial * (1.0 + TIMBRE_CONFIG.inharmonicity * (partial - 1) ** 2)
        partial_decay = TIMBRE_CONFIG.sample_sustain_decay_seconds / (1.0 + 0.22 * (partial - 1))
        left += partial_gain * np.sin(2.0 * math.pi * partial_frequency * t + phase * partial) * np.exp(-t / partial_decay)
        right += partial_gain * np.sin(2.0 * math.pi * partial_frequency * t + phase * partial + 0.008 * partial) * np.exp(-t / partial_decay)
    onset = np.sin(np.minimum(1.0, t / TIMBRE_CONFIG.sample_sustain_crossfade_seconds) * math.pi / 2.0)
    tail = np.column_stack((left * onset, right * onset))
    current_rms = float(np.sqrt(np.mean(tail * tail)))
    if current_rms > 0.0:
        tail *= max(0.0001, target_rms) / current_rms
    return tail


def render_note_from_sample(
    midi: int,
    seconds: float,
    velocity: int,
    layer: str,
    rng: np.random.Generator,
    sample_rate: int,
    reference: np.ndarray,
) -> np.ndarray:
    """Transpose the recorded A3 pluck and keep its real attack/body spectrum."""
    seconds = max(0.08, seconds)
    # Small deterministic detuning avoids machine-perfect chorus when notes overlap.
    ratio = 2.0 ** ((midi - REFERENCE_SAMPLE_MIDI) / 12.0)
    ratio *= 1.0 + float(rng.uniform(-0.0015, 0.0015))
    desired_count = max(16, int(math.ceil(seconds * sample_rate)))
    source_count = min(
        desired_count,
        max(16, int((len(reference) - 1) / ratio)),
    )
    source_positions = np.arange(source_count, dtype=np.float64) * ratio
    source_axis = np.arange(len(reference), dtype=np.float64)
    voice = np.column_stack(
        (
            np.interp(source_positions, source_axis, reference[:, 0]),
            np.interp(source_positions, source_axis, reference[:, 1]),
        )
    )
    voice = shape_sample_voice(voice, sample_rate)
    voice *= (max(1, min(127, velocity)) / 127.0) * layer_gain(layer, sampled=True)
    if source_count < desired_count:
        fade_guard = int(0.14 * sample_rate)
        sustain_start = max(0, len(voice) - int(0.45 * sample_rate))
        sustain_end = max(sustain_start + 1, len(voice) - fade_guard)
        sustain_window = voice[sustain_start:sustain_end]
        target_rms = float(np.sqrt(np.mean(sustain_window * sustain_window))) * 0.82
        tail = render_sample_sustain_tail(
            midi,
            desired_count - source_count,
            target_rms,
            rng,
            sample_rate,
        )
        voice = np.vstack((voice, tail))
    detail = render_attack_detail(midi, velocity, layer, rng, sample_rate)
    detail_count = min(len(voice), len(detail))
    voice[:detail_count] += detail[:detail_count, None]
    return voice


def render_note(
    midi: int,
    seconds: float,
    velocity: int,
    layer: str,
    rng: np.random.Generator,
    sample_rate: int,
) -> np.ndarray:
    """Create one guzheng-like plucked-string voice with a soft nail onset."""
    seconds = max(0.08, seconds)
    count = max(16, int(math.ceil(seconds * sample_rate)))
    t = np.arange(count, dtype=np.float64) / sample_rate
    frequency = midi_to_hz(midi)

    # Low strings ring longer; upper strings lose their high partials sooner.
    decay = TIMBRE_CONFIG.base_decay_seconds + max(0.0, 72.0 - midi) * TIMBRE_CONFIG.low_register_decay_scale
    if layer == "drone":
        decay *= 1.28
    if layer == "grace":
        decay *= 0.72
    if layer == "tremolo":
        decay *= 0.80

    # A tiny, deterministic drift keeps the additive partials from sounding sterile.
    phase = float(rng.uniform(0.0, 2.0 * math.pi))
    drift_rate = float(rng.uniform(4.3, 5.8))
    drift_depth = float(rng.uniform(0.0012, 0.0032))
    phase_mod = drift_depth * np.sin(2.0 * math.pi * drift_rate * t + phase)

    body = np.zeros_like(t)
    nyquist_limit = sample_rate * 0.47
    for partial, partial_gain in enumerate(TIMBRE_CONFIG.partial_amplitudes, start=1):
        # A very small inharmonic offset gives the string a metal/wood bridge
        # character without the hard, buzzy upper spectrum of a pipa model.
        partial_frequency = frequency * partial * (1.0 + TIMBRE_CONFIG.inharmonicity * (partial - 1) ** 2)
        if partial_frequency >= nyquist_limit:
            break
        partial_decay = decay / (1.0 + TIMBRE_CONFIG.partial_decay_step * (partial - 1))
        partial_phase = float(rng.uniform(0.0, 2.0 * math.pi))
        body += partial_gain * np.sin(
            2.0 * math.pi * partial_frequency * t + partial_phase + phase_mod * partial
        ) * np.exp(-t / partial_decay)

    # A restrained nail/string contact burst: clear articulation without a pipa-like click.
    pluck_noise = rng.normal(0.0, 1.0, count)
    pluck_noise *= np.exp(-t / TIMBRE_CONFIG.pluck_noise_decay_seconds)
    pluck_noise *= TIMBRE_CONFIG.pluck_noise_gain * (0.72 if layer == "drone" else 1.0)

    # A quiet octave-lower soundboard resonance gives the body a wooden bloom.
    resonance = TIMBRE_CONFIG.soundboard_resonance_gain * np.sin(
        2.0 * math.pi * frequency * 0.5 * t + phase
    )
    resonance *= np.exp(-t / (decay * TIMBRE_CONFIG.soundboard_decay_multiplier))

    attack_phase = np.minimum(1.0, t / TIMBRE_CONFIG.attack_seconds)
    attack = np.sin(attack_phase * math.pi / 2.0)
    envelope = attack * np.exp(-t / decay)
    voice = (body + pluck_noise + resonance) * envelope

    # Conservative per-voice level leaves headroom for the new chord voices.
    return voice * (max(1, min(127, velocity)) / 127.0) * layer_gain(layer, sampled=False)


def apply_release_fade(audio: np.ndarray, sample_rate: int) -> np.ndarray:
    """Fade every bounded voice to zero so a capped tail never clicks."""
    fade_frames = min(
        len(audio),
        max(1, int(round(TIMBRE_CONFIG.release_fade_seconds * sample_rate))),
    )
    if fade_frames <= 1:
        return audio
    fade = np.cos(np.linspace(0.0, math.pi / 2.0, fade_frames, dtype=np.float64))
    if audio.ndim == 1:
        audio[-fade_frames:] *= fade
    else:
        audio[-fade_frames:] *= fade[:, None]
    return audio


def add_reverb(stereo: np.ndarray, sample_rate: int, wet_scale: float = 1.0) -> np.ndarray:
    """Add a small deterministic room made from cross-fed delay taps."""
    wet = stereo.copy()
    taps = ((0.17, 0.135), (0.31, 0.095), (0.53, 0.068), (0.79, 0.045), (1.07, 0.028))
    wet_scale = max(0.0, float(wet_scale))
    for delay_seconds, gain in taps:
        delay = int(delay_seconds * sample_rate)
        if delay >= len(stereo):
            continue
        wet[delay:, 0] += stereo[:-delay, 1] * gain * wet_scale
        wet[delay:, 1] += stereo[:-delay, 0] * gain * wet_scale
    return wet


def mix_rendered_voice(stereo: np.ndarray, rendered: RenderedVoice) -> None:
    """Mix one pooled voice, honoring any fade applied by the allocator."""
    start_frame = max(0, rendered.start_frame)
    audio_offset = max(0, -rendered.start_frame)
    end_frame = min(stereo.shape[0], rendered.active_end_frame)
    audio_end = min(len(rendered.audio), end_frame - rendered.start_frame)
    if end_frame <= start_frame or audio_end <= audio_offset:
        return
    voice = rendered.audio[audio_offset:audio_end]
    frame_end = start_frame + len(voice)
    if voice.ndim == 1:
        left_gain = math.cos(rendered.pan * math.pi / 2.0)
        right_gain = math.sin(rendered.pan * math.pi / 2.0)
        stereo[start_frame:frame_end, 0] += voice * left_gain
        stereo[start_frame:frame_end, 1] += voice * right_gain
    else:
        # Keep the real recording's stereo room while adding only a subtle pan.
        stereo[start_frame:frame_end, 0] += (
            voice[:, 0] * (1.0 - rendered.stereo_pan_shift) + voice[:, 1] * 0.035
        )
        stereo[start_frame:frame_end, 1] += (
            voice[:, 1] * (1.0 + rendered.stereo_pan_shift) + voice[:, 0] * 0.035
        )


def render_wav(
    composition: dict,
    output_path: Path,
    sample_path: Path | None = DEFAULT_SAMPLE,
    engine: str = "hybrid",
) -> dict:
    sample_rate = int(composition["sample_rate"])
    tempo = float(composition["tempo_bpm"])
    beat_seconds = 60.0 / tempo
    tail_seconds = 4.5
    total_seconds = float(composition["bars"]) * 4.0 * beat_seconds + tail_seconds
    frame_count = int(math.ceil(total_seconds * sample_rate))
    stereo = np.zeros((frame_count, 2), dtype=np.float64)
    rng = np.random.default_rng(int(composition["seed"]))
    reference = None
    if engine == "hybrid" and sample_path is not None:
        reference = load_reference_sample(sample_path, sample_rate)
        if reference is None:
            print(f"warning: reference sample not found, using additive fallback: {sample_path}")
    events = expanded_events(composition["events"])
    pool = VoicePool(sample_rate)

    for event_index, event in enumerate(events):
        start_seconds = float(event["start"]) * beat_seconds
        if start_seconds >= total_seconds:
            continue
        start_frame = max(0, int(round(start_seconds * sample_rate)))
        note_seconds = float(event["dur"]) * beat_seconds
        # Guzheng tails are allowed to ring beyond note-off, with a bounded render.
        # ``ring_scale`` is deliberately optional so old compositions retain the
        # original tail length.  New arrangements can shorten dense support voices
        # without changing the timbre's global ring controls.
        try:
            ring_scale = float(event.get("ring_scale", 1.0))
        except (TypeError, ValueError):
            ring_scale = 1.0
        if not math.isfinite(ring_scale):
            ring_scale = 1.0
        ring_scale = min(1.5, max(0.05, ring_scale))
        ring_seconds = min(
            TIMBRE_CONFIG.max_ring_seconds,
            TIMBRE_CONFIG.ring_base_seconds
            + max(0.0, 72.0 - int(event["midi"])) * TIMBRE_CONFIG.ring_register_scale,
        ) * ring_scale
        midi = int(event["midi"])
        velocity = int(event["velocity"])
        layer = str(event.get("layer", "melody"))
        if reference is not None:
            voice = render_note_from_sample(
                midi,
                note_seconds + ring_seconds,
                velocity,
                layer,
                rng,
                sample_rate,
                reference,
            )
        else:
            voice = render_note(
                midi,
                note_seconds + ring_seconds,
                velocity,
                layer,
                rng,
                sample_rate,
            )
        voice = apply_release_fade(voice, sample_rate)
        end_frame = min(frame_count, start_frame + len(voice))
        if end_frame <= start_frame:
            continue
        voice = voice[: end_frame - start_frame]

        # Higher strings lean right, harmony stays nearer the center, and bass
        # drones remain stable so a chord reads as one guzheng soundboard.
        pan = 0.50 + 0.14 * math.sin(midi * 0.37 + event_index * 0.91)
        if layer == "drone":
            pan = 0.46 + 0.07 * math.sin(event_index)
        if layer == "harmony":
            pan = 0.50 + 0.10 * math.sin(midi * 0.37 + event_index * 0.71)
        if layer == "arpeggio":
            pan = 0.50 + 0.18 * math.sin(midi * 0.37 + event_index * 0.67)
        stereo_pan_shift = 0.10 * math.sin(midi * 0.37 + event_index * 0.91) if voice.ndim == 2 else 0.0
        pool.add(
            RenderedVoice(
                midi=midi,
                start_frame=start_frame,
                audio=voice,
                pan=pan,
                event_index=event_index,
                layer=layer,
                stereo_pan_shift=stereo_pan_shift,
            )
        )

    for rendered in pool.voices:
        mix_rendered_voice(stereo, rendered)

    # The sampled recording already contains a small room; use less synthetic reflection.
    stereo *= TIMBRE_CONFIG.master_gain
    stereo = add_reverb(stereo, sample_rate, wet_scale=0.58 if reference is not None else 1.0)
    fade_in = min(frame_count, int(0.025 * sample_rate))
    fade_out = min(frame_count, int(2.8 * sample_rate))
    if fade_in:
        stereo[:fade_in] *= np.linspace(0.0, 1.0, fade_in)[:, None]
    if fade_out:
        stereo[-fade_out:] *= np.linspace(1.0, 0.0, fade_out)[:, None]

    peak_before_safety = float(np.max(np.abs(stereo)))
    normalization_gain = 0.0
    if peak_before_safety > 0.0:
        # Make-up gain keeps the rendered deliverable listenable; the 0.86
        # ceiling leaves 1 dB of PCM headroom after all voices and reverb.
        normalization_gain = 0.86 / peak_before_safety
        stereo *= normalization_gain
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
        "peak_before_safety": peak_before_safety,
        "normalization_gain": normalization_gain,
        "rms_normalized": rms,
        "expanded_note_count": len(events),
        "source_event_count": len(composition["events"]),
        "tail_seconds": tail_seconds,
        "engine": "hybrid-cc0-sample" if reference is not None else "additive-fallback",
        "reference_sample": display_path(sample_path) if reference is not None and sample_path is not None else None,
        "reference_sample_base_midi": REFERENCE_SAMPLE_MIDI if reference is not None else None,
        "voice_pool": pool.summary(),
        "master_gain": TIMBRE_CONFIG.master_gain,
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


def display_path(path: Path) -> str:
    try:
        return path.resolve().relative_to(ROOT.resolve()).as_posix()
    except ValueError:
        return str(path)


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
    parser.add_argument("--sample", type=Path, default=DEFAULT_SAMPLE)
    parser.add_argument(
        "--engine",
        choices=("hybrid", "additive"),
        default="hybrid",
        help="hybrid uses the bundled CC0 guzheng reference; additive is the fallback model",
    )
    args = parser.parse_args()

    composition = read_composition(args.composition)
    sample_path = args.sample if args.engine == "hybrid" else None
    wav_info = render_wav(composition, args.wav, sample_path=sample_path, engine=args.engine)
    midi_info = make_midi(composition, args.midi)
    metadata = {
        "title": composition["title"],
        "title_en": composition.get("title_en"),
        "renderer": "src/create_guzheng.py",
        "renderer_version": "1.4.0",
        "engine": args.engine,
        "polyphony": "voice-pool",
        "timbre": asdict(TIMBRE_CONFIG),
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
    if args.engine == "hybrid" and args.sample.exists():
        metadata["reference_sample_sha256"] = sha256(args.sample)
        metadata["reference_sample_license"] = "CC0 1.0"
    args.metadata.parent.mkdir(parents=True, exist_ok=True)
    args.metadata.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metadata, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
