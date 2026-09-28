#!/usr/bin/env python3
"""A machine ear, for agents that can't listen: an AudioSet sound classifier (527 everyday sound
classes, e.g. "Meow", "Rain", "Car passing by", "Music") tells you what a sound sounds like.

  python3 tools/ear.py out/sounds/meow.wav             what it hears in a wav file
  python3 tools/ear.py out/sounds/meow.wav --room      ...played in a small room, as the models were tuned
  python3 tools/ear.py --shot 7 --from 3.4 --to 4.5     a stretch of the film's effects (audio/sfx.wav)
  python3 tools/ear.py --shot 7 --mix guide_sfx         ...or of another track in audio/
  python3 tools/ear.py --model growl --takes 12 --want Growling Dog
                                                        render 12 takes of a sound model and name the
                                                        one it recognises best (use it as seed=N)
  python3 tools/ear.py --model meow d=1.1 f0b=700 --want Meow

The first run downloads the classifier (CED-mini, ~46 MB, from the sherpa-onnx releases on GitHub)
into ~/.cache/umbrella-walk/ and needs `pip install sherpa-onnx`. It is a rough ear: it judges
clean single sounds well, and gets confused when many sounds overlap. Treat a high score as "reads as
that", not as proof it sounds good, and anything it calls Music or Synthesizer as a warning.
"""
import argparse
import os
import pathlib
import sys
import tarfile
import urllib.request
import wave

import numpy as np
from scipy.signal import resample_poly

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = 'https://github.com/k2-fsa/sherpa-onnx/releases/download/audio-tagging-models/sherpa-onnx-ced-mini-audio-tagging-2024-04-19.tar.bz2'
CACHE = pathlib.Path(os.environ.get('UW_EAR_DIR', pathlib.Path.home() / '.cache' / 'umbrella-walk'))
WARN = ['Music', 'Synthesizer', 'Musical instrument', 'Electronic music', 'Sine wave', 'Beep, bleep', 'Drum machine']
_tagger = None


def tagger():
    global _tagger
    if _tagger:
        return _tagger
    try:
        import sherpa_onnx
    except ImportError:
        sys.exit('the ear needs sherpa-onnx: pip install sherpa-onnx')
    d = CACHE / 'sherpa-onnx-ced-mini-audio-tagging-2024-04-19'
    if not (d / 'model.onnx').exists():
        CACHE.mkdir(parents=True, exist_ok=True)
        tb = CACHE / 'ced.tar.bz2'
        print(f'downloading the classifier to {CACHE} ...', file=sys.stderr)
        urllib.request.urlretrieve(URL, tb)
        with tarfile.open(tb) as t:
            t.extractall(CACHE)
        tb.unlink()
    cfg = sherpa_onnx.AudioTaggingConfig(model=sherpa_onnx.AudioTaggingModelConfig(ced=str(d / 'model.onnx'), num_threads=2),
                                         labels=str(d / 'class_labels_indices.csv'), top_k=527)
    _tagger = sherpa_onnx.AudioTagging(cfg)
    return _tagger


def hear(x, sr=44100):
    """{class: probability} for a mono or stereo signal"""
    x = np.asarray(x, float)
    if x.ndim == 2:
        x = x.mean(0)
    x = x / (np.max(np.abs(x)) + 1e-9) * .5
    y = resample_poly(x, 16000, sr).astype(np.float32)
    y = np.pad(y, (1600, max(0, 16000 - len(y)) + 1600))
    t = tagger()
    s = t.create_stream()
    s.accept_waveform(sample_rate=16000, waveform=y)
    return {e.name: e.prob for e in t.compute(s)}


def in_a_room(x):
    """a single sound as a microphone would catch it: a small room and a quiet noise floor.
    The models were tuned this way; bone-dry synthetic sound confuses the classifier."""
    import sfxdsp as D
    x = np.asarray(x, float)
    if x.ndim == 2:
        x = x.mean(0)
    y = D.place(x, D.room_ir(.35, rng=np.random.default_rng(5)), .2)
    y = np.pad(y, (int(.15 * D.SR), int(.25 * D.SR)))
    return y + np.random.default_rng(1).standard_normal(len(y)) * .003 * np.max(np.abs(y))


def read(path):
    with wave.open(str(path)) as w:
        sr, ch = w.getframerate(), w.getnchannels()
        x = np.frombuffer(w.readframes(w.getnframes()), '<i2').reshape(-1, ch).T.astype(float) / 32768
    return x, sr


def show(p, want=(), k=6):
    top = sorted(p.items(), key=lambda kv: -kv[1])[:k]
    print('  hears: ' + ', '.join(f'{n} {v:.2f}' for n, v in top))
    if want:
        print('  wanted: ' + ', '.join(f'{n} {p.get(n, 0):.2f}' for n in want))
    w = [(n, p.get(n, 0)) for n in WARN if p.get(n, 0) > .2]
    if w:
        print('  warning, it hears: ' + ', '.join(f'{n} {v:.2f}' for n, v in w))


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('wav', nargs='?', help='a wav file to listen to')
    ap.add_argument('settings', nargs='*', help='with --model: name=value settings')
    ap.add_argument('--shot', type=int, help='listen to this shot of a film track')
    ap.add_argument('--mix', default='sfx', help='which track in audio/ for --shot (sfx, guide_sfx, guide)')
    ap.add_argument('--from', dest='t0', type=float, default=0, help='seconds into the shot (or file)')
    ap.add_argument('--to', dest='t1', type=float, help='seconds into the shot (or file)')
    ap.add_argument('--model', help='a sound model from tools/sound_lab.py --list')
    ap.add_argument('--takes', type=int, default=1)
    ap.add_argument('--want', nargs='+', default=[], help='class names you want it to hear')
    ap.add_argument('--room', action='store_true', help='play a dry wav file in a small room first')
    a = ap.parse_args()

    if a.model:
        from sound_lab import models, value
        M = models()
        if a.model not in M:
            sys.exit(f'no sound model {a.model!r} (see tools/sound_lab.py --list)')
        settings = ([a.wav] if a.wav else []) + a.settings
        kw = {k: value(v) for k, v in (s.split('=', 1) for s in settings)}
        best = None
        for seed in range(1, a.takes + 1):
            p = hear(in_a_room(M[a.model][1](seed=seed, **kw)))
            score = (np.mean([p.get(n, 0) for n in a.want]) if a.want else 0) - max(p.get(n, 0) for n in WARN)
            print(f'seed {seed}:')
            show(p, a.want, 4)
            if best is None or score > best[0]:
                best = (score, seed)
        if a.takes > 1:
            print(f'\nbest take: seed={best[1]}')
        sys.exit(0)

    if a.shot:
        from timeline import start, end
        x, sr = read(ROOT / 'audio' / f'{a.mix}.wav')
        t0 = start(a.shot) + a.t0
        t1 = start(a.shot) + a.t1 if a.t1 is not None else end(a.shot)
    elif a.wav:
        x, sr = read(a.wav)
        t0, t1 = a.t0, a.t1 if a.t1 is not None else x.shape[1] / sr
    else:
        ap.print_help()
        sys.exit(0)
    print(f'{t0:.2f}-{t1:.2f} s')
    seg = x[:, int(t0 * sr):int(t1 * sr)]
    if a.room:
        from scipy.signal import resample_poly as rp
        seg = in_a_room(rp(seg.mean(0), 44100, sr) if sr != 44100 else seg)
        sr = 44100
    show(hear(seg, sr), a.want)
