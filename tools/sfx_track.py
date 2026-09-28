#!/usr/bin/env python3
"""Sound effects for the film, synthesised from scratch and placed on the picture's events.

  python3 tools/sfx_track.py            -> audio/sfx.wav  (effects and ambience only)
                                           audio/guide_sfx.wav (mixed with audio/guide.wav, if it exists)
  python3 tools/sfx_track.py --music audio/soundtrack.wav   mix the effects under another music file instead

Every sound is made here from physical models (tools/sfxworld.py, tools/sfxanimals.py): no
samples, so it is free to use and share. A fixed seed (seed=1011 and so on) is a chosen take:
the variation a sound classifier recognised best; S() gives every other sound its own seed.

- Event times come from the shots' own timing constants: T(shot, seconds into that shot).
- Footsteps come from audio/steps.json, which tools/probe_motion.py measures from the drawings,
  so every foot that lands in the picture lands in the sound too.
- Each shot has an acoustic space (street, park, embankment, building site, close-up): every
  sound gets that space's reverb, and a distance cue (`far`) dulls and wets it.
- Levels are loudness targets (`L`, dB of the loudest 100 ms, roughly K-weighted), not gains.
"""
import argparse
import json
import pathlib
import sys
import wave

import numpy as np
from scipy.signal import fftconvolve

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from sfxdsp import SR, lp, hp, bp, norm, curve  # noqa: E402
import sfxanimals as A  # noqa: E402
import sfxworld as W  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
CUTS = json.loads((ROOT / 'audio' / 'cuts.json').read_text())['cuts']
DUR = CUTS[-1] / 24
N = int((DUR + 3) * SR)
out = np.zeros((2, N))
rng = np.random.default_rng(11)
_seed = [100]


def S():
    """a fresh seed for every sound, so no two are identical"""
    _seed[0] += 1
    return _seed[0]


def T(shot, sec):
    return CUTS[shot - 1] / 24 + sec


def shot_at(t):
    f = t * 24
    for s in range(len(CUTS) - 1):
        if f < CUTS[s + 1]:
            return s + 1
    return len(CUTS) - 1


# ---------------- spaces ----------------
SPACES = {                      # rt60 s, early reflections (s, gain), brightness, reverb send
    'street': dict(rt60=.95, early=((.012, .45), (.019, .35), (.031, .3), (.046, .22), (.071, .15)), bright=5000, wet=.2),
    'site': dict(rt60=1.2, early=((.009, .5), (.016, .42), (.027, .35), (.041, .25)), bright=4500, wet=.26),
    'park': dict(rt60=.45, early=((.035, .12), (.06, .08)), bright=6500, wet=.08),
    'embankment': dict(rt60=.7, early=((.007, .4), (.022, .15)), bright=5500, wet=.12),
    'close': dict(rt60=.35, early=((.004, .25), (.009, .15)), bright=7000, wet=.05),
}
SHOT_SPACE = {1: 'street', 2: 'street', 3: 'street', 4: 'street', 5: 'street', 6: 'street', 7: 'park', 8: 'park', 9: 'site',
              10: 'park', 11: 'embankment', 12: 'street', 13: 'street', 14: 'street', 15: 'close', 16: 'close', 17: 'street',
              18: 'street', 19: 'street'}
def space_ir(rt60, early, bright, rng):
    """a room's response without the direct sound: each early reflection a short diffuse smear
    (walls aren't mirrors), then a tail that builds up smoothly and loses its highs faster"""
    n = int((rt60 * 1.3 + .1) * SR)
    x = np.arange(n) / SR
    ir = np.zeros(n)
    for t, g in early:
        L = int(rng.uniform(.002, .005) * SR)
        b = lp(rng.standard_normal(L) * np.hanning(L), bright * .8)
        i = int(t * rng.uniform(.95, 1.05) * SR)
        ir[i:i + L] += b / (np.sqrt(np.sum(b ** 2)) + 1e-9) * g
    tail = rng.standard_normal(n) * (1 - np.exp(-x / .015))
    lo = lp(tail, 1500) * np.exp(-6.9 * x / rt60)
    hi = (lp(tail, bright) - lp(tail, 1500)) * np.exp(-6.9 * x / (rt60 * .55))
    t0 = int(early[0][0] * SR) if early else 0
    ir[t0:] += ((lo + hi)[:n - t0]) * .06
    return ir


