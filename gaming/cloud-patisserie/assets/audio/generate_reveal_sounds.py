#!/usr/bin/env python3
"""Deterministically synthesize the four Cloud Dessert Shop reveal sounds.

Only Python's standard library is used.  Every source in the finished WAVs is
an oscillator or seeded noise generated below; no sample files are read.
"""

from __future__ import annotations

import math
import random
import struct
import wave
from pathlib import Path


SAMPLE_RATE = 44_100
OUTPUT_DIR = Path(__file__).resolve().parent
TAU = math.tau


def seconds_to_index(seconds: float) -> int:
    return round(seconds * SAMPLE_RATE)


def new_buffer(duration: float) -> list[float]:
    return [0.0] * seconds_to_index(duration)


def attack_envelope(time: float, attack: float) -> float:
    if attack <= 0.0 or time >= attack:
        return 1.0
    return math.sin((time / attack) * math.pi / 2.0) ** 2


def add_pitch_sweep(
    buffer: list[float],
    start: float,
    duration: float,
    frequency_start: float,
    frequency_end: float,
    amplitude: float,
    attack: float,
    decay: float,
    harmonics: tuple[tuple[float, float], ...] = ((1.0, 1.0),),
) -> None:
    """Add a phase-continuous exponential pitch sweep."""

    first = seconds_to_index(start)
    count = min(seconds_to_index(duration), len(buffer) - first)
    phase = 0.0
    ratio = frequency_end / frequency_start
    for index in range(max(0, count)):
        time = index / SAMPLE_RATE
        position = time / duration
        frequency = frequency_start * (ratio ** position)
        phase += TAU * frequency / SAMPLE_RATE
        envelope = attack_envelope(time, attack) * math.exp(-time / decay)
        sample = sum(weight * math.sin(phase * multiplier) for multiplier, weight in harmonics)
        buffer[first + index] += amplitude * envelope * sample


def add_marimba(
    buffer: list[float], start: float, frequency: float, amplitude: float, decay: float = 0.16
) -> None:
    first = seconds_to_index(start)
    count = min(seconds_to_index(decay * 5.2), len(buffer) - first)
    rng = random.Random(round(start * 10_000) + round(frequency))
    for index in range(max(0, count)):
        time = index / SAMPLE_RATE
        phase = TAU * frequency * time
        body = (
            math.sin(phase)
            + 0.34 * math.sin(phase * 3.98 + 0.2)
            + 0.12 * math.sin(phase * 9.05 + 0.8)
        )
        click = (rng.random() * 2.0 - 1.0) * math.exp(-time / 0.007)
        envelope = attack_envelope(time, 0.002) * math.exp(-time / decay)
        buffer[first + index] += amplitude * envelope * (0.88 * body + 0.12 * click)


def add_glass_bell(
    buffer: list[float],
    start: float,
    frequency: float,
    amplitude: float,
    decay: float,
    brightness: float = 1.0,
) -> None:
    """Add an inharmonic, lightly FM-modulated glass-bell tone."""

    first = seconds_to_index(start)
    count = min(seconds_to_index(decay * 6.0), len(buffer) - first)
    partials = (
        (1.000, 1.00, 1.00),
        (2.013, 0.42 * brightness, 0.72),
        (2.996, 0.25 * brightness, 0.50),
        (4.117, 0.14 * brightness, 0.34),
    )
    for index in range(max(0, count)):
        time = index / SAMPLE_RATE
        base_phase = TAU * frequency * time
        strike = attack_envelope(time, 0.003)
        modulation = 0.22 * brightness * math.exp(-time / 0.09) * math.sin(base_phase * 1.417)
        sample = 0.0
        for multiplier, weight, relative_decay in partials:
            partial_envelope = math.exp(-time / (decay * relative_decay))
            sample += weight * partial_envelope * math.sin(base_phase * multiplier + modulation)
        buffer[first + index] += amplitude * strike * sample


def add_filtered_noise(
    buffer: list[float],
    start: float,
    duration: float,
    amplitude: float,
    lowpass_hz: float,
    highpass_hz: float,
    attack: float,
    decay: float,
    seed: int,
) -> None:
    """Add deterministic band-limited noise with an exponential envelope."""

    first = seconds_to_index(start)
    count = min(seconds_to_index(duration), len(buffer) - first)
    low_alpha = 1.0 - math.exp(-TAU * lowpass_hz / SAMPLE_RATE)
    high_alpha = 1.0 - math.exp(-TAU * highpass_hz / SAMPLE_RATE)
    low_state = 0.0
    high_state = 0.0
    rng = random.Random(seed)
    for index in range(max(0, count)):
        time = index / SAMPLE_RATE
        white = rng.random() * 2.0 - 1.0
        low_state += low_alpha * (white - low_state)
        high_state += high_alpha * (white - high_state)
        band = low_state - high_state
        envelope = attack_envelope(time, attack) * math.exp(-time / decay)
        buffer[first + index] += amplitude * envelope * band


