#!/usr/bin/env python3
"""Sound effects for the film, synthesised from scratch and placed on the picture's events.

  python3 tools/sfx_track.py            -> audio/sfx.wav  (effects and ambience only)
                                           audio/guide_sfx.wav (mixed with audio/guide.wav, if it exists)
  python3 tools/sfx_track.py --music audio/soundtrack.wav   mix the effects under another music file instead

Every sound is made here from noise, sines and filters (no samples), so it is free to use and share.
The times come from the shots' own timing constants: T(shot, seconds from the start of that shot).
"""
import argparse
import json
import pathlib
import wave

import numpy as np
from scipy.signal import butter, lfilter, stft, istft

ROOT = pathlib.Path(__file__).resolve().parent.parent
SR = 44100
CUTS = json.loads((ROOT / 'audio' / 'cuts.json').read_text())['cuts']
DUR = CUTS[-1] / 24
N = int((DUR + 2) * SR)
out = np.zeros((2, N))
rng = np.random.default_rng(11)


def T(shot, sec):
    return CUTS[shot - 1] / 24 + sec


def tt(d):
    return np.arange(max(1, int(d * SR))) / SR


def noise(d):
    return rng.standard_normal(max(1, int(d * SR)))


def lp(x, fc, o=2):
    b, a = butter(o, min(fc, SR / 2 - 100) / (SR / 2))
    return lfilter(b, a, x)


def hp(x, fc, o=2):
    b, a = butter(o, fc / (SR / 2), 'high')
    return lfilter(b, a, x)


def bp(x, lo, hi, o=2):
    b, a = butter(o, [lo / (SR / 2), min(hi, SR / 2 - 100) / (SR / 2)], 'band')
    return lfilter(b, a, x)


def norm(y):
    return y / (np.max(np.abs(y)) + 1e-9)


def shaped(src, mask):
    """filter a signal with a time-varying spectral mask(f, tau)"""
    f, tau, Z = stft(src, SR, nperseg=1024)
    M = mask(f[:, None], tau[None, :])
    _, y = istft(Z * M, SR, nperseg=1024)
    return y[:len(src)] if len(y) >= len(src) else np.pad(y, (0, len(src) - len(y)))


def band(f, fc, octv):
    with np.errstate(divide='ignore'):
        return np.exp(-.5 * (np.log2(np.maximum(f, 1) / fc) / octv) ** 2)


def ar(d, a, r, shape=1.5):
    """attack-release envelope"""
    x = tt(d)
    return np.minimum(1, x / max(a, 1e-4)) * np.clip((d - x) / max(r, 1e-4), 0, 1) ** shape


def expd(d, a, dec):
    x = tt(d)
    return np.minimum(1, x / max(a, 1e-4)) * np.exp(-x / dec)


def sweep(f0, f1, d, curve='exp'):
    x = tt(d) / d
    f = f0 * (f1 / f0) ** x if curve == 'exp' else f0 + (f1 - f0) * x
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def res(freqs, decays, d=None, amps=None):
    d = d or max(decays) * 5
    x = tt(d)
    amps = amps or [1] * len(freqs)
    return sum(a * np.sin(2 * np.pi * f * x) * np.exp(-x / dc) for f, dc, a in zip(freqs, decays, amps))


def harmonic(f0, d, n=10, tilt=1.2):
    """a buzzy source with a (possibly time-varying) pitch"""
    f0 = np.broadcast_to(f0, (len(tt(d)),))
    ph = 2 * np.pi * np.cumsum(f0) / SR
    return sum(np.sin(k * ph) / k ** tilt for k in range(1, n + 1))


def put(y, t, db=0.0, pan=0.0):
    i = int(t * SR)
    if i >= N:
        return
    if i < 0:
        y, i = y[-i:], 0
    y = y[:N - i] * 10 ** (db / 20)
    out[0, i:i + len(y)] += y * np.sqrt((1 - pan) / 2) * 1.414
    out[1, i:i + len(y)] += y * np.sqrt((1 + pan) / 2) * 1.414


# ---------------- the sound library ----------------
def whoosh(d=.4, f0=400, f1=2400, octv=.7, peak=.6):
    y = shaped(noise(d), lambda f, tau: band(f, f0 * (f1 / f0) ** np.clip(tau / d, 0, 1), octv))
    x = tt(d)
    e = np.where(x < peak * d, (x / (peak * d)) ** 2, np.clip((d - x) / ((1 - peak) * d), 0, 1) ** 1.6)
    return norm(y * e)