IRS, SENDS = {}, {}
for k, sp in SPACES.items():
    irs = []
    for ch in (0, 1):
        ir = space_ir(sp['rt60'], sp['early'], sp['bright'], np.random.default_rng(7 + ch * 31 + len(k)))
        irs.append(ir / np.sqrt(np.sum(ir ** 2)))
    IRS[k] = irs
    SENDS[k] = np.zeros((2, N))


def loud(y):
    z = y if y.ndim == 1 else y.mean(0)
    z = hp(z, 60) + .6 * hp(z, 2000)
    w = int(.1 * SR)
    if len(z) <= w:
        e = np.mean(z ** 2)
    else:
        c = np.cumsum(np.concatenate([[0], z ** 2]))
        e = np.max((c[w:] - c[:-w]) / w)
    return 10 * np.log10(e + 1e-20)


def put(y, t, L=-30.0, pan=0.0, far=0.0, space=None, wet=None):
    """place a sound: loudness target L, pan -1..1 (ignored for stereo sounds), far 0..1"""
    y = np.asarray(y, float)
    if far:
        y = lp(y, 16000 / (1 + 5 * far)) if y.ndim == 1 else np.vstack([lp(c, 16000 / (1 + 5 * far)) for c in y])
    y = y * 10 ** ((L - loud(y)) / 20)
    if y.ndim == 1:
        pan = float(np.clip(pan, -1, 1))
        y = np.vstack([y * np.sqrt((1 - pan) / 2), y * np.sqrt((1 + pan) / 2)]) * 1.414
    i = int(round(t * SR))
    if i < 0:
        y, i = y[:, -i:], 0
    m = min(y.shape[1], N - i)
    if m <= 0:
        return
    out[:, i:i + m] += y[:, :m]
    sp = space or SHOT_SPACE[shot_at(max(t, 0))]
    send = (SPACES[sp]['wet'] if wet is None else wet) * (1 + 2.5 * far)
    SENDS[sp][:, i:i + m] += y[:, :m] * send


def bed(s0, s1, gen, L, fade=.05, **kw):
    """an ambience bed from the start of shot s0 to the start of shot s1 (stereo: two takes)"""
    t0, t1 = T(s0, 0), T(s1, 0) if s1 <= len(CUTS) - 1 else DUR + 1
    d = t1 - t0 + 2 * fade
    y = np.vstack([gen(d, seed=S()), gen(d, seed=S())])
    f = int(fade * SR)
    y[:, :f] *= np.linspace(0, 1, f)
    y[:, -f:] *= np.linspace(1, 0, f)
    put(y, t0 - fade, L, space=SHOT_SPACE[s0], **kw)


# =====================================================================================
# ambience
for s in (1, 2, 3, 4, 5, 6, 12, 13, 14):
    bed(s, s + 1, lambda d, seed: W.traffic(d, seed=seed), -44)
bed(9, 10, lambda d, seed: W.traffic(d, seed=seed), -42)
for s in (7, 8, 10):                                          # the park: birds, leaves, a distant city
    bed(s, s + 1, lambda d, seed: W.leaves(d, gust=.5, seed=seed), -46)
    bed(s, s + 1, lambda d, seed: W.traffic(d, seed=seed), -52)
    t, end = T(s, .1), T(s + 1, 0)
    while t < end - .3:
        put(W.birdsong(np.random.default_rng(S()).uniform(.6, 1.3), seed=S()), t, -40 + rng.uniform(-4, 2), rng.uniform(-.8, .8), far=rng.uniform(.3, .8))
        t += rng.uniform(.5, 1.3)
