#!/usr/bin/env python3
"""A scratch "guide track" with the film's timing baked in: audio/guide.wav (76.6 s, 117.45 BPM).

  python3 tools/guide_track.py

It is a rough synth sketch, not the soundtrack: walking bass, brushes, a muted-trumpet
motif, a caper ostinato, stops and hits that land on the picture's big moments (the
chops, the umbrella snap, the taxi splash, the first raindrop, the pounce). Use it
  - as a temp track: python3 tools/render_film.py --audio audio/guide.wav
  - as an audio reference / cover source in a music generator, so the new score keeps
    the structure and the hit points.
Everything here is synthesised from scratch, so it is free to use and share.
"""
import json
import pathlib
import wave

import numpy as np
from scipy.signal import butter, lfilter, fftconvolve

ROOT = pathlib.Path(__file__).resolve().parent.parent
SR = 44100
import sys
sys.path.insert(0, str(ROOT / 'tools'))
from timeline import DUR, T, M  # noqa: E402  (shot timing and named moments, from timeline.json)
BEATS = json.loads((ROOT / 'audio' / 'beats.json').read_text())['beats']
BEAT = float(np.median(np.diff(BEATS)))
N = int((DUR + 1.0) * SR)
mix = np.zeros((2, N))
rng = np.random.default_rng(7)


def bt(k):
    """time of beat k (fractional k allowed); the grid the cuts were placed on"""
    i = int(np.floor(k))
    f = k - i
    t = lambda j: BEATS[j] if j < len(BEATS) else BEATS[-1] + (j - len(BEATS) + 1) * BEAT
    return t(i) + f * (t(i + 1) - t(i))