def thump(f=80, dec=.09):
    x = tt(dec * 5)
    return norm(sweep(f * 1.6, f, dec * 5) * np.exp(-x / dec) + .3 * lp(noise(dec * 5), 400) * np.exp(-x / (dec * .4)))


def click(hi=4000):
    return norm(hp(noise(.012), hi) * expd(.012, .0003, .002))


def umbrella_open(d=.26):
    body = whoosh(d, 250, 900, .9, .75) * .8
    y = np.concatenate([body, np.zeros(int(.15 * SR))])
    i = int((d - .02) * SR)
    pop = thump(95, .05) * .9
    y[i:i + len(pop)] += pop[:len(y) - i]
    y[:len(click())] += click(3000) * .5
    return norm(y)


def umbrella_close():
    d = .24
    ru = bp(noise(d), 900, 5000) * ar(d, .03, .12) * (.6 + .4 * np.abs(np.sin(2 * np.pi * 28 * tt(d))))
    y = np.concatenate([ru, np.zeros(int(.1 * SR))])
    c = norm(res([1900, 3100], [.012, .008]))
    y[int(.22 * SR):int(.22 * SR) + len(c)] += c * .7
    return norm(y)


def metal_clank():
    return norm(res([523, 1331, 2290, 3712], [.22, .14, .09, .05], amps=[1, .7, .5, .3]) + .4 * np.pad(click(2500), (0, int(1.1 * SR) - len(click()))))


def metal_slide(d):
    x = tt(d)
    src = noise(d) * (.6 + .4 * rng.random(len(x)) ** 3)
    y = sum(bp(src, f * .97, f * 1.03) * a for f, a in ((1330, 1), (2290, .7), (3700, .5)))
    whine = np.sin(2 * np.pi * (1330 + 40 * np.sin(2 * np.pi * 3 * x)) * x) * .25
    return norm((y + whine) * ar(d, .04, .15, 1))


def tick_plastic():
    return norm(res([2900, 4300], [.018, .012]) + .5 * np.pad(click(3000), (0, int(.09 * SR) - len(click()))))


def tok_wood():
    return norm(res([720, 1520], [.035, .018]) + .5 * np.pad(lp(click(200), 3000), (0, int(.175 * SR) - len(click()))))


def tok_card():
    return norm(bp(noise(.07), 250, 900) * expd(.07, .001, .015) + .6 * res([190], [.03], .07))


def ceramic():
    return norm(res([1150, 2650, 4100], [.05, .025, .015]) + .4 * np.pad(click(2000), (0, int(.25 * SR) - len(click()))))


def scrape(d):
    x = tt(d)
    grain = (rng.random(len(x)) < .02).astype(float)
    grain = lp(grain, 3000) * 8
    y = bp(noise(d), 1500, 4500) * (.3 + .7 * np.abs(np.sin(2 * np.pi * 47 * x))) + grain
    return norm(y * ar(d, .03, .08, 1))


def glass_clink():
    y = res([2140, 3360, 5210, 7050], [.35, .24, .15, .09])
    for k, dt in enumerate((.09, .16, .21)):
        i = int(dt * SR)
        r = res([2600 + 400 * k, 4700 - 300 * k], [.05, .03]) * (.4 - .1 * k)
        y[i:i + len(r)] += r[:len(y) - i]
    return norm(y)


def coin_ting():
    return norm(res([3150, 4820, 6950], [.45, .3, .18], amps=[1, .6, .35]) + .5 * np.pad(click(3000), (0, int(2.25 * SR) - len(click()))))


def plink(f0=900, f1=2600, d=.05):
    return norm(sweep(f0, f1, d) * expd(d, .001, d * .45))


def blup():
    return norm(sweep(280, 650, .07) * expd(.07, .002, .03))


def plop(f0=380, f1=110):
    return norm(sweep(f0, f1, .14) * expd(.14, .002, .05) + .3 * lp(noise(.14), 900) * expd(.14, .001, .02))


def splat(big=1.0):
    d = .25 * big
    y = lp(noise(d), 2200) * expd(d, .001, .05 * big) + .8 * sweep(220, 85, d) * expd(d, .002, .06 * big)
    for _ in range(int(5 * big)):
        i = int(rng.random() * d * .7 * SR)
        c = plink(700 + rng.random() * 900, 1400 + rng.random() * 1200, .03) * .3
        y[i:i + len(c)] += c[:len(y) - i]
    return norm(y)