bed(11, 12, lambda d, seed: W.traffic(d, seed=seed), -50)       # the embankment: open, the river below
bed(11, 12, lambda d, seed: lp(W.splash(d, impact=0, whump=0, hiss=0, spray=0, n_bub=int(40 * d), bub_spread=d * .9, r_lo=3, r_hi=12, seed=seed), 1500), -46)
put(W.wind(4.4, gust=.9, seed=S()), T(1, -.2), -33, .2)          # the gust that takes the hat
put(W.wind(3.0, gust=.8, howl=.4, seed=S()), T(5, -.1), -34, -.2)  # the gust at the sill
# the rain: light on the close-ups, then it comes down properly after the thunder
bed(15, 16, lambda d, seed: lp(W.rain(d, seed=seed), 7000), -42)
bed(16, 17, lambda d, seed: lp(W.rain(d, seed=seed), 8000), -38)
put(W.thunder(7.5, dist=3.0, seed=S()), T(16, 1.0), -27, -.2, far=.2)
bed(17, 18, lambda d, seed: W.rain(d, seed=seed), -27)
bed(18, 19, lambda d, seed: W.rain(d, seed=seed), -27)
bed(19, 20, lambda d, seed: W.rain(d, seed=seed), -29)


def patter(t0, t1, L, pan=0.0, far=0.0, fade_in=.3, fade_out=.3, **kw):
    d = t1 - t0
    y = W.canopy(d, seed=S(), **kw)
    n = len(y)
    e = np.minimum(1, np.arange(n) / (fade_in * SR)) * np.clip((n - np.arange(n)) / (fade_out * SR), 0, 1)
    put(y * e, t0, L, pan, far)


# =====================================================================================
# footsteps, from the drawings
SHOES = {   # multipliers on the tuned leather-shoe defaults, and a base loudness
    'hero': ({}, -36), 'heroBack': ({}, -36),
    'butcher': (dict(thud=1.8, thud_hi=.8, heel=.8, knock_f=.8), -33),
    'thief': (dict(heel=.35, knock=.3, sole=1.6, scuff=2.0, sole_delay=.4, grit=1.5), -31),
    'lady': (dict(heel=1.3, heel_tau=.6, knock=1.4, knock_f=1.7, thud=.4, sole=.4), -37),
    'iceKid': (dict(heel=.4, knock=.4, thud=.4, thud_hi=1.4, sole=1.2, scuff=1.5), -40),
    'catGirl': (dict(heel=.4, knock=.4, thud=.4, thud_hi=1.4, sole=1.2, scuff=1.5), -39),
    'scootKid': (dict(heel=.2, knock=.2, sole=1.2, scuff=4.0, scuff_d=2.0, grit=2.0), -37),
    'painter': (dict(heel=.5, sole=.8, scuff=2.0), -40),
}
_fs_defaults = {k: v.default for k, v in __import__('inspect').signature(W.footstep).parameters.items() if isinstance(v.default, (int, float)) and not isinstance(v.default, bool)}
steps = json.loads((ROOT / 'audio' / 'steps.json').read_text())['steps']
for e in steps:
    mult, base = SHOES.get(e['who'], ({}, -38))
    kw = {k: _fs_defaults[k] * m for k, m in mult.items()}
    wet = .9 if e['shot'] >= 17 else 0
    L = base - 3 + 12 * np.log10(max(e['scale'], 60) / 420) + 2.5 * np.clip(np.log2(max(e['drop'], .05) / .8), -1.5, .8)
    far = float(np.clip(1 - e['scale'] / 300, 0, .8)) if e['scale'] < 300 else 0
    put(W.footstep(wet=wet, seed=S(), **kw), e['t'], L, e['pan'] * .8, far)


def sip(t, pan=-.3, L=-35, d=None):
    put(W.slurp(seed=S()) if d is None else W.slurp(d, seed=S()), t, L, pan)


def tick(t, L=-30, pan=0.0, f=2900):          # a small hard tap (tip on plastic, on a handle)
    put(W.knock(f, .008, 9000, seed=S()), t, L, pan)


