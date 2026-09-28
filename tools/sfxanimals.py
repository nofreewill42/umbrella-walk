"""Animal voices by source-filter synthesis: a glottal source with jitter, shimmer and breath
through a cat-, dog- or bird-sized vocal tract. Default parameters were tuned so that an
AudioSet sound classifier recognises each sound as what it is meant to be."""
import numpy as np
from sfxdsp import SR, tt, glottal, pulse_train, tract, curve, lp, hp, bp, norm, smooth_noise, env_adsr


def _env(n, attack, release, shape=1.3):
    x = np.arange(n) / SR
    d = n / SR
    return np.minimum(1, x / attack) * np.clip((d - x) / release, 0, 1) ** shape


def meow(d=.8132, f0a=656.8, f0b=473.1, f0c=400.5, peak=.2125, F1a=300, F1b=1764, F1c=1400, F2a=2144, F2b=3149, F2c=913.7,
         F3a=4695, F3b=3027, F3c=3990, B1=69.19, B2=117.6, B3=249.9, jitter=.004778, shimmer=.216, breath=.4, oq=.686,
         nasal=.00463, attack=.0203, release=.2864, seed=None):
    rng = np.random.default_rng(seed)
    n = int(d * SR)
    f0 = curve(n, [(0, f0a), (peak, f0b), (1, f0c)])
    src = glottal(f0, rng, jitter, shimmer, oq=oq, breath=breath)
    F1 = curve(n, [(0, F1a), (peak, F1b), (1, F1c)])
    F2 = curve(n, [(0, F2a), (peak, F2b), (1, F2c)])
    F3 = curve(n, [(0, F3a), (peak, F3b), (1, F3c)])
    y = tract(src, [(F1, B1), (F2, B2), (F3, B3), (5200, 400)])
    m = int(nasal * SR)                      # the "m": mouth still closed
    if m > 10:
        y[:m] = lp(y[:m], 700) * 2.5
    return norm(y * _env(n, attack, release))


def purr(d=1.999, rate=24.2, ex=1.254, inh=1, gap=.04888, inh_rate=5.533, F1=280.6, F2=1216, B1=218.8, B2=161.3, air=.01976,
         jitter=.03451, inh_gain=.4446, bright=1752, seed=None):
    """a purr: laryngeal pulses at ~26 Hz, alternating out-breath and (quieter, faster) in-breath"""
    rng = np.random.default_rng(seed)
    n = int(d * SR)
    x = np.arange(n) / SR
    cyc = ex + gap + inh + gap
    ph = (x + rng.random() * cyc) % cyc
    out_b = (ph < ex)
    in_b = (ph > ex + gap) & (ph < ex + gap + inh)
    gate = lp(out_b * 1.0 + in_b * inh_gain, 12)
    r = np.where(in_b, rate + inh_rate, rate)
    src = pulse_train(r, n, rng, jitter, .004) * gate
    src += lp(rng.standard_normal(n), 900) * air * gate
    y = tract(src, [(F1, B1), (F2, B2), (2500, 500)])
    return norm(lp(y, bright) * _env(n, .15, .2, 1))


def hiss(d=.5707, F1=2629, F2=4552, F3=7933, B=528.7, spit=0, attack=.05927, decay=.8077, air_hi=6503, seed=None):
    """an angry cat's hiss: turbulent air through a cat-sized mouth, with a spitting onset"""
    rng = np.random.default_rng(seed)
    n = int(d * SR)
    src = hp(rng.standard_normal(n), 400)
    y = tract(src, [(F1, B), (F2, B * 1.3), (F3, B * 1.6)]) + .3 * bp(rng.standard_normal(n), 3000, air_hi)
    x = np.arange(n) / SR
    e = np.minimum(1, x / attack) * (1 - decay * x / d) * (1 + spit * np.exp(-x / .03))
    return norm(y * e * np.clip((d - x) / .08, 0, 1))