def big_splash():
    d = 1.7
    y = shaped(noise(d), lambda f, tau: band(f, 700 + 2600 * np.clip(tau / .18, 0, 1), 1.3)) * expd(d, .012, .42)
    y = y / (np.max(np.abs(y)) + 1e-9)
    y[:int(.6 * SR)] += thump(70, .14)[:int(.6 * SR)] * .9
    for k in range(40):
        tk = .12 + rng.random() ** 1.6 * 1.4
        i = int(tk * SR)
        c = plink(800 + rng.random() * 1500, 1800 + rng.random() * 2500, .035) * (.35 * (1 - tk / 1.6))
        y[i:i + len(c)] += c[:len(y) - i]
    return norm(y)


def sploosh():
    d = .55
    y = shaped(noise(d), lambda f, tau: band(f, 300 * (5 ** np.clip(tau / d, 0, 1)), 1.1))
    return norm(y * ar(d, .08, .3, 1.2))


def drips(d, n):
    y = np.zeros(int(d * SR))
    for _ in range(n):
        i = int(rng.random() * (d - .1) * SR)
        c = plink(900 + rng.random() * 800, 2000 + rng.random() * 1500, .04) * (.3 + .7 * rng.random())
        y[i:i + len(c)] += c
    return norm(y)


def flutter(d, rate=13):
    x = tt(d)
    ph = 2 * np.pi * np.cumsum(rate * (1 + .15 * np.sin(2 * np.pi * 1.3 * x))) / SR
    am = np.abs(np.sin(ph / 2)) ** 3
    return norm(lp(hp(noise(d), 250), 3500) * am * ar(d, .05, .15, 1))


def coo():
    parts = []
    for f0, f1, d in ((340, 330, .22), (300, 318, .34)):
        x = tt(d)
        s = harmonic(np.linspace(f0, f1, len(x)), d, 4, 2.0) * (1 + .5 * np.sin(2 * np.pi * 28 * x)) * ar(d, .03, .08, 1)
        parts += [lp(s, 1400), np.zeros(int(.04 * SR))]
    return norm(np.concatenate(parts))


def squawk():
    d = .28
    x = tt(d)
    f0 = 750 + 250 * np.sin(np.pi * x / d) + 40 * rng.standard_normal(len(x)).cumsum() / 200
    return norm(bp(harmonic(f0, d, 12, .8), 700, 4000) * ar(d, .01, .1, 1))


def formant(src, tracks, d):
    """tracks: list of (F(tau) Hz, bandwidth in octaves, gain)"""
    def mask(f, tau):
        u = np.clip(tau / d, 0, 1)
        return sum(g * band(f, F(u), bw) for F, bw, g in tracks)
    return shaped(src, mask)


def woof():
    d = .3
    x = tt(d)
    f0 = 190 - 70 * x / d
    src = harmonic(f0, d, 25, .7) + .3 * noise(d)
    y = formant(src, [(lambda u: 350 + 400 * np.minimum(1, u * 4), .35, 1), (lambda u: 800 + 350 * np.minimum(1, u * 4), .35, .8), (lambda u: 2500, .4, .25)], d)
    return norm(y * ar(d, .015, .2, 1.3))


def growl(d):
    x = tt(d)
    f0 = 78 + 8 * np.sin(2 * np.pi * 3 * x) + 4 * rng.standard_normal(len(x)).cumsum() / 400
    src = harmonic(f0, d, 30, .6) * (.6 + .4 * np.abs(np.sin(2 * np.pi * 11 * x))) + .4 * noise(d)
    y = formant(src, [(lambda u: 420, .45, 1), (lambda u: 950, .45, .6)], d)
    return norm(y * ar(d, .1, .25, 1))


def meow(d=.62, f0s=(520, 800, 540)):
    x = tt(d)
    u = x / d
    f0 = np.interp(u, [0, .45, 1], f0s)
    src = harmonic(f0, d, 14, 1.0)
    y = formant(src, [(lambda v: np.interp(v, [0, .4, 1], [320, 780, 480]), .3, 1),
                      (lambda v: np.interp(v, [0, .4, 1], [2100, 1500, 900]), .3, .7),
                      (lambda v: 3000, .35, .25)], d)
    return norm(y * ar(d, .04, .2, 1.4))


def hiss():
    return norm(hp(noise(.5), 3000) * ar(.5, .03, .3, 1))


