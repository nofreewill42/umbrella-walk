#!/usr/bin/env python3
"""Fit the film's cuts to a new piece of music.

  python3 tools/fit_music.py my_score.wav            find its beats and show how each cut would move
  python3 tools/fit_music.py my_score.wav --write    ...and write the new beats and cuts
                                                      (audio/beats.json, from/to in timeline.json)

The film cuts one frame before a beat. With new music the beats fall elsewhere, so each cut
moves to one frame before the beat nearest to where it is now; every shot keeps its length to
within half a beat (~6 frames), and its named moments (seconds from the shot's start) stay put.
Check the shots that got shorter: an action near the end could be cut off (timeline.py shows
the moments). The last shot runs to the end of the music.

The beat finder is simple: onsets from spectral flux, the tempo from their autocorrelation
(near the film's 117 BPM unless --bpm says otherwise), each beat snapped to the nearest onset.
It works on music with a clear pulse. Print its tempo and first beats and compare them with
what you hear (or pass --bpm and --first to set them by hand).
"""
import argparse
import json
import pathlib
import re
import sys
import wave

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from timeline import CUTS, FPS  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent


def read_mono(path):
    with wave.open(str(path)) as w:
        sr, ch, sw = w.getframerate(), w.getnchannels(), w.getsampwidth()
        raw = w.readframes(w.getnframes())
    dt = {2: '<i2', 4: '<i4'}.get(sw)
    if dt is None:
        sys.exit('please give a 16- or 32-bit PCM wav')
    x = np.frombuffer(raw, dt).reshape(-1, ch).mean(1) / (2 ** (8 * sw - 1))
    return x, sr


def onset_envelope(x, sr, lo=0, hi=None, hop=256, n=2048):
    """spectral flux in a frequency band, frames per second"""
    win = np.hanning(n)
    frames = np.lib.stride_tricks.sliding_window_view(np.pad(x, (n // 2, n)), n)[::hop] * win
    f = np.fft.rfftfreq(n, 1 / sr)
    band = (f >= lo) & (f < (hi or sr / 2))
    mag = np.log1p(100 * np.abs(np.fft.rfft(frames, axis=1))[:, band])
    flux = np.maximum(0, np.diff(mag, axis=0, prepend=mag[:1])).sum(1)
    flux -= np.convolve(flux, np.ones(32) / 32, 'same')          # remove the slow trend
    return np.maximum(flux, 0), sr / hop


def comb(env, fr, period, phase, dur):
    """how much onset energy lands on a beat grid (linear interpolation between frames)"""
    t = (phase + np.arange(0, dur - phase, period)) * fr
    return np.interp(t, np.arange(len(env)), env).sum() / max(1, len(t))


def find_beats(x, sr, bpm=None, first=None, prior=117.45):
    dur = len(x) / sr
    full, fr = onset_envelope(x, sr)
    low, _ = onset_envelope(x, sr, 0, 250)                       # the bass and kick carry the beat
    env = low / (low.mean() + 1e-9) + .3 * full / (full.mean() + 1e-9)
    if bpm is None:                                              # rough tempo from the autocorrelation...
        e = env - env.mean()
        ac = np.correlate(e, e, 'full')[len(e) - 1:]
        lags = np.arange(len(ac)) / fr
        ok = (lags > 60 / 190) & (lags < 60 / 55)
        w = np.exp(-.5 * (np.log2((60 / np.maximum(lags, 1e-3)) / prior) / .6) ** 2)   # prefer tempi near the film's
        bpm = 60 / lags[ok][np.argmax((ac * w)[ok])]
        periods = 60 / bpm * np.linspace(.96, 1.04, 161)         # ...refined with the phase on a fine grid
    else:
        periods = [60 / bpm]
    best = (-1, None, None)
    for per in periods:
        phases = [first] if first is not None else np.arange(0, per, .002)
        for ph in phases:
            c = comb(env, fr, per, ph, dur)
            if c > best[0]:
                best = (c, per, ph)
    _, period, first = best
    beats = []
    for t in first + np.arange(0, dur - first, period):         # snap each beat to its onset, if there is one close by
        i0, i1 = int(max(0, (t - .035) * fr)), int(min(len(low), (t + .035) * fr + 1))
        seg = low[i0:i1]
        beats.append(t if len(seg) == 0 or seg.max() < 2 * low.mean() else .5 * t + .5 * (i0 + int(np.argmax(seg))) / fr)
    return np.array(beats), 60 / period, dur


def fit(beats, dur, cuts=CUTS):
    frames_b = np.round(beats * FPS).astype(int) - 1             # one frame before each beat
    new = [0]
    for c in cuts[1:-1]:
        k = frames_b[np.argmin(np.abs(frames_b - c))]
        new.append(int(max(k, new[-1] + 12)))
    new.append(max(int(dur * FPS), new[-1] + 12))                # the last shot runs to the end of the music
    return new


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('wav')
    ap.add_argument('--bpm', type=float, help='the tempo, if the detector gets it wrong')
    ap.add_argument('--first', type=float, help='time of the first beat in seconds, if the detector gets it wrong')
    ap.add_argument('--write', action='store_true', help='write audio/beats.json and the new cuts into timeline.json')
    a = ap.parse_args()
    x, sr = read_mono(a.wav)
    beats, bpm, dur = find_beats(x, sr, a.bpm, a.first)
    new = fit(beats, dur)
    tl = json.loads((ROOT / 'timeline.json').read_text(encoding='utf-8'))
    print(f'{bpm:.2f} BPM, {len(beats)} beats, first at {beats[0]:.3f} s, music {dur:.2f} s (film now {CUTS[-1] / FPS:.2f} s)\n')
    print(' shot                old frames   new frames   change')
    for i, s in enumerate(tl['shots']):
        d = (new[i + 1] - new[i]) - (CUTS[i + 1] - CUTS[i])
        flag = '  <- shorter: check the end of the shot' if d < -3 else ''
        print(f" {s['n']:2d} {s['name']:15s} {CUTS[i]:5d}-{CUTS[i + 1]:<5d}  {new[i]:5d}-{new[i + 1]:<5d}  {d:+4d}{flag}")
    if a.write:
        for i, s in enumerate(tl['shots']):
            s['from'], s['to'] = new[i], new[i + 1]
        txt = json.dumps(tl, indent=1, ensure_ascii=False)
        txt = re.sub(r'\[\n\s+([-\d.,\s]+?)\n\s+\]', lambda m: '[' + ', '.join(q.strip() for q in m.group(1).split(',')) + ']', txt)
        txt = re.sub(r'\{\n\s+"t": ([^\n]+?),\n\s+"what": ("[^"\n]*")\n\s+\}', lambda m: '{"t": ' + m.group(1) + ', "what": ' + m.group(2) + '}', txt)
        (ROOT / 'timeline.json').write_text(txt + '\n', encoding='utf-8')
        (ROOT / 'audio' / 'beats.json').write_text(json.dumps({'beats': [round(float(b), 5) for b in beats], 'dur': dur}))
        print('\nwrote timeline.json and audio/beats.json. Now: preview the shots that changed, re-run probe_motion.py, '
              'guide_track.py (if you still want it) and sfx_track.py --music YOUR.wav, then render.')