def midi(name):
    names = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
    n, rest = names[name[0]], name[1:]
    while rest and rest[0] in '#b':
        n += 1 if rest[0] == '#' else -1
        rest = rest[1:]
    return n + 12 * (int(rest) + 1)


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def put(sig, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N or i + len(sig) <= 0:
        return
    if i < 0:
        sig, i = sig[-i:], 0
    sig = sig[:N - i]
    mix[0, i:i + len(sig)] += sig * gain * np.sqrt((1 - pan) / 2) * 1.414
    mix[1, i:i + len(sig)] += sig * gain * np.sqrt((1 + pan) / 2) * 1.414


def tt(d):
    return np.arange(int(d * SR)) / SR


def env(d, a=.005, decay=.3, sustain=None):
    x = tt(d)
    e = np.minimum(1, x / a) * (np.exp(-x / decay) if sustain is None else 1)
    if sustain is not None:
        e = e * np.clip((d - x) / max(1e-3, sustain), 0, 1)
    return e


def lowpass(x, fc, order=2):
    b, a = butter(order, fc / (SR / 2))
    return lfilter(b, a, x)


def highpass(x, fc, order=2):
    b, a = butter(order, fc / (SR / 2), 'high')
    return lfilter(b, a, x)


def noise(d):
    return rng.standard_normal(int(d * SR))


# ---------------- instruments ----------------
def bass(m, t, d=None, g=.55):
    d = d or BEAT * 1.05
    x = tt(d)
    f = hz(m)
    s = (np.sin(2 * np.pi * f * x) + .35 * np.sin(4 * np.pi * f * x) + .1 * np.sin(6 * np.pi * f * x)) * env(d, .004, .45)
    put(s * np.clip((d - x) / .03, 0, 1), t, g, -.1)


def keys(ms, t, d=1.2, g=.16, pan=.25):
    x = tt(d)
    s = sum(np.sin(2 * np.pi * hz(m) * x) + .25 * np.sin(4 * np.pi * hz(m) * x) + .06 * np.sin(6 * np.pi * hz(m) * x) for m in ms)
    s *= env(d, .006, .7) * (1 + .15 * np.sin(2 * np.pi * 5 * x))
    put(s / len(ms), t, g, pan)


def vibes(m, t, d=1.4, g=.22, pan=.3):
    x = tt(d)
    f = hz(m)
    s = (np.sin(2 * np.pi * f * x) + .12 * np.sin(2 * np.pi * 4 * f * x) * np.exp(-x / .08)) * env(d, .002, .6) * (1 + .3 * np.sin(2 * np.pi * 6 * x))
    put(s, t, g, pan)


def celesta(m, t, d=1.6, g=.3, pan=.1):
    x = tt(d)
    f = hz(m)
    s = sum(a * np.sin(2 * np.pi * f * r * x) * np.exp(-x / dec) for r, a, dec in [(1, 1, .9), (2.76, .35, .3), (5.4, .15, .12), (8.9, .06, .05)])
    put(s * np.minimum(1, x / .002), t, g, pan)


def saw(f, x, n=12):
    return sum(np.sin(2 * np.pi * f * k * x) / k for k in range(1, n + 1))


def horn(ms, t, d=.22, g=.3, bright=2500, pan=-.15, a=.015):
    """a brass stab (or a held brass chord with a longer d)"""
    x = tt(d + .12)
    ms = [midi(m) if isinstance(m, str) else m for m in ms]
    s = sum(saw(hz(m) * (1 + .002 * i), x) for i, m in enumerate(ms)) / max(1, len(ms))
    e = np.minimum(1, x / a) * np.clip((d + .12 - x) / .12, 0, 1)
    put(lowpass(s * e, bright), t, g, pan)


def trumpet(m, t, d, g=.26, pan=.2):
    x = tt(d + .05)
    f = hz(m) * (1 + .004 * np.sin(2 * np.pi * 5.5 * x) * np.minimum(1, x / .25))
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = sum(np.sin(k * ph) / k ** 1.3 for k in range(1, 9))
    e = np.minimum(1, x / .03) * np.clip((d + .05 - x) / .06, 0, 1)
    put(lowpass(s * e, 1800), t, g, pan)


def pluck(m, t, d=.22, g=.2, pan=-.35):
    x = tt(d)
    s = saw(hz(m), x, 10) * np.exp(-x / .07)
    put(highpass(s, 180), t, g, pan)


def pizz(m, t, g=.28, pan=.2):
    x = tt(.25)
    f = hz(m)
    s = (np.sin(2 * np.pi * f * x) + .4 * np.sin(4 * np.pi * f * x) + .15 * np.sin(6 * np.pi * f * x)) * np.exp(-x / .06) * np.minimum(1, x / .003)
    put(s, t, g, pan)


def kick(t, g=.5):
    x = tt(.35)
    f = 48 + 70 * np.exp(-x / .03)
    put(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x / .14), t, g)


def brush(t, g=.12, d=.16):
    put(lowpass(highpass(noise(d), 1500), 7000) * env(d, .01, .07), t, g, .1)


def snare(t, g=.22):
    s = highpass(noise(.2), 900) * env(.2, .001, .06) + .5 * np.sin(2 * np.pi * 190 * tt(.2)) * np.exp(-tt(.2) / .04)
    put(s, t, g, .05)


def ride(t, g=.07):
    x = tt(.5)
    s = highpass(noise(.5), 5000) * np.exp(-x / .15) + .4 * sum(np.sin(2 * np.pi * f * x) for f in (3170, 4410, 5230)) / 3 * np.exp(-x / .3)
    put(s, t, g, .4)


def snap(t, g=.18):
    put(highpass(noise(.05), 2500) * env(.05, .0005, .012), t, g, -.3)


def woodblock(t, g=.25):
    x = tt(.12)
    put(np.sin(2 * np.pi * 1250 * x) * np.exp(-x / .025), t, g, -.2)


def crash(t, g=.28, d=2.2):
    put(highpass(noise(d), 3500) * env(d, .002, .6), t, g, .3)


def swell(t_end, d=.6, g=.22):
    x = tt(d)
    s = highpass(noise(d), 3000) * (x / d) ** 2.5
    put(s, t_end - d, g, .3)