def add_twinkle_cluster(
    buffer: list[float],
    starts: tuple[float, ...],
    frequencies: tuple[float, ...],
    amplitude: float,
) -> None:
    for index, (start, frequency) in enumerate(zip(starts, frequencies)):
        add_glass_bell(
            buffer,
            start,
            frequency,
            amplitude * (1.0 - index * 0.08),
            decay=0.12 + index * 0.015,
            brightness=1.25,
        )


def add_multitap_reverb(
    buffer: list[float], taps: tuple[tuple[float, float], ...], wet: float
) -> None:
    dry = buffer.copy()
    for delay_seconds, gain in taps:
        delay = seconds_to_index(delay_seconds)
        for index in range(delay, len(buffer)):
            buffer[index] += wet * gain * dry[index - delay]


def finish_and_write(name: str, buffer: list[float], target_peak_db: float) -> dict[str, float | int | str]:
    mean = sum(buffer) / len(buffer)
    for index, sample in enumerate(buffer):
        buffer[index] = sample - mean

    fade_samples = min(seconds_to_index(0.035), len(buffer))
    for offset in range(fade_samples):
        gain = (fade_samples - offset - 1) / fade_samples
        buffer[len(buffer) - fade_samples + offset] *= gain

    raw_peak = max(abs(sample) for sample in buffer)
    target_peak = 10.0 ** (target_peak_db / 20.0)
    normalization = target_peak / raw_peak
    normalized = [sample * normalization for sample in buffer]
    peak = max(abs(sample) for sample in normalized)
    rms = math.sqrt(sum(sample * sample for sample in normalized) / len(normalized))

    # Deterministic triangular PDF dither avoids quantization-pattern tails.
    rng = random.Random(f"cloud-dessert-{name}")
    pcm = bytearray()
    for sample in normalized:
        dither = (rng.random() - rng.random()) / 65_536.0
        integer = round(max(-1.0, min(1.0, sample + dither)) * 32_767.0)
        pcm.extend(struct.pack("<h", integer))

    path = OUTPUT_DIR / name
    with wave.open(str(path), "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(SAMPLE_RATE)
        wav_file.writeframes(pcm)

    return {
        "file": name,
        "samples": len(normalized),
        "duration": len(normalized) / SAMPLE_RATE,
        "peak_dbfs": 20.0 * math.log10(peak),
        "rms_dbfs": 20.0 * math.log10(rms),
    }


def synthesize_common() -> list[float]:
    buffer = new_buffer(0.72)
    # A soft wrapper pop, followed by a friendly C6-E6-G6 candy-marimba tag.
    add_pitch_sweep(
        buffer,
        0.018,
        0.18,
        210.0,
        82.0,
        0.34,
        attack=0.004,
        decay=0.055,
        harmonics=((1.0, 1.0), (2.0, 0.18)),
    )
    add_filtered_noise(buffer, 0.018, 0.10, 0.26, 5_500.0, 650.0, 0.001, 0.023, 101)
    for start, frequency, level in (
        (0.105, 1_046.502, 0.27),
        (0.205, 1_318.510, 0.24),
        (0.310, 1_567.982, 0.22),
    ):
        add_marimba(buffer, start, frequency, level)
    add_multitap_reverb(buffer, ((0.052, 0.38), (0.091, 0.23)), wet=0.34)
    return buffer


def synthesize_rare() -> list[float]:
    buffer = new_buffer(1.02)
    # A tiny crystal strike introduces an E5-G#5-B5-E6 glass arpeggio.
    add_filtered_noise(buffer, 0.018, 0.065, 0.13, 9_000.0, 2_500.0, 0.001, 0.016, 202)
    add_glass_bell(buffer, 0.025, 1_977.533, 0.16, decay=0.12, brightness=1.25)
    for start, frequency, level in (
        (0.095, 659.255, 0.22),
        (0.220, 830.609, 0.22),
        (0.345, 987.767, 0.21),
        (0.470, 1_318.510, 0.24),
    ):
        add_glass_bell(buffer, start, frequency, level, decay=0.17, brightness=1.05)
    add_multitap_reverb(
        buffer,
        ((0.047, 0.31), (0.083, 0.23), (0.139, 0.17), (0.211, 0.11)),
        wet=0.54,
    )
    return buffer


def synthesize_epic() -> list[float]:
    buffer = new_buffer(1.42)
    # Low gate opening, then a broad D-minor shimmer and scattered star dust.
    add_pitch_sweep(
        buffer,
        0.015,
        0.55,
        62.0,
        124.0,
        0.35,
        attack=0.045,
        decay=0.26,
        harmonics=((1.0, 1.0), (2.0, 0.24), (3.0, 0.10)),
    )
    add_filtered_noise(buffer, 0.030, 0.48, 0.24, 1_800.0, 90.0, 0.05, 0.24, 303)
    for start, frequency, level in (
        (0.245, 587.330, 0.16),
        (0.355, 880.000, 0.17),
        (0.465, 1_174.659, 0.18),
        (0.575, 1_396.913, 0.18),
        (0.685, 1_760.000, 0.20),
    ):
        add_glass_bell(buffer, start, frequency, level, decay=0.19, brightness=1.20)
    add_twinkle_cluster(
        buffer,
        starts=(0.520, 0.650, 0.780, 0.895, 1.010),
        frequencies=(2_349.318, 3_520.000, 2_793.826, 4_186.009, 3_135.963),
        amplitude=0.075,
    )
    add_filtered_noise(buffer, 0.580, 0.56, 0.09, 10_500.0, 4_800.0, 0.012, 0.21, 304)
    add_multitap_reverb(
        buffer,
        ((0.061, 0.30), (0.109, 0.24), (0.173, 0.18), (0.269, 0.13)),
        wet=0.56,
    )
    return buffer


def synthesize_hidden() -> list[float]:
    buffer = new_buffer(1.84)
    # A deep cloud door opens beneath a five-note C-minor-9 theme and magic chimes.
    add_pitch_sweep(
        buffer,
        0.012,
        0.78,
        46.0,
        104.0,
        0.38,
        attack=0.075,
        decay=0.36,
        harmonics=((1.0, 1.0), (2.0, 0.32), (3.0, 0.12)),
    )
    add_pitch_sweep(
        buffer,
        0.085,
        0.62,
        340.0,
        118.0,
        0.14,
        attack=0.025,
        decay=0.31,
        harmonics=((1.0, 1.0), (1.503, 0.16)),
    )
    add_filtered_noise(buffer, 0.025, 0.70, 0.30, 1_350.0, 52.0, 0.09, 0.34, 404)
    for start, frequency, level in (
        (0.330, 523.251, 0.15),
        (0.475, 622.254, 0.16),
        (0.620, 783.991, 0.17),
        (0.765, 932.328, 0.18),
        (0.910, 1_174.659, 0.21),
    ):
        add_glass_bell(buffer, start, frequency, level, decay=0.26, brightness=1.12)
    # A high, slowly descending pair of chimes makes the hidden reveal unmistakable.
    add_glass_bell(buffer, 1.030, 2_349.318, 0.11, decay=0.23, brightness=1.30)
    add_glass_bell(buffer, 1.185, 1_864.655, 0.10, decay=0.25, brightness=1.22)
    add_filtered_noise(buffer, 0.920, 0.62, 0.065, 11_500.0, 5_200.0, 0.020, 0.26, 405)
    add_multitap_reverb(
        buffer,
        ((0.071, 0.32), (0.127, 0.26), (0.211, 0.20), (0.337, 0.15), (0.491, 0.10)),
        wet=0.62,
    )
    return buffer


def main() -> None:
    outputs = (
        ("reveal-common.wav", synthesize_common(), -2.2),
        ("reveal-rare.wav", synthesize_rare(), -1.8),
        ("reveal-epic.wav", synthesize_epic(), -1.4),
        ("reveal-hidden.wav", synthesize_hidden(), -1.0),
    )
    for name, buffer, peak in outputs:
        result = finish_and_write(name, buffer, peak)
        print(
            f"{result['file']}: {result['duration']:.3f}s, "
            f"{result['samples']} samples, peak {result['peak_dbfs']:.2f} dBFS, "
            f"RMS {result['rms_dbfs']:.2f} dBFS"
        )


if __name__ == "__main__":
    main()
