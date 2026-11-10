# Synthesises the soft sound effects for the reel (no samples, no licences).
# Usage: python sfx.py   ->   public/sfx/*.wav
import pathlib, wave
import numpy as np

SR = 44100
OUT = pathlib.Path(__file__).parent / 'public' / 'sfx'
rng = np.random.default_rng(7)


def t(sec):
    return np.arange(int(SR * sec)) / SR


def env(n, attack, release):
    """Smooth (raised-cosine) fade in and out, in seconds."""
    e = np.ones(n)
    a, r = max(1, int(attack * SR)), max(1, int(release * SR))
    e[:a] = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, a))
    e[-r:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, r))
    return e


def lowpass(x, cutoff):
    """One-pole low-pass; cutoff may be an array (sweeps)."""
    cutoff = np.broadcast_to(cutoff, x.shape)
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.zeros_like(x)
    prev = 0.0
    for i in range(len(x)):
        prev = (1 - a[i]) * x[i] + a[i] * prev
        y[i] = prev
    return y


def save(name, x, peak=0.5):
    x = x / (np.max(np.abs(x)) or 1) * peak
    stereo = np.stack([x, x], axis=1)
    with wave.open(str(OUT / f'{name}.wav'), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((stereo * 32767).astype('<i2').tobytes())
    print(name, f'{len(x) / SR:.2f}s')


def whoosh():
    # filtered noise whose brightness swells and settles: an airy, slow "vuh"
    n = t(1.3)
    x = rng.standard_normal(len(n))
    sweep = 300 + 1500 * np.sin(np.pi * n / n[-1]) ** 2
    x = lowpass(lowpass(x, sweep), sweep)
    return x * env(len(n), 0.55, 0.65)


def shimmer():
    # many tiny high sine grains scattered over 1.6 s, like soft rustling sparkles
    n = t(1.6)
    x = np.zeros(len(n))
    for _ in range(70):
        f = rng.uniform(1800, 4200)
        start = int(rng.uniform(0, 1.35) * SR)
        g = t(0.18)
        grain = np.sin(2 * np.pi * f * g) * np.exp(-g * 28) * env(len(g), 0.01, 0.05)
        x[start:start + len(g)] += grain * rng.uniform(0.3, 1)
    x += lowpass(rng.standard_normal(len(n)), 2500) * 0.15
    return x * env(len(n), 0.35, 0.6)


def tap():
    # rounded, muffled tap: low body + gentle mid, no sharp transient
    n = t(0.35)
    x = np.sin(2 * np.pi * 170 * n) * np.exp(-n * 22) + 0.45 * np.sin(2 * np.pi * 540 * n) * np.exp(-n * 30)
    return lowpass(x * env(len(n), 0.006, 0.12), 1800)


def drop(f):
    # tiny water drop: short sine that glides slightly up
    n = t(0.22)
    freq = f * (1 + 0.35 * (1 - np.exp(-n * 40)))
    phase = 2 * np.pi * np.cumsum(freq) / SR
    return np.sin(phase) * np.exp(-n * 24) * env(len(n), 0.004, 0.1)


def chime():
    # soft bell: a few partials with long decay
    n = t(2.4)
    x = np.zeros(len(n))
    for f, a, d in [(784, 1, 2.2), (1176, 0.5, 3), (1568, 0.3, 3.6), (2352, 0.12, 5)]:
        x += a * np.sin(2 * np.pi * f * n) * np.exp(-n * d)
    for f, a, d in [(988, 0.6, 2.4), (1480, 0.25, 3.2)]:
        x[int(0.12 * SR):] += a * np.sin(2 * np.pi * f * n[: len(n) - int(0.12 * SR)]) * np.exp(-n[: len(n) - int(0.12 * SR)] * d)
    return x * env(len(n), 0.02, 0.8)


def click():
    # quiet switch click: very short filtered noise + tiny tone
    n = t(0.12)
    x = lowpass(rng.standard_normal(len(n)), 3000) * np.exp(-n * 80) + 0.6 * np.sin(2 * np.pi * 900 * n) * np.exp(-n * 60)
    return x * env(len(n), 0.002, 0.06)


def pop():
    # soft bubble for a new comment
    n = t(0.25)
    freq = 420 + 380 * (1 - np.exp(-n * 30))
    phase = 2 * np.pi * np.cumsum(freq) / SR
    return lowpass(np.sin(phase) * np.exp(-n * 18) * env(len(n), 0.008, 0.12), 2500)


OUT.mkdir(parents=True, exist_ok=True)
save('whoosh', whoosh())
save('shimmer', shimmer())
save('tap', tap())
for i, f in enumerate([880, 990, 1110, 1320, 1480, 1660]):  # pentatonic-ish so overlaps sound pleasant
    save(f'drop{i}', drop(f), peak=0.45)
save('chime', chime())
save('click', click(), peak=0.4)
save('pop', pop())