def gliss(m0, m1, t, d, g=.18, pan=.3):
    """vibes/harp run: individual notes of the scale between m0 and m1"""
    notes = [m for m in range(min(m0, m1), max(m0, m1) + 1) if m % 12 in (0, 2, 4, 5, 7, 9, 10, 11)]
    if m1 < m0:
        notes = notes[::-1]
    for i, m in enumerate(notes):
        vibes(m, t + d * i / len(notes), .5, g, pan)


def roll(t0, t1, g0=.05, g1=.3):
    n = int((t1 - t0) / .045)
    for i in range(n):
        u = i / max(1, n - 1)
        snare(t0 + i * .045, g0 + (g1 - g0) * u ** 2)


# ---------------- harmony ----------------
CH = {
    'F6': ['F3', 'A3', 'C4', 'D4'], 'Fmaj7': ['F3', 'A3', 'C4', 'E4'], 'D7': ['D3', 'F#3', 'A3', 'C4'],
    'Gm7': ['G3', 'Bb3', 'D4', 'F4'], 'C7': ['E3', 'G3', 'Bb3', 'D4'], 'Am7': ['A3', 'C4', 'E4', 'G4'],
    'Dm7': ['D3', 'F3', 'A3', 'C4'], 'Bbmaj7': ['Bb3', 'D4', 'F4', 'A4'], 'F': ['F3', 'A3', 'C4', 'F4'],
}
ROOT_OF = {'F6': 'F2', 'Fmaj7': 'F2', 'F': 'F2', 'D7': 'D2', 'Gm7': 'G2', 'C7': 'C2', 'Am7': 'A2', 'Dm7': 'D2', 'Bbmaj7': 'Bb1'}
THIRD = {'F6': 4, 'Fmaj7': 4, 'F': 4, 'D7': 4, 'Gm7': 3, 'C7': 4, 'Am7': 3, 'Dm7': 3, 'Bbmaj7': 4}


def walk(chords, b0, g=.55, comp=True, comp_g=.16, drums=True, dg=1.0, snaps=False, stop=1e9):
    """one chord per bar starting at beat b0: walking bass, swung comping, brushes and ride"""
    for i, c in enumerate(chords):
        b = b0 + 4 * i
        r = midi(ROOT_OF[c])
        nxt = midi(ROOT_OF[chords[i + 1]]) if i + 1 < len(chords) else r
        line = [r, r + THIRD[c], r + 7, nxt + (1 if nxt < r + 7 else -1)]
        for k, m in enumerate(line):
            if b + k < stop:
                bass(m, bt(b + k), g=g)
        if comp:
            keys([midi(n) for n in CH[c]], bt(b + 1.67), .5, comp_g)
            keys([midi(n) for n in CH[c]], bt(b + 3), .7, comp_g * .8)
        if drums:
            for k in range(4):
                if b + k >= stop:
                    break
                ride(bt(b + k), .07 * dg)
                if k in (1, 3):
                    ride(bt(b + k + .67), .045 * dg)
                    brush(bt(b + k), .13 * dg)
                    if snaps:
                        snap(bt(b + k))
            kick(bt(b), .18 * dg)


M1 = [[(0, .67, 'C5'), (.67, .33, 'A4'), (1, 1, 'C5'), (2.67, 1.33, 'D5')],
      [(0, 1, 'C5'), (1, .67, 'A4'), (1.67, .33, 'F#4'), (2, 2, 'A4')],
      [(0, .67, 'Bb4'), (.67, .33, 'D5'), (1, 1, 'F5'), (2, .67, 'E5'), (2.67, 1.33, 'D5')],
      [(0, 1, 'C5'), (1, 1, 'Bb4'), (2, 2, 'G4')]]
M2 = [[(0, .67, 'A4'), (.67, .33, 'C5'), (1, .67, 'F5'), (1.67, .33, 'E5'), (2, 2, 'C5')],
      [(0, 1, 'D5'), (1, 1, 'C5'), (2, .67, 'A4'), (2.67, 1.33, 'F#4')],
      [(0, 1, 'G4'), (1, .67, 'Bb4'), (1.67, .33, 'D5'), (2, 1, 'F5'), (3, 1, 'E5')],
      [(0, 3, 'F5')]]