def purr(d):
    x = tt(d)
    am = np.clip(np.sin(2 * np.pi * 26 * x), 0, 1) ** 2
    return norm(lp(noise(d), 380) * am * (1 + .3 * np.sin(2 * np.pi * .9 * x)) * ar(d, .15, .2, 1))


def lap():
    return norm(bp(noise(.03), 900, 3500) * expd(.03, .001, .006) + .5 * res([950], [.008], .03))


def sniff():
    d = .11
    return norm(bp(noise(d), 1800, 6500) * (tt(d) / d) ** 1.5 * ar(d, .08, .02, 1))


def slurp():
    d = .32
    x = tt(d)
    y = shaped(noise(d), lambda f, tau: band(f, 700 * 3 ** np.clip(tau / d, 0, 1), .5)) * (.5 + .5 * np.abs(np.sin(2 * np.pi * 38 * x)))
    return norm(y * ar(d, .05, .1, 1))


def step(wet=False, heavy=1.0):
    y = res([170 * heavy, 1150], [.03, .008], .15) + .4 * np.pad(lp(click(300), 2500), (0, int(.15 * SR) - len(click())))
    if wet:
        y += .6 * np.pad(splat(.4)[:int(.1 * SR)], (0, int(.05 * SR)))
    return norm(y)


def swipe(d=.2):
    return norm(bp(noise(d), 700, 3200) * ar(d, .04, .1, 1) * (.7 + .3 * np.sin(2 * np.pi * 60 * tt(d))))


def rustle(d=.35):
    x = tt(d)
    crackle = (rng.random(len(x)) < .01).astype(float)
    return norm((bp(noise(d), 1000, 6000) * .5 + hp(crackle, 1500) * 6) * ar(d, .03, .12, 1))


def paper_flick():
    return norm(hp(noise(.05), 2500) * expd(.05, .001, .01) + .3 * whoosh(.12, 1500, 4000, .6, .3)[:int(.05 * SR)])


def brush_stroke(d=.3):
    return norm(bp(noise(d), 1200, 3800) * ar(d, .06, .12, 1))


def shing():
    d = .7
    ring = res([2830, 4150, 6240, 8100], [.3, .22, .15, .08], d)
    sw = np.pad(whoosh(.12, 2000, 7000, .5, .5), (0, int(d * SR) - int(.12 * SR)))
    return norm(sw + .6 * ring)


def thwack():
    y = lp(noise(.12), 1600) * expd(.12, .001, .02) + .9 * thump(110, .05)[:int(.12 * SR)]
    return norm(y)


def squish():
    return norm(lp(noise(.14), 900) * expd(.14, .003, .04) + .7 * sweep(300, 120, .14) * expd(.14, .003, .05))


def door_slam(heavy=1.0):
    y = thump(65 * heavy, .12) * 1.0
    r = res([410, 930, 1700], [.07, .045, .03]) * .5
    y[:len(r)] += r[:len(y)]
    return norm(y)


def slide_roll(d):
    x = tt(d)
    return norm(lp(noise(d), 700) * (.6 + .4 * np.abs(np.sin(2 * np.pi * 36 * x))) * ar(d, .05, .05, 1))


def engine(d, f0, f1, crank=0.0, bright=700):
    x = tt(d)
    f = np.interp(x, [0, d], [f0, f1])
    y = lp(harmonic(f, d, 20, .9) * (1 + .25 * np.sin(2 * np.pi * f * .5 * x)), bright) + .15 * lp(noise(d), 300)
    if crank:
        y *= np.where(x < crank, .4 + .6 * np.abs(np.sin(2 * np.pi * 7 * x)), 1)
    return norm(y)


def car_pass(d, t_pass):
    x = tt(d)
    dist = np.sqrt(1 + ((x - t_pass) * 9) ** 2)
    doppler = np.where(x < t_pass, 1.08, .93) + (1.0 - np.where(x < t_pass, 1.08, .93)) * np.exp(-np.abs(x - t_pass) * 6)
    eng = lp(harmonic(38 * doppler, d, 25, .8), 900)
    tyre = hp(noise(d), 1500) * .8 + bp(noise(d), 300, 1200) * .5
    return norm((eng * .6 + tyre) / dist)


def scooter_roll(d):
    x = tt(d)
    return norm(lp(noise(d), 500) * (.7 + .3 * np.abs(np.sin(2 * np.pi * 17 * x))) + .08 * hp(noise(d), 4000))