def bark(d=.2205, f0a=286.1, f0b=900, f0c=600, peak=.4684, F1=563.3, F2=1636, F3=2752, B1=228.8, B2=157.8, B3=467.3,
         jitter=.03979, shimmer=.1245, subharm=.3189, breath=.5783, attack=.03891, release=.1443, seed=None):
    rng = np.random.default_rng(seed)
    n = int(d * SR)
    f0 = curve(n, [(0, f0a), (peak, f0b), (1, f0c)])
    src = glottal(f0, rng, jitter, shimmer, oq=.55, breath=breath, subharm=subharm)
    y = tract(src, [(F1, B1), (F2, B2), (F3, B3), (4000, 500)])
    return norm(y * _env(n, attack, release))


def growl(d=1.181, f0=213.5, f0_var=.1855, F1=866, F2=1714, F3=3011, B1=118.3, B2=90.88, B3=610.5, jitter=.2924, shimmer=.1744,
          subharm=.423, breath=1.2, trem=20.05, trem_depth=.5916, seed=None):
    rng = np.random.default_rng(seed)
    n = int(d * SR)
    f = f0 * (1 + f0_var * smooth_noise(n, 3, rng))
    src = glottal(f, rng, jitter, shimmer, oq=.7, breath=breath, subharm=subharm)
    x = np.arange(n) / SR
    src *= 1 - trem_depth + trem_depth * np.abs(np.sin(np.pi * trem * x + smooth_noise(n, 4, rng)))
    y = tract(src, [(F1, B1), (F2, B2), (F3, B3)])
    return norm(y * _env(n, .12, .25, 1))


def coo(f0=558.4, f0_end=410.5, d1=.1, gap=.1272, d2=.5568, trill=34.85, trill_depth=.894, tilt_fc=676.7, F1=None,
        breath=.02565, jitter=.016, seed=None):
    """a rock pigeon's 'oo-roo': two soft, nearly pure notes, the second trilled"""
    rng = np.random.default_rng(seed)
    parts = []
    for i, dd in enumerate((d1, d2)):
        n = int(dd * SR)
        f = curve(n, [(0, f0 * (1.02 if i == 0 else .97)), (.4, f0 * (1.04 if i else 1.0)), (1, f0_end)])
        s = glottal(f, rng, jitter, .03, oq=.8, breath=breath)
        s = lp(lp(s, tilt_fc), tilt_fc)
        if F1:
            s = tract(s, [(F1, 200)])
        x = np.arange(n) / SR
        if i == 1:
            s *= 1 - trill_depth + trill_depth * (.5 + .5 * np.sin(2 * np.pi * trill * x))
        parts += [s * _env(n, .03, .09, 1), np.zeros(int(gap * SR))]
    return norm(np.concatenate(parts))


def wings(d=1.2, rate=8.5, claps=1, flap_len=.7, attack=.35, lo=150, hi=1600, thump=.5, rustle=.3, rustle_hi=4000, jitter=.08, fade_out=.4, seed=None):
    """a pigeon taking off: every downstroke a soft 'whump' of air (raised-cosine noise swell),
    the first ones clapped (brighter, sharper), with feather rustle on top"""
    rng = np.random.default_rng(seed)
    n = int(d * SR)
    y = np.zeros(n)
    t, k = 0.0, 0
    while t < d - .03:
        L = int(flap_len / rate * SR)
        u = np.arange(L) / L
        e = np.where(u < attack, np.sin(.5 * np.pi * u / attack) ** 2, np.cos(.5 * np.pi * (u - attack) / (1 - attack)) ** 2)
        b = bp(rng.standard_normal(L), lo * (2 if k < claps else 1), hi * (2.5 if k < claps else 1)) * e
        b += thump * lp(rng.standard_normal(L), 200) * e * 3
        i = int(t * SR)
        y[i:i + L] += b[:n - i] * (1.3 if k < claps else 1) * (1 + .15 * rng.standard_normal())
        t += 1 / rate * (1 + jitter * rng.standard_normal())
        k += 1
    y += rustle * bp(rng.standard_normal(n), 1500, rustle_hi) * np.clip(smooth_noise(n, 30, rng), 0, None) * .4
    x = np.arange(n) / SR
    return norm(y * np.clip((d - x) / max(fade_out, .01), 0, 1))


