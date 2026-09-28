"""DSP building blocks for the sound library: a glottal voice source, time-varying formant
resonators (Klatt-style cascade), pulse-burst sources, modal (struck-object) synthesis,
the bubble model for water sounds, and simple rooms. Everything is plain numpy/scipy."""
import numpy as np
from scipy.signal import butter, lfilter, fftconvolve

SR = 44100


def tt(d):
    return np.arange(max(1, int(round(d * SR)))) / SR


def smooth_noise(n, rate, rng):
    """random signal with roughly `rate` Hz bandwidth, unit std"""
    k = max(2, int(n * rate / SR) + 2)
    pts = rng.standard_normal(k)
    y = np.interp(np.linspace(0, k - 1, n), np.arange(k), pts)
    return y / (np.std(y) + 1e-9)


def lp(x, fc, o=2):
    b, a = butter(o, min(fc, SR / 2 - 200) / (SR / 2))
    return lfilter(b, a, x)


def hp(x, fc, o=2):
    b, a = butter(o, max(fc, 5) / (SR / 2), 'high')
    return lfilter(b, a, x)


def bp(x, lo, hi, o=2):
    lo, hi = max(lo, 5), min(hi, SR / 2 - 200)
    if hi <= lo * 1.05:
        lo, hi = hi / 1.5, hi
    b, a = butter(o, [lo / (SR / 2), hi / (SR / 2)], 'band')
    return lfilter(b, a, x)


def norm(y, peak=1.0):
    return y * (peak / (np.max(np.abs(y)) + 1e-12))


def env_adsr(n, a, d_, s, r, sustain_level=None):
    """piecewise-linear envelope in seconds; s = sustain time"""
    pts_t = np.cumsum([0, a, d_, s, r])
    lvl = [0, 1, sustain_level if sustain_level is not None else 1, sustain_level if sustain_level is not None else 1, 0]
    return np.interp(np.arange(n) / SR, pts_t, lvl)


def curve(n, knots):
    """knots: list of (u in 0..1, value) -> array of length n (smooth-ish linear interp)"""
    u = np.linspace(0, 1, n)
    ks = np.array(knots, dtype=float)
    return np.interp(u, ks[:, 0], ks[:, 1])


# ---------------- sources ----------------
def glottal(f0, rng, jitter=.01, shimmer=.06, oq=.6, sq=2.5, breath=.05, subharm=0.0):
    """LF-like glottal flow derivative for a pitch contour f0 (array, Hz).
    jitter/shimmer: relative std of period/amplitude; oq: open quotient; sq: speed quotient;
    breath: aspiration noise level; subharm: period-doubling amount (rough voices)."""
    n = len(f0)
    fj = f0 * (1 + jitter * smooth_noise(n, 80, rng))
    ph = np.cumsum(fj / SR)
    cyc = np.floor(ph)
    p = ph - cyc
    tp = oq * sq / (1 + sq)          # opening phase
    tn = oq / (1 + sq)               # closing phase
    flow = np.where(p < tp, .5 * (1 - np.cos(np.pi * p / tp)), np.where(p < tp + tn, np.cos(.5 * np.pi * (p - tp) / tn), 0.0))
    amp = 1 + shimmer * smooth_noise(n, 60, rng)
    if subharm:
        amp *= 1 + subharm * np.where(cyc % 2 == 0, 1, -1)
    flow = flow * amp
    d = np.diff(flow, prepend=0) * SR / np.maximum(fj, 1)   # derivative, roughly level-independent of f0
    asp = hp(rng.standard_normal(n), 1500) * flow * breath * 4
    return d + asp


def pulse_train(rate, n, rng, jitter=.08, width=.0015):
    """impulses at a (possibly varying) rate; each a short raised-cosine click"""
    rate = np.broadcast_to(rate, (n,)) * (1 + jitter * smooth_noise(n, 30, rng))
    ph = np.cumsum(rate / SR)
    idx = np.nonzero(np.diff(np.floor(ph), prepend=0) > 0)[0]
    y = np.zeros(n)
    w = max(3, int(width * SR))
    k = .5 - .5 * np.cos(2 * np.pi * np.arange(w) / w)
    for i in idx:
        a = 1 + .3 * rng.standard_normal()
        y[i:i + w] += k[:n - i] * a
    return y