def scuffle():
    d = .45
    y = np.zeros(int(d * SR))
    for k in range(5):
        i = int(k * .07 * SR)
        s = (thump(90 + 20 * k, .04) * .7)[:int(.1 * SR)] + np.pad(bp(noise(.06), 800, 3000) * expd(.06, .001, .015), (0, int(.04 * SR)))
        y[i:i + len(s)] += s[:len(y) - i]
    return norm(y)


def bird_chirp():
    d = .09
    return norm(sweep(3300 + rng.random() * 800, 4400 + rng.random() * 900, d) * ar(d, .005, .04, 1))


# ---------------- ambience beds (switch on the cuts, 40 ms crossfades) ----------------
def bed(t0, t1, gen, db):
    d = t1 - t0
    y = gen(d + .08)
    f = int(.04 * SR)
    y[:f] *= np.linspace(0, 1, f)
    y[-f:] *= np.linspace(1, 0, f)
    put(y, t0 - .04, db)


def city(d):
    x = tt(d)
    return norm(lp(noise(d), 260) * (1 + .3 * np.sin(2 * np.pi * .13 * x)) + .15 * bp(noise(d), 600, 1800))


def rain(d, density=1.0):
    x = tt(d)
    y = shaped(noise(d), lambda f, tau: band(f, 4500, 1.4)) * .7
    ticks = (rng.random(len(x)) < .0025 * density).astype(float) * rng.random(len(x))
    y += hp(ticks, 2500) * 3
    return norm(y)


def canopy_patter(d):
    x = tt(d)
    ticks = (rng.random(len(x)) < .004).astype(float) * rng.random(len(x))
    return norm(lp(hp(ticks, 300), 2500) * 4 + .3 * bp(noise(d), 400, 1600))


for s in range(1, 15):
    bed(T(s, 0), T(s + 1, 0), city, -34 if s != 14 else -29)
for s, db in ((15, -40), (16, -33), (17, -21), (18, -22), (19, -24)):
    bed(T(s, 0), T(s + 1, 0) + (1.5 if s == 19 else 0), lambda d: rain(d, 1.0), db)
bed(T(18, .5), T(19, 0), canopy_patter, -24)              # rain drumming on his open umbrella
for s in (7, 8):                                          # birds in the park
    for k in range(6):
        put(bird_chirp(), T(s, .3 + k * .7 + rng.random() * .3), -30, rng.uniform(-.6, .6))
        put(bird_chirp(), T(s, .42 + k * .7 + rng.random() * .3), -32, rng.uniform(-.6, .6))

# ---------------- the events ----------------
# 1 Top hat
put(whoosh(1.4, 200, 900, 1.0, .35), T(1, 0.0), -16, .5)            # the gust
put(whoosh(.35, 600, 2200, .7, .4), T(1, .5), -18, .3)              # hat lifts off
put(tok_wood(), T(1, 1.75), -20, -.3)                                # lands on the tip
put(norm(res([220], [.4], .6) * (1 + .5 * np.sin(2 * np.pi * 34 * tt(.6)))), T(1, 1.95), -30, -.3)   # spinning hum
put(whoosh(.9, 700, 1400, .5, .5) * (.5 + .5 * np.sin(2 * np.pi * 26 * tt(.9))), T(1, 2.0), -25, -.3)
put(whoosh(.3, 500, 2500, .7, .4), T(1, 2.9), -20, 0)                # flicked back
put(thump(140, .05), T(1, 3.32), -16, .3)                            # onto his head
put(slurp(), T(1, 3.85), -24, -.3)
# 2 Scooter
put(scooter_roll(3.0) * np.interp(tt(3.0), [0, 1.3, 1.6, 3.0], [.35, 1, 1, .3]), T(2, 0), -22, .2)
put(tick_plastic(), T(2, 1.0), -14, .1)                              # tap on the handlebar
put(whoosh(.5, 300, 1200, .8, .5), T(2, 1.25), -20, 0)               # curving past
# 3 Postman
put(metal_clank()[:int(.25 * SR)], T(3, .31), -16, .4)               # flap bangs open
put(woof(), T(3, .33), -8, .4)
put(woof(), T(3, .58), -12, .4)
put(whoosh(.3, 1500, 4500, .6, .3), T(3, .4), -18, .3)               # letters fly
for s in (.6, .8, 1.0, 1.3, 1.52):
    put(paper_flick(), T(3, s), -16, .2)