# =====================================================================================
# 1 Top hat
put(W.whoosh(.35, .4, 500, 2200, seed=S()), T(1, .5), -30, .3)          # the hat lifts off
put(W.whoosh(.6, .5, 250, 900, sharp=1.2, seed=S()), T(1, .95), -34, 0)  # tumbling over
put(W.knock(380, .03, 3000, seed=S()), T(1, 1.75), -28, -.3)           # lands on the tip: felt on the ferrule
spin = W.scrape(.9, rate=180, r1=900, r2=1900, r3=3100, q=4, grit=.2, seed=S()) * (.6 + .4 * np.sin(2 * np.pi * 5.5 * np.arange(int(.9 * SR)) / SR))
put(spin, T(1, 1.95), -42, -.3)                                         # the brim whirring round the tip
put(W.whoosh(.3, .5, 500, 2500, seed=S()), T(1, 2.9), -30, 0)            # flicked back
put(W.plop(120, .04, 1200, .4, seed=S()), T(1, 3.32), -28, .3)          # onto his head
sip(T(1, 3.78), d=.3)

# 2 Scooter
sc = W.scooter(3.2, speed=3.2, seed=S())
x = np.arange(len(sc)) / SR
g = np.interp(x, [0, 1.2, 1.5, 3.2], [.35, 1, 1, .35])
pan = np.interp(x, [0, 1.3, 3.2], [.9, 0, -.8])
put(np.vstack([sc * g * np.sqrt((1 - pan) / 2), sc * g * np.sqrt((1 + pan) / 2)]) * 1.4, T(2, 0), -30)
tick(T(2, 1.0), -27, .1, 2400)                                          # tap on the handlebar
put(W.scrape(.3, rate=900, r1=1200, r2=2300, r3=3600, q=12, grit=.3, seed=S()), T(2, 1.05), -38, 0)   # wheels scrub in the swerve
put(W.whoosh(.5, .45, 300, 1200, seed=S()), T(2, 1.2), -32, 0)
put(W.rustle(.3, seed=S()), T(2, 1.62), -42, -.5)                       # phone into the pocket

# 3 Postman
put(A.bark2(seed=S()), T(3, .26), -19, .4)                               # through the letterbox
put(W.letterbox(seed=S()), T(3, .3), -24, .4)                            # the flap bangs open
put(W.rustle(.25, seed=S()), T(3, .34), -34, .3)                         # the postman jolts
put(W.whoosh(.3, .4, 1200, 4500, seed=S()), T(3, .4), -34, .3)           # letters fly
for s in (.6, .8, 1.0, 1.3, 1.52):
    put(W.paper(seed=S()), T(3, s), -33, .2)                             # flicked by the tip
for s in (1.15, 1.72, 2.08):
    put(W.paper(.15, seed=S()), T(3, s), -33, .3)
    put(W.letterbox(rattle=1, seed=S()), T(3, s + .26), -29, .3)          # the flap snaps shut behind each one
put(W.rustle(.3, seed=S()), T(3, 2.6), -42, .3)                          # he tips his cap

# 4 Pigeon
put(A.takeoff(1.3, birds=1, seed=S()), T(4, .45), -32, -.4)              # flies over from behind
put(W.whoosh(.62, .7, 600, 1400, sharp=1.0, seed=S()), T(4, .8), -44, 0)   # the dropping falling
put(W.splat(seed=S()), T(4, 1.42), -28, 0)                               # meets the tip
put(W.whoosh(.25, .5, 400, 1400, seed=S()), T(4, 1.6), -36, .3)           # the tapped arc
put(W.plop(seed=S()), T(4, 2.02), -30, .5)                              # into the planter soil
put(A.takeoff(.5, birds=1, claps=0, seed=S()), T(4, 1.95), -34, .6)       # landing on the tree
put(W.leaves(.8, gust=1.2, seed=S()), T(4, 2.1), -38, .6)
put(A.coo(seed=S()), T(4, 2.3), -30, .6)