def melody(phrase, b0, inst='trumpet', g=.26, bars=None, shift=0):
    for bi, bar in enumerate(phrase[:bars]):
        for off, d, n in bar:
            s, e = bt(b0 + 4 * bi + off), bt(b0 + 4 * bi + off + d)
            m = midi(n) + shift
            if inst == 'trumpet':
                trumpet(m, s, (e - s) * .92, g)
            elif inst == 'vibes':
                vibes(m, s, max(.5, e - s), g)
            else:
                horn([m, m - 12], s, (e - s) * .85, g, 3200, .2, .02)


# ---------------- the score ----------------
# A  shots 1-5 (beats 0-39): dry and breezy. Snaps and walking bass, then the muted trumpet motif.
swell(M(1, 'T_OFF'), .5, .25)                                  # the gust takes the hat
walk(['F6', 'D7'], 0, g=.5, comp=False, drums=False)
for k in (1, 3, 5, 7):
    snap(bt(k))
vibes(midi('C6'), M(1, 'T_HEAD'), 1.0, .2)                     # hat back on his head
walk(['Gm7', 'C7', 'F6', 'D7', 'Gm7', 'C7', 'F6', 'D7'], 8, snaps=True, dg=.8, stop=39)
melody(M1, 8)
melody(M2, 24, bars=4)
woodblock(M(2, 'T_TAP'))                                       # the tap on the handlebar
horn(['A2', 'C#3', 'E3'], M(3, 'T_SLIP') - .03, .16, .35, 900)        # WOOF
for i, m in enumerate(('C6', 'E6', 'G6')):                  # one, two, three into the slot
    vibes(midi(m), M(3, 'T_SLOTS', i), .6, .22)
celesta(midi('A5'), M(4, 'T_HIT'), 1.0, .22)                  # dropping meets the tip
pizz(midi('F2'), M(4, 'T_LAND'), .35)                          # ...and plops into the planter
horn(['F3', 'A3', 'C4'], T(5, 1.0), .12, .25, 2200)        # pot caught
horn(['Bb1', 'E2'], M(5, 'T_SPLAT'), .25, .35, 700)             # the splat on the pigeon
for i in range(3):                                         # fill into the caper
    snare(bt(36.5 + i * .5), .12 + i * .05)

# B1 shot 6 (beats 39-51): the sausage caper. D minor ostinato, stabs on the chop and the snip.
ost = ['D3', 'A3', 'D4', 'A3', 'F3', 'A3', 'C#4', 'A3']
for bar in range(3):
    for e in range(8):
        pluck(midi(ost[e]), bt(39 + bar * 4 + e / 2), .2, .22)
    for k in range(4):
        bass(midi('D2') if k % 2 == 0 else midi('A1'), bt(39 + bar * 4 + k), BEAT * .6, .5)
        kick(bt(39 + bar * 4 + k), .22 if k % 2 == 0 else .1)
        if k in (1, 3):
            snare(bt(39 + bar * 4 + k), .12)
roll(T(6, 2.3), M(6, 'T_C1') - .02, .03, .2)                       # the zoom in, the wind-up
horn(['D3', 'F3', 'A3', 'C#4'], M(6, 'T_C1'), .14, .42, 3000)   # chop
horn(['D4', 'F4', 'A4'], M(6, 'T_C2'), .07, .38, 3500)       # snip...
horn(['D4', 'F4', 'A4', 'D5'], M(6, 'T_SPEAR'), .12, .4, 3500)   # ...skewered
crash(M(6, 'T_SPEAR'), .14, 1.2)
vibes(midi('F5'), M(6, 'T_SIP') + .1, 1.2, .15)                     # a sip

# B2 shot 7 (beats 51-60): the cat, soft vibes arpeggios and brushes.
for i, (c, arp) in enumerate([('Fmaj7', ['F4', 'A4', 'C5', 'E5']), ('Bbmaj7', ['Bb3', 'D4', 'F4', 'A4'])]):
    for k in range(8):
        vibes(midi(arp[k % 4]), bt(51 + i * 4 + k / 2), .8, .14)
    bass(midi(ROOT_OF[c]), bt(51 + i * 4), BEAT * 2, .45)
    bass(midi(ROOT_OF[c]) + 7, bt(51 + i * 4 + 2), BEAT * 2, .4)
    for k in (1, 3):
        brush(bt(51 + i * 4 + k), .1)