for s in (1.15, 1.72, 2.08):
    put(paper_flick(), T(3, s), -16, .3)
    put(metal_clank()[:int(.2 * SR)] * .6 + 0, T(3, s + .26), -19, .3)   # flap snaps shut behind each one
# 4 Pigeon
put(flutter(1.3), T(4, .5), -19, -.4)
put(sweep(2400, 900, .62) * ar(.62, .05, .05, 1), T(4, .8), -30, 0)   # the dropping whistles down
put(splat(.5), T(4, 1.42), -16, 0)                                   # meets the tip
put(plop(), T(4, 2.02), -14, .5)                                     # into the planter
put(coo(), T(4, 2.2), -18, .6)
# 5 Flowerpot
put(whoosh(1.2, 200, 800, 1.0, .4), T(5, 0), -16, -.3)
put(scrape(.32), T(5, .3), -20, .1)                                  # pot shoved along the sill
put(ceramic(), T(5, 1.0), -14, .1)                                   # caught on the tip
put(scrape(.3), T(5, 1.52), -22, .1)
put(ceramic(), T(5, 1.62), -18, .1)                                  # set back upright
put(flutter(.65), T(5, 1.95), -19, .5)
put(coo(), T(5, 2.7), -18, .1)
put(sweep(2400, 900, .43) * ar(.43, .03, .05, 1), T(5, 3.15), -30, .1)
put(splat(.5), T(5, 3.58), -16, .05)                                 # on the tip, over the reader's head
put(splat(1.3), T(5, 3.88), -9, .1)                                  # straight back on the pigeon
put(squawk(), T(5, 3.95), -13, .1)
put(flutter(.9), T(5, 4.1), -18, .5)
put(rustle(), T(5, 4.25), -22, .2)                                   # the reader peeks
# 6 Butcher
put(scuffle()[:int(.3 * SR)], T(6, 0.0), -30, .6)
for k in range(10):
    put(step(heavy=2.0)[:int(.06 * SR)], T(6, .08 + k * .13), -32, .5 - k * .08)   # paws
put(sniff(), T(6, .4), -16, -.3)
put(sniff(), T(6, .52), -18, -.3)
put(swipe(.22), T(6, .68), -14, -.3)                                 # one swipe down the shin
put(coin_ting()[:int(.6 * SR)], T(6, .95), -24, -.2)                 # the glint
put(whoosh(.25, 600, 1800, .7, .5), T(6, 1.3), -22, 0)               # chain lifted
put(growl(1.3), T(6, 1.55), -17, .1)
put(whoosh(.45, 150, 700, 1.0, .9), T(6, 2.25), -18, 0)              # the push-in
put(thwack(), T(6, 2.86), -10, .1)                                   # chop
put(squish(), T(6, 2.88), -18, .1)
put(shing(), T(6, 3.16), -12, .1)                                    # the snip...
put(squish(), T(6, 3.3), -12, .15)                                   # ...skewered
put(slurp(), T(6, 4.78), -24, -.2)
# 7 Cat
put(meow(), T(7, .3), -15, .5)
put(hiss(), T(7, 1.15), -17, .5)
for s in (1.45, 1.6, 1.75):
    put(sniff(), T(7, s), -21, .5)
for k in range(5):
    put(lap(), T(7, 1.85 + k * .09), -20, .5)
put(plop(260, 150), T(7, 2.8), -18, .2)                              # the sausage into her palm
put(whoosh(.33, 400, 1500, .8, .5), T(7, 2.98), -20, .3)             # the cat jumps down
put(thump(160, .03), T(7, 3.3), -20, .1)
put(purr(.85), T(7, 3.62), -19, .1)
for k in range(6):
    put(lap(), T(7, 3.65 + k * .12), -24, .1)