# 5 Flowerpot
put(W.scrape(.32, seed=S()), T(5, .3), -32, .1)                          # the pot slides along the sill
put(W.ceramic(seed=S()), T(5, 1.0), -27, .1)                             # caught on the tip
put(W.scrape(.3, seed=S()), T(5, 1.52), -34, .1)                         # pushed home
put(W.ceramic(seed=S()), T(5, 1.62), -30, .1)
put(A.takeoff(.9, birds=1, claps=1, seed=S()), T(5, 1.95), -32, .5)       # the pigeon comes in to the sill
put(A.coo(seed=S()), T(5, 2.75), -30, .1)
put(W.whoosh(.43, .7, 600, 1400, sharp=1.0, seed=S()), T(5, 3.15), -44, .1)
put(W.splat(seed=S()), T(5, 3.58), -28, .05)                             # on the tip, over the reader's head
put(W.whoosh(.2, .5, 500, 2000, seed=S()), T(5, 3.7), -34, .1)            # flicked
put(W.splat(.35, 1.4, seed=S()), T(5, 3.88), -24, .1)                    # straight back on the pigeon
put(A.squawk(seed=1002), T(5, 3.93), -24, .1)
put(A.takeoff(1.1, birds=1, seed=S()), T(5, 4.05), -28, .5)
put(W.rustle(.5, seed=S()), T(5, 4.25), -36, .2)                         # the reader lowers his paper

# 6 Butcher
put(W.paws(1.3, seed=S()), T(6, 0), -34, .5)                             # the bulldog trots out
put(W.sniffs(2, .13, seed=S()), T(6, .4), -32, -.3)                      # he sniffs the tip
put(W.whoosh(.2, .4, 400, 1600, seed=S()), T(6, .68), -32, -.3)           # one swipe down the shin
put(W.rustle(.2, rate=2500, seed=S()), T(6, .7), -38, -.3)               # the cloth
put(W.coin_flick(tau=.25, spin=0, seed=S()), T(6, .95), -40, -.2)         # the glint
put(W.whoosh(.25, .5, 600, 1800, seed=S()), T(6, 1.3), -34, 0)          # chain lifted
put(A.growl(seed=1011), T(6, 1.55), -24, .1)
put(W.whoosh(.45, .6, 150, 700, sharp=1.2, seed=S()), T(6, 2.25), -32, 0)   # the push-in
put(W.chop(seed=1006), T(6, 2.86), -19, .1)                               # chop
put(W.whoosh(.16, .6, 1500, 5000, seed=S()), T(6, 3.08), -30, .1)        # the ninja slash...
put(W.rail_slide(.14, f1=1400, rate=3000, seed=S()), T(6, 3.16), -32, .1)
put(W.squish(seed=S()), T(6, 3.3), -27, .15)                             # ...skewered
sip(T(6, 4.78), -.2)

# 7 Cat
put(A.meow(seed=S()), T(7, .3), -24, .5)
put(A.hiss(seed=1019), T(7, 1.15), -26, .5)
put(W.sniffs(3, .12, F1=2600, F2=4800, seed=S()), T(7, 1.45), -36, .5)
t = T(7, 1.85)
for k in range(4):                                                         # licks come unevenly
    put(W.lap(seed=S()), t, -38 + rng.uniform(-3, 1), .5)
    t += rng.uniform(.08, .14)
put(W.splat(.2, .5, seed=S()), T(7, 2.8), -36, .2)                         # scrap and grease onto her palm
put(W.whoosh(.33, .5, 400, 1500, seed=S()), T(7, 2.98), -34, .3)          # the cat jumps down
put(W.plop(150, .02, 1800, .6, seed=S()), T(7, 3.3), -34, .1)             # soft landing
put(A.purr(1.0, seed=1019), T(7, 3.5), -31, .1)                            # purring into her palm
t = T(7, 3.65)
while t < T(7, 4.4):
    put(W.lap(seed=S()), t, -41 + rng.uniform(-3, 1), .1)
    t += rng.uniform(.1, .22)
sip(T(7, 4.05))