gliss(midi('C6'), midi('F4'), M(7, 'T_JUMP'), .32, .16)        # the cat jumps down

# C  shots 8-13 (beats 60-113): the good deeds. Full swinging combo, vibes melody.
walk(['Fmaj7', 'Dm7', 'Gm7', 'C7', 'Am7', 'D7', 'Gm7', 'C7', 'Fmaj7', 'Dm7', 'Gm7', 'C7', 'Fmaj7'], 60, dg=1.0)
melody(M1, 60, 'vibes', .24)
melody(M2, 76, 'vibes', .24)
melody(M1, 92, 'trumpet', .22)
melody(M2, 108, 'vibes', .22, bars=1)
swell(M(8, 'T_OPEN') + .07, .55, .3)                                 # the umbrella snaps open...
horn(['F3', 'A3', 'C4', 'E4'], M(8, 'T_OPEN') + .07, .3, .38, 3000)   # the snap
gliss(midi('F5'), midi('F6'), M(8, 'T_GUST') - .12, .25, .14)         # ...and the gust runs to the sails
celesta(midi('C6'), M(9, 'T_HOOK'), .8, .2)                    # the crook hooks the rail
gliss(midi('F4'), midi('C6'), M(9, 'T_GO'), .7, .12)         # the glide
kick(M(9, 'T_FALL', 1), .35)                                      # feet down
for c in ('C1', 'C2'):                                     # two coins in the jar
    celesta(midi('E6'), M(10, c, 1), .9, .22)
celesta(midi('A5'), M(11, 'T_FLICK'), .8, .2)                    # glasses flicked on
woodblock(M(12, 'T_TAP'), .22)                                # box tapped back
horn(['C3', 'E3', 'G3'], M(12, 'T_SHUT'), .12, .35, 1800)      # door slammed
kick(M(12, 'T_SHUT'), .35)
horn(['Bb3', 'D4', 'F4'], M(13, 'T_HOOK'), .1, .3, 2500)       # the bag catches on the shaft
gliss(midi('C5'), midi('F4'), M(13, 'T_SLIDE'), .38, .12)        # ...slides back to her

# D  shot 14 (beats 113-121): the taxi. Chromatic build, the big hit on the splash, then a hard stop.
hit = M(14, 'T_BREAK')                                     # the big hit: the water breaks on the canopy
for i, m in enumerate(range(midi('C2'), midi('C2') + 10)):
    bass(m, bt(113 + i * .5), BEAT * .5, .5)
horn(['E3', 'G3', 'Bb3', 'Db4'], bt(114), hit - bt(114) - .05, .16, 1500, a=.8)
roll(bt(115), hit - .03, .03, .32)
horn(['F2', 'F3', 'A3', 'C4', 'F4', 'A4'], hit, .9, .5, 3800)
keys([midi(n) for n in ('F3', 'A3', 'C4', 'F4')], hit, 1.6, .3)
bass(midi('F1'), hit, 1.5, .7)
kick(hit, .6)
crash(hit, .4, 1.8)
cut = T(15, 0)
mix[:, int(cut * SR):int((cut + .03) * SR)] *= np.linspace(1, 0, int(.03 * SR))
mix[:, int((cut + .03) * SR):] = 0                         # everything stops on the cut to the lid

# E  shots 15-16 (beats 121-130): the first drop. Silence, a celesta note for each drop, a soft chord.
celesta(midi('A5'), M(15, 'T1', 1), 1.8, .22)                  # into the sip hole
for i, m in enumerate(('F6', 'C6', 'A5', 'F5')):
    celesta(midi(m), M(15, 'T_BEADS', i), 1.0, .09)                   # beading on the lid