# ---------------- vocal tract ----------------
def resonator_tv(x, F, B, block=64):
    """Klatt resonator with time-varying centre F and bandwidth B (arrays or scalars)"""
    n = len(x)
    F = np.broadcast_to(F, (n,))
    B = np.broadcast_to(B, (n,))
    y = np.zeros(n)
    zi = np.zeros(2)
    T = 1 / SR
    for s in range(0, n, block):
        e = min(n, s + block)
        f, b = F[(s + e) // 2 - 1 if e - s > 1 else s], B[(s + e) // 2 - 1 if e - s > 1 else s]
        C = -np.exp(-2 * np.pi * b * T)
        Bc = 2 * np.exp(-np.pi * b * T) * np.cos(2 * np.pi * f * T)
        A = 1 - Bc - C
        y[s:e], zi = lfilter([A], [1, -Bc, -C], x[s:e], zi=zi)
    return y


def tract(src, formants):
    """cascade of formants: list of (F array/scalar, B array/scalar); then lip radiation"""
    y = src
    for F, B in formants:
        y = resonator_tv(y, F, B)
    return np.diff(y, prepend=0)


# ---------------- struck objects ----------------
def modal(freqs, decays, amps, d, rng, contact=.001, hardness=8000, detune=.004):
    """sum of damped modes excited by a short contact noise burst"""
    x = tt(d)
    exc_n = max(8, int(contact * SR))
    exc = lp(rng.standard_normal(exc_n) * np.hanning(exc_n), hardness)
    y = np.zeros(len(x))
    for f, dc, a in zip(freqs, decays, amps):
        f2 = f * (1 + detune * rng.standard_normal())
        if f2 >= SR / 2 - 500:
            continue
        mode = np.sin(2 * np.pi * f2 * x + rng.random() * 6.28) * np.exp(-x / dc) * a
        y += mode
    y = fftconvolve(y, exc)[:len(x)] if contact > .0004 else y
    return y


# ---------------- water ----------------
def bubble(radius_mm, d=None, amp=1.0, xi=.1):
    """van den Doel's bubble: a sine whose pitch rises as it decays (Minnaert frequency)"""
    r = radius_mm / 1000
    f0 = 3.0 / r
    dmp = .043 * f0 + .0014 * f0 ** 1.5
    sigma = xi * dmp
    d = d or min(.25, 6 / dmp)
    x = tt(d)
    f = f0 * (1 + sigma * x)
    return amp * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-dmp * x)


def bubbles(n, d, rng, r_lo=.8, r_hi=6, density_curve=None, amp_curve=None):
    """a cloud of n bubbles over d seconds (radii log-uniform)"""
    y = np.zeros(int(d * SR) + int(.3 * SR))
    for _ in range(n):
        u = rng.random()
        if density_curve is not None:
            u = density_curve(u)
        t0 = u * d
        r = np.exp(rng.uniform(np.log(r_lo), np.log(r_hi)))
        a = (amp_curve(u) if amp_curve else 1) * rng.uniform(.3, 1) * (r / r_hi) ** .3
        b = bubble(r, amp=a)
        i = int(t0 * SR)
        y[i:i + len(b)] += b[:len(y) - i]
    return y


# ---------------- space ----------------
def room_ir(rt60=.5, early=((.011, .5), (.017, .35), (.029, .25)), bright=6000, rng=None, d=None):
    rng = rng or np.random.default_rng(3)
    d = d or rt60 * 1.2
    n = int(d * SR)
    x = np.arange(n) / SR
    tail = rng.standard_normal(n) * np.exp(-6.9 * x / rt60)
    tail = lp(tail, bright) * .08
    tail[:int(.008 * SR)] = 0
    ir = tail
    ir[0] = 1.0
    for t, g in early:
        ir[int(t * SR)] += g * (1 if rng.random() > .5 else -1)
    return ir


def place(y, ir, wet=.35):
    w = fftconvolve(y, ir)[:len(y) + len(ir) // 2]
    dry = np.pad(y, (0, len(w) - len(y)))
    return dry * (1 - wet) + w * wet / (np.max(np.abs(w)) / (np.max(np.abs(y)) + 1e-9) + 1e-9)