# 8 Pond
put(W.umbrella_open(seed=1008), T(8, .97), -21, -.2)                      # the snap is the gust...
put(W.whoosh(.55, .35, 300, 1300, seed=S()), T(8, 1.12), -28, .2)          # ...rolling out to the sails
put(W.umbrella_open(.3, click=0, runner=0, pop_t=.02, air=0, thump=.3, seed=S()), T(8, 1.40), -30, .3)   # sails fill
wake = lp(W.splash(2.6, impact=0, whump=0, hiss=.2, spray=0, n_bub=120, bub_spread=2.2, r_lo=2, r_hi=10, seed=S()), 3000)
put(wake, T(8, 1.5), -36, .5)                                              # water under the hull
put(W.kids_cheer(kids=3, seed=1023), T(8, 1.7), -27, .3)                  # the kids cheer
put(W.kids_cheer(seed=1003), T(8, 2.55), -32, .35)
sip(T(8, 2.73))

# 9 Wet concrete
put(W.umbrella_close(seed=S()), T(9, 1.12), -28, -.2)
put(W.whoosh(.2, .5, 800, 2400, seed=S()), T(9, 1.46), -32, -.2)          # toss
put(W.knock(700, .02, 4000, seed=S()), T(9, 1.66), -31, -.2)             # catch
put(W.whoosh(.2, .5, 400, 1100, seed=S()), T(9, 1.7), -34, -.2)           # the hop
put(W.clang(seed=1015), T(9, 1.86), -22, -.2)                             # hooks the rail
put(W.rail_slide(.78, seed=S()), T(9, 1.97), -26, 0)                     # the glide
put(W.whoosh(.7, .5, 300, 900, seed=S()), T(9, 1.98), -34, 0)
put(W.clang(tau=.35, seed=1015), T(9, 2.76), -28, .5)                     # lifted off
put(W.rail_slide(.16, f1=900, seed=S()), T(9, 3.22), -34, .5)            # the umbrella slides to the crook
put(W.knock(650, .02, 4000, seed=S()), T(9, 3.38), -32, .5)

# 10 Ice cream
put(W.splat(.35, 1.2, seed=S()), T(10, 1.0), -28, -.3)                    # the scoops hit the pavement
put(W.splat(.3, .9, seed=S()), T(10, 1.04), -31, -.3)
put(W.coin_flick(seed=1017), T(10, 1.62), -30, -.4)                        # flick
put(W.coin_in_jar(seed=1013), T(10, 2.1), -27, .5)                         # into the jar
for s in (2.5, 2.8):
    put(W.squish(.22, seed=S()), T(10, s), -34, .4)                       # fresh scoops
put(W.paws(.5, rate=9, claws=.3, seed=S()), T(10, 2.45), -40, -.6)        # the cat runs in
t = T(10, 3.0)
while t < T(10, 4.0):
    put(W.lap(seed=S()), t, -40 + rng.uniform(-3, 1), -.1)
    t += rng.uniform(.1, .2)
put(W.coin_flick(seed=S()), T(10, 3.72), -30, -.4)
put(W.coin_in_jar(seed=S()), T(10, 4.15), -27, .5)
sip(T(10, 4.6), -.4)

# 11 Painter
for s in (.2, .55, .9):
    put(W.rustle(.3, rate=3000, lo=2500, hi=9000, body=.8, seed=S()), T(11, s), -40, .4)    # squinting strokes
tick(T(11, 1.2), -33, .1, 3200)                                           # the tip under the glasses
put(W.whoosh(.3, .5, 900, 3000, seed=S()), T(11, 1.5), -32, .2)           # flicked up
tick(T(11, 1.92), -29, .3, 2600)                                          # onto his nose
put(W.rustle(.25, seed=S()), T(11, 1.94), -38, .3)                        # he startles
t = T(11, 2.72)
while t < T(11, 4.1):                                                      # London, fast
    put(W.rustle(rng.uniform(.12, .25), rate=4000, lo=2500, hi=9000, body=.8, seed=S()), t, -40 + rng.uniform(-3, 2), .4)
    t += rng.uniform(.15, .3)
put(W.bell(4.5, tau=3.0, seed=S()), T(11, 4.14), -37, .35, far=.6)                      # and the real clock strikes as he paints its face
sip(T(11, 3.45))