keys([midi(n) for n in ('F3', 'A3', 'C4', 'E4', 'G4')], T(16, .05), 2.6, .07)
celesta(midi('C6'), M(16, 'T_HIT'), 1.4, .16)                  # on his cheek
for k, m in ((128, 'C2'), (129, 'D2'), (129.5, 'E2')):     # the smile, a pickup into the rain
    bass(midi(m), bt(k), BEAT * .6, .5)

# F  shots 17-18 (beats 130-142): the rain. Big band: stabs, full drums, the motif in brass.
crash(bt(130), .3)
walk(['F', 'D7', 'Gm7'], 130, g=.6, comp_g=.2, dg=1.3)
for bar in range(3):
    c = ['F', 'D7', 'Gm7'][bar]
    for off in (0, 1.67):
        horn([midi(n) for n in CH[c]], bt(130 + bar * 4 + off), .16, .3, 3200)
melody(M1, 130, 'brass', .3, bars=3)
horn(['F3', 'A3', 'C4', 'F4'], M(17, 'T_POP'), .12, .45, 4000)   # the red umbrella pops open
crash(M(17, 'T_POP'), .25, 1.2)
swell(M(18, 'T_OPEN', 2), .6, .28)                                 # he opens his own
keys([midi(n) for n in ('F3', 'A3', 'C4', 'E4', 'A4')], M(18, 'T_OPEN', 2), 2.0, .2)

# G  shot 19 (beats 142-end): last word. Tiptoe pizzicato, a plop, the pounce, a button.
tip = ['D4', 'F4', 'A4', 'F4', 'D4', 'F4', 'Bb4', 'F4']
for i in range(10):
    pizz(midi(tip[i % 8]), bt(142 + i * .5), .22)
for k in range(5):
    pizz(midi('D2') if k % 2 == 0 else midi('A1'), bt(142 + k), .35, -.2)
horn(['D2'], M(19, 'T_POOP'), .35, .3, 500)                     # plop, on the cat
for i, m in enumerate(['D4', 'E4', 'F4', 'G4', 'A4', 'Bb4', 'C5', 'D5']):
    pizz(midi(m), M(19, 'T_CLIMB') + i * .05, .2)               # the climb
for i in range(int(.46 / .035)):
    pizz(midi('A4'), M(19, 'T_CROUCH') + .05 + i * .035, .06 + .12 * i / 13)   # the crouch
crash(M(19, 'T_POUNCE') + .1, .35, 1.5)                               # the pounce
horn(['D3', 'F3', 'Ab3', 'B3'], M(19, 'T_POUNCE') + .1, .25, .45, 2000)
gliss(midi('A6'), midi('A4'), M(19, 'T_POUNCE') + .2, .7, .12)        # feathers
button = bt(150)
horn(['F2', 'F3', 'A3', 'C4', 'D4', 'F4'], button, .12, .5, 4000)
kick(button, .5)
snare(button, .25)
bass(midi('F1'), button, .4, .6)

# ---------------- a little room, level, write ----------------
ir_len = int(1.1 * SR)
ir = np.exp(-np.arange(ir_len) / (.28 * SR))
wet = np.stack([fftconvolve(mix[c], ir * rng.standard_normal(ir_len) * .02)[:N] for c in range(2)])
q0, q1 = int(cut * SR), int((cut + .5) * SR)                # no reverb tail of the hit into the silence
wet[:, q0:q1] *= np.concatenate([np.linspace(1, 0, int(.03 * SR)), np.zeros(q1 - q0 - int(.03 * SR))])
out = mix + wet * .6
out = out[:, :int(DUR * SR)]
fade = int(.3 * SR)
out[:, -fade:] *= np.linspace(1, 0, fade)
out /= np.max(np.abs(out)) / .89
pcm = (np.clip(out.T, -1, 1) * 32767).astype('<i2')
dest = ROOT / 'audio' / 'guide.wav'
with wave.open(str(dest), 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print(f'wrote {dest.relative_to(ROOT)} ({DUR:.2f} s, {60 / BEAT:.2f} BPM)')