def takeoff(d=1, rate=6.016, rate_end=9.07, claps=8, clap=0, clap_len=.01798, c_lo=190, c_hi=2895, whoosh=.8993, w_lo=72.05, w_hi=1598,
            whistle=.792, wh_down=1250, wh_up=2206, wh_bw=360.2, flutter=1.5, fl_rate=19.15, birds=8, spread=.195,
            fade_out=.6, seed=None):
    """pigeons taking off. Each wingbeat: at the top of the stroke the wings clap together
    (a sharp slap, strongest in the first beats), the downstroke pushes a swell of air, and the
    flight feathers whistle, lower on the downstroke than on the upstroke. Feathers flutter in
    between. Several birds leave a little apart."""
    rng = np.random.default_rng(seed)
    n = int(d * SR)
    y = np.zeros(n)
    for b in range(birds):
        t0 = b * spread * (1 + .4 * rng.random())
        g = 1 / (1 + .35 * b)
        t, k = t0, 0
        while t < d - .05:
            fr = rate + (rate_end - rate) * min(1, (t - t0) / max(d - t0, .1))
            per = 1 / fr
            L = int(per * SR)
            u = np.arange(L) / L
            i = int(t * SR)
            # clap: two hard feather slaps, a few ms apart
            if k < claps:
                cl = int(clap_len * SR)
                ce = np.exp(-np.arange(cl) / (cl / 4))
                c = bp(rng.standard_normal(cl), c_lo, c_hi) * ce
                c2 = np.pad(c * .6, (int(.004 * SR), 0))[:cl]
                cs = (c + c2) * clap * (1 - .2 * k) * 3
                y[i:i + cl] += cs[:n - i] * g
            # downstroke whoosh (first 55% of the period), upstroke weaker
            dn = np.sin(np.pi * np.clip(u / .55, 0, 1)) ** 2
            upw = np.sin(np.pi * np.clip((u - .55) / .45, 0, 1)) ** 2
            nz = rng.standard_normal(L)
            w = bp(nz, w_lo, w_hi) * (dn + .35 * upw) * whoosh
            # feather whistle: narrowband noise, low on the downstroke, high on the upstroke
            wh = (bp(rng.standard_normal(L), wh_down - wh_bw / 2, wh_down + wh_bw / 2) * dn +
                  bp(rng.standard_normal(L), wh_up - wh_bw / 2, wh_up + wh_bw / 2) * upw) * whistle * 4
            seg_ = (w + wh) * (1 + .15 * rng.standard_normal())
            y[i:i + L] += seg_[:n - i] * g
            t += per * (1 + .05 * rng.standard_normal())
            k += 1
    x = np.arange(n) / SR
    fl = bp(rng.standard_normal(n), 1500, 6000) * (.5 + .5 * np.sign(np.sin(2 * np.pi * fl_rate * x + smooth_noise(n, 20, rng))))
    y += fl * flutter * .3
    return norm(y * np.clip((d - x) / max(fade_out, .01), 0, 1))


def squawk(d=.4668, f0=2500, f0_var=.3772, F1=671.5, F2=3999, B1=533.2, B2=368.1, jitter=.08555, subharm=.001107, breath=.06032, seed=None):
    rng = np.random.default_rng(seed)
    n = int(d * SR)
    f = f0 * (1 + f0_var * np.sin(np.pi * np.arange(n) / n)) * (1 + .05 * smooth_noise(n, 20, rng))
    src = glottal(f, rng, jitter, .25, oq=.5, breath=breath, subharm=subharm)
    y = tract(src, [(F1, B1), (F2, B2), (4200, 600)])
    return norm(y * _env(n, .01, .12))


def chirp_bird(d=.12, f0=3800, f1=5200, seed=None):
    rng = np.random.default_rng(seed)
    n = int(d * SR)
    x = np.arange(n) / SR
    f = f0 + (f1 - f0) * np.sin(np.pi * x / d * .5) + 150 * np.sin(2 * np.pi * 60 * x)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) + .15 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    return norm(y * _env(n, .008, .05, 1))


def bark2(gap=.2755, **kw):
    """two barks, the second a touch lower"""
    seed = kw.pop('seed', None)
    a = bark(seed=seed, **kw)
    kw2 = dict(kw)
    for k in ('f0a', 'f0b', 'f0c'):
        if k in kw2:
            kw2[k] *= .93
    b = bark(seed=None if seed is None else seed + 7, **kw2)
    return np.concatenate([a, np.zeros(int(gap * SR)), b * .9])