# 12 Van
put(W.door_slam(seed=S()), T(12, 1.04), -33, -.6, far=.4)                 # the driver, in the cab on the far side
put(W.engine_start(2.9, crank_d=.16, seed=1002), T(12, 1.0), -25, .5)       # the starter grinds, the engine coughs and catches...
put(W.whoosh(.3, .3, 120, 400, seed=S()), T(12, 1.15), -32, .8)            # ...with a puff from the exhaust
rattle = W.scrape(1.2, rate=15, jitter=.2, r1=260, r2=520, r3=900, q=5, grit=.1, seed=S())
put(rattle, T(12, 1.25), -38, 0)                                          # the box shaking loose
tick(T(12, 1.62), -28, -.1, 380)                                          # tapped back
tick(T(12, 1.98), -32, -.2, 2200)                                         # tip in the door handle
put(W.sliding_door(.26, seed=1008), T(12, 1.98), -21, -.3)                 # run shut, slam
rev = W.engine(1.6, rpm_curve=[900, 900, 1600, 2300, 2500], seed=S())
xr = np.arange(len(rev)) / SR
gv = np.interp(xr, [0, .15, .6, 1.6], [.8, 1, .75, 0])
pv = np.interp(xr, [0, 1.6], [.4, -.9])
put(np.vstack([rev * gv * np.sqrt((1 - pv) / 2), rev * gv * np.sqrt((1 + pv) / 2)]) * 1.4, T(12, 2.52), -24)   # pulls away
sip(T(12, 3.2), -.2)

# 13 Handbag
put(W.whoosh(.25, .5, 500, 1800, seed=S()), T(13, .88), -30, .3)          # the yank
put(W.plop(140, .04, 900, .3, seed=S()), T(13, 1.12), -28, 0)             # handle catches on the shaft
put(W.rail_slide(.3, f1=300, rate=300, q=6, seed=S()), T(13, 1.15), -38, 0)
put(W.rustle(.3, seed=S()), T(13, 1.46), -34, -.3)                        # he loses it and stumbles
put(W.rail_slide(.38, f1=300, rate=400, q=6, seed=S()), T(13, 2.2), -34, .2)   # the bag slides down to her
put(W.plop(160, .03, 1200, .4, seed=S()), T(13, 2.6), -30, .4)
sip(T(13, 3.4), -.2)

# 14 Taxi
sip(T(14, .38))
put(W.car_pass(3.0, t_close=1.7, v=9, dist=2.2, seed=1016), T(14, .2), -18)     # the taxi comes past...
put(W.whoosh(.3, .5, 400, 1400, seed=S()), T(14, 1.18), -32, -.4)          # he hops across
put(W.footstep(thud=1.6, seed=S()), T(14, 1.48), -30, .1)
put(W.umbrella_open(seed=S()), T(14, 1.40), -24, .1)
put(W.splash(.8, spray=.3, spray_n=40, seed=S()), T(14, 1.82), -22, .2)     # ...through the puddle
put(W.splash(seed=1023), T(14, 2.3), -15, .1)                              # and it breaks on the canopy
patter(T(14, 2.36), T(14, 3.0), -30, .1, fade_in=.02, rate=140)           # the spray drumming on it
put(W.rain(1.3, dense=.3, near=1.2, near_rate=30, puddle=.8, seed=S()), T(14, 2.6), -34, .1)   # drips
for k in range(1, 6):
    put(W.clap(seed=S()), T(14, 2.58 + k * .2618), -35 + rng.uniform(-2, 1), -.35)   # the relieved bystander claps
put(W.umbrella_close(seed=S()), T(14, 2.85), -29, .1)
sip(T(14, 3.52), .1)

# 15 Raindrop (close-up)
put(W.drip(seed=S()), T(15, .6), -27, .1)                                 # into the sip hole
put(W.splat(.15, .4, n_bub=6, seed=S()), T(15, .63), -34, .1)             # the little crown
put(W.lid_tap(seed=S()), T(15, .93), -33, -.2)                            # the coffee comes down on the lid
for s, sh in ((.92, .2), (1.18, -.1), (1.42, -.4), (1.68, .3)):
    put(W.lid_tap(f1=2600 * (1 + .2 * sh), seed=S()), T(15, s), -35, sh)   # beads on the lid