put(slurp(), T(7, 4.05), -24, -.3)
# 8 Pond
put(umbrella_open(), T(8, .97), -9, -.2)                             # the snap is the gust...
put(whoosh(.55, 300, 1300, 1.0, .35), T(8, 1.12), -12, .2)           # ...rolling out to the sails
put(whoosh(.18, 250, 700, 1.0, .3), T(8, 1.42), -14, .3)             # sails fill
put(shaped(noise(1.5), lambda f, tau: band(f, 500, 1.0)) * ar(1.5, .1, .8, 1), T(8, 1.5), -22, .5)   # water under the hull
put(slurp(), T(8, 2.73), -24, -.3)
# 9 Wet concrete
put(umbrella_close(), T(9, 1.14), -14, -.2)
put(whoosh(.2, 800, 2400, .6, .5), T(9, 1.46), -20, -.2)             # toss
put(tok_wood(), T(9, 1.66), -18, -.2)                                # catch
put(whoosh(.2, 400, 1100, .8, .6), T(9, 1.7), -24, -.2)              # the hop
put(metal_clank(), T(9, 1.86), -11, -.2)                             # hooks the rail
put(metal_slide(.76), T(9, 1.97), -13, 0)                            # the glide
put(whoosh(.7, 300, 900, .9, .4), T(9, 1.98), -20, 0)
put(metal_clank()[:int(.4 * SR)], T(9, 2.76), -15, .5)               # lifted off
put(step(heavy=.8), T(9, 2.95), -12, .5)                             # feet down
put(step(heavy=.8), T(9, 2.99), -15, .5)
put(metal_slide(.16), T(9, 3.22), -20, .5)                           # slides back to the crook
put(tok_wood(), T(9, 3.38), -20, .5)
# 10 Ice cream
put(splat(.7), T(10, 1.0), -14, -.3)                                 # scoops on the pavement
put(splat(.6), T(10, 1.03), -17, -.3)
put(coin_ting(), T(10, 1.64), -16, -.4)                              # flick
put(glass_clink(), T(10, 2.1), -14, .5)                              # into the jar
for s in (2.5, 2.8):
    put(squish(), T(10, s), -22, .4)                                 # fresh scoops
for k in range(4):
    put(step(heavy=2.2)[:int(.05 * SR)], T(10, 2.5 + k * .11), -30, -.6 + k * .1)
for k in range(8):
    put(lap(), T(10, 3.0 + k * .13), -24, -.1)
put(coin_ting(), T(10, 3.74), -16, -.4)
put(glass_clink(), T(10, 4.15), -14, .5)
put(slurp(), T(10, 4.6), -24, -.4)
# 11 Painter
for s in (.2, .55, .9):
    put(brush_stroke(), T(11, s), -26, .4)
put(tick_plastic(), T(11, 1.2), -20, .1)                             # the tip under the glasses
put(whoosh(.3, 900, 3000, .6, .4), T(11, 1.5), -18, .2)              # flicked up
put(tick_plastic(), T(11, 1.92), -15, .3)                            # onto his nose
for k in range(7):
    put(brush_stroke(.2), T(11, 2.45 + k * .28), -24, .4)
put(slurp(), T(11, 3.45), -24, -.3)
# 12 Van
put(door_slam(.8), T(12, 1.0), -20, -.6)                             # driver in the cab
put(engine(.45, 14, 22, crank=.4, bright=500), T(12, 1.15), -16, .5)  # starter
put(engine(1.45, 30, 32, bright=650), T(12, 1.55), -20, .5)          # idling
put(whoosh(.25, 150, 400, 1.0, .2), T(12, 1.2), -22, .8)                    # exhaust cough
put(scrape(.3) * .6, T(12, 1.3), -26, 0)                             # box creeping out
put(tok_card(), T(12, 1.62), -13, -.1)                               # tapped back
put(tick_plastic(), T(12, 1.98), -18, -.2)                           # tip in the handle
put(slide_roll(.26), T(12, 2.0), -14, -.3)
put(door_slam(1.0), T(12, 2.24), -9, -.3)
put(engine(1.4, 32, 48, bright=900) * np.interp(tt(1.4), [0, .3, 1.4], [1, .9, 0]), T(12, 2.55), -15, -.6)   # pulls away
put(slurp(), T(12, 3.2), -24, -.2)
# 13 Handbag
for k in range(10):
    put(step(heavy=1.1), T(13, .5 + k * .17), -21, .6 - k * .13)     # the thief's running steps
put(whoosh(.25, 500, 1800, .7, .4), T(13, .88), -16, .3)             # the yank
put(thump(120, .04), T(13, 1.12), -14, 0)                            # handle catches on the shaft
put(metal_slide(.3) * .5, T(13, 1.15), -24, 0)
put(scuffle()[:int(.25 * SR)], T(13, 1.46), -20, -.3)                # he loses it, stumbles
put(metal_slide(.38) * .6, T(13, 2.2), -22, .2)                      # the bag slides down to her
put(thump(170, .03), T(13, 2.6), -18, .4)
put(slurp(), T(13, 3.4), -24, -.2)
# 14 Taxi
put(slurp(), T(14, .38), -24, -.3)
put(car_pass(2.6, 1.0), T(14, .9), -11, 0)                           # the taxi comes past...
put(whoosh(.3, 400, 1400, .8, .6), T(14, 1.18), -22, -.4)            # he hops across
put(step(), T(14, 1.48), -16, .1)
put(umbrella_open(.3), T(14, 1.48), -11, .1)
put(sploosh(), T(14, 1.82), -9, .2)                                  # ...into the puddle
put(big_splash(), T(14, 2.34), -3, .1)                               # and it breaks on the canopy
put(drips(1.1, 16), T(14, 2.6), -20, .1)
put(umbrella_close(), T(14, 2.85), -16, .1)
put(slurp(), T(14, 3.52), -22, .1)
# 15 Raindrop (close-up)
put(plink(1100, 2800, .05), T(15, .6), -12, .1)                      # into the sip hole
put(blup(), T(15, .63), -14, .1)
put(plink(600, 1400, .04), T(15, .93), -20, -.2)                     # the coffee comes down on the lid
for s, sh in ((.92, .2), (1.18, -.1), (1.42, -.4), (1.68, .3)):
    put(plink(1400 + 400 * sh, 3000, .03), T(15, s), -22, sh)        # beads on the lid
# 16 Face
put(plink(700, 1600, .04) * .7, T(16, .45), -20, .2)                 # on his cheek
# 17 Stance
put(whoosh(.3, 500, 2000, .8, .8), T(17, .62), -16, 0)               # the lunge
put(click(2500), T(17, .92), -10, .4)                                # the catch pops...
put(umbrella_open(.22), T(17, .93), -10, .45)                        # ...and it springs open
put(whoosh(.25, 700, 1800, .7, .5), T(17, 1.72), -24, 0)             # the salute
# 18 Exit
put(click(2500), T(18, .12), -18, 0)
put(umbrella_open(.4), T(18, .14), -13, 0)
put(slurp(), T(18, 1.08), -22, -.2)
for k in range(7):
    put(step(wet=True), T(18, 2.25 + k * .18), -22 - k * 1.5, 0)    # walking off in the wet
# 19 Last word
put(flutter(1.0), T(19, .55), -22, .5)
put(sweep(2400, 900, .28) * ar(.28, .02, .03, 1), T(19, 1.0), -30, -.3)
put(splat(.6), T(19, 1.28), -17, -.3)                                # on the cat
put(meow(.3, (420, 620, 480)), T(19, 1.34), -16, -.3)                # "mrrp!"
put(coo(), T(19, 1.7), -20, -.1)                                     # gloating
put(coo(), T(19, 2.2), -22, -.1)
put(scrape(.4) * .7, T(19, 1.95), -24, -.3)                          # claws up the bark
put(whoosh(.22, 600, 2000, .7, .6), T(19, 2.85), -14, -.1)           # the pounce
put(scuffle(), T(19, 3.0), -12, -.1)
put(squawk(), T(19, 3.02), -12, -.1)
put(flutter(1.1, 17), T(19, 3.1), -15, .3)                           # it just gets away

# ---------------- write ----------------
def write(path, data):
    data = data[:, :int(DUR * SR)]
    fade = int(.3 * SR)
    data[:, -fade:] *= np.linspace(1, 0, fade)
    pcm = (np.clip(data.T, -1, 1) * 32767).astype('<i2')
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print('wrote', path.relative_to(ROOT))


def read(path):
    with wave.open(str(path)) as w:
        assert w.getframerate() == SR and w.getsampwidth() == 2, 'music must be 44.1 kHz 16-bit wav'
        x = np.frombuffer(w.readframes(w.getnframes()), '<i2').reshape(-1, w.getnchannels()).T.astype(float) / 32768
    return x if x.shape[0] == 2 else np.vstack([x, x])


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--music', default=str(ROOT / 'audio' / 'guide.wav'))
    args = ap.parse_args()
    sfx = out * (.5 / (np.max(np.abs(out)) + 1e-9))      # effects peak at -6 dBFS on their own
    write(ROOT / 'audio' / 'sfx.wav', sfx.copy())
    music = pathlib.Path(args.music)
    if music.exists():
        m = read(music)
        n = min(m.shape[1], sfx.shape[1])
        mixed = m[:, :n] * .55 + sfx[:, :n] * 1.25
        mixed /= max(1.0, np.max(np.abs(mixed)) / .95)
        write(ROOT / 'audio' / (music.stem + '_sfx.wav'), mixed)