# 16 Face
put(W.lid_tap(f1=1400, tau=.004, wet=1.0, seed=S()), T(16, .45), -35, .2)  # on his cheek

# 17 Stance
put(W.rustle(.4, seed=S()), T(17, .05), -34, -.4)                         # coats and hoods go up
put(W.whoosh(.3, .4, 300, 1000, seed=S()), T(17, .1), -34, .5)            # a briefcase over a head
patter(T(17, .35), T(18, 0), -34, .5, rate=50, f_lo=500, f_hi=1400)        # rain drumming on the briefcase
for s in (.3, .5, .68):
    tick(T(17, s), -36, .4, 2600)                                         # the stuck catch
put(W.whoosh(.3, .5, 500, 2000, seed=S()), T(17, .62), -28, 0)            # the lunge
tick(T(17, .92), -26, .4, 3000)                                           # the catch pops...
put(W.umbrella_open(seed=S()), T(17, .9), -22, .45)                       # ...and it springs open
patter(T(17, 1.05), T(18, 0) + .1, -29, .45, fade_in=.05)                  # rain on the red umbrella
put(W.whoosh(.25, .5, 700, 1800, seed=S()), T(17, 1.72), -34, 0)          # the salute

# 18 Exit
put(W.umbrella_open(.8, runner_d=.3, pop_t=.38, seed=S()), T(18, .12), -24, 0)    # a slow, proper open
patter(T(18, .52), T(19, 0) + .3, -25, 0, fade_in=.08)                    # the rain on his canopy
sip(T(18, 1.08), -.2)

# 19 Last word
put(A.takeoff(.9, birds=1, claps=0, seed=S()), T(19, .55), -32, .5)       # the pigeon flies in
put(W.whoosh(.28, .7, 600, 1400, sharp=1.0, seed=S()), T(19, 1.0), -44, -.3)
put(W.splat(seed=S()), T(19, 1.28), -27, -.3)                            # on the cat
put(A.meow(.3, f0a=520, f0b=700, f0c=560, seed=1023), T(19, 1.34), -26, -.3)   # 'mrrp!'
put(A.takeoff(.4, birds=1, claps=0, seed=S()), T(19, 1.45), -36, -.1)     # landing on the branch
put(W.leaves(.7, gust=1.3, seed=S()), T(19, 1.55), -36, -.1)
put(A.coo(seed=S()), T(19, 1.7), -30, -.1)                               # gloating
put(A.coo(seed=S()), T(19, 2.2), -32, -.1)
put(W.scrape(.4, rate=60, jitter=1.2, r1=1500, r2=2800, r3=4200, q=3, grit=.8, seed=S()), T(19, 1.95), -36, -.3)   # claws up the bark
put(W.whoosh(.22, .6, 600, 2000, seed=S()), T(19, 2.85), -30, -.1)        # the pounce
put(W.leaves(.9, gust=1.5, seed=S()), T(19, 3.0), -32, -.1)
put(A.squawk(seed=S()), T(19, 3.02), -24, -.1)
put(A.takeoff(1.2, birds=1, seed=1002), T(19, 3.08), -26, .3)                      # it just gets away
put(A.hiss(.3, seed=S()), T(19, 3.4), -34, -.1)                           # the cat's disgust


# =====================================================================================
for k, bus in SENDS.items():
    if np.any(bus):
        for ch in (0, 1):
            out[ch] += fftconvolve(bus[ch], IRS[k][ch])[:N]


def write(path, data):
    data = data[:, :int(DUR * SR)].copy()
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
    write(ROOT / 'audio' / 'sfx.wav', sfx)
    music = pathlib.Path(args.music)
    if music.exists():
        m = read(music)
        n = min(m.shape[1], sfx.shape[1])
        mixed = m[:, :n] * .55 + sfx[:, :n] * 1.25
        mixed /= max(1.0, np.max(np.abs(mixed)) / .95)
        write(ROOT / 'audio' / (music.stem + '_sfx.wav'), mixed)
