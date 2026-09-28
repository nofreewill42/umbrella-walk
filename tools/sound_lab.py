#!/usr/bin/env python3
"""Listen to one sound model on its own, and try settings before putting them in the film.

  python3 tools/sound_lab.py --list                      every sound model: what it models, its settings
  python3 tools/sound_lab.py meow                        out/sounds/meow.wav, default settings
  python3 tools/sound_lab.py meow d=1.2 f0b=900          change settings (name=value)
  python3 tools/sound_lab.py growl --takes 5             five takes (seeds 1-5) one after another, to pick one
  python3 tools/sound_lab.py car_pass v=15 dist=1.5      stereo sounds come out stereo

The models live in tools/sfxworld.py (things, weather, vehicles, people) and tools/sfxanimals.py
(voices). Once a setting sounds right, use it where tools/sfx_track.py places that sound, e.g.
put(A.meow(d=1.2, seed=S()), ...), or change the default in the model's signature to change it
everywhere. A take you like is kept with seed=N instead of seed=S().
"""
import argparse
import inspect
import pathlib
import sys
import wave

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import sfxanimals  # noqa: E402
import sfxworld  # noqa: E402
from sfxdsp import SR  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
MODULES = {'animals': sfxanimals, 'world': sfxworld}


def models():
    out = {}
    for mname, mod in MODULES.items():
        for name, f in inspect.getmembers(mod, inspect.isfunction):
            if f.__module__ == mod.__name__ and not name.startswith('_') and 'seed' in inspect.signature(f).parameters:
                out[name] = (mname, f)
    return out


def value(s):
    for cast in (int, float):
        try:
            return cast(s)
        except ValueError:
            pass
    return {'True': True, 'False': False}.get(s, s)


def write(path, y):
    y = np.atleast_2d(y)
    y = y / (np.max(np.abs(y)) + 1e-12) * .7
    if y.shape[0] == 1:
        y = np.vstack([y, y])
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(y.T, -1, 1) * 32767).astype('<i2').tobytes())


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('model', nargs='?', help='the sound model, e.g. meow, rain, car_pass')
    ap.add_argument('settings', nargs='*', help='name=value settings')
    ap.add_argument('--list', action='store_true', help='list every sound model')
    ap.add_argument('--seed', type=int, default=1)
    ap.add_argument('--takes', type=int, default=1, help='render this many takes (seeds) in a row, 0.4 s apart')
    ap.add_argument('--wav', help='output file (default out/sounds/MODEL.wav)')
    a = ap.parse_args()
    M = models()
    if a.list or not a.model:
        for name, (mname, f) in sorted(M.items(), key=lambda kv: (kv[1][0], kv[0])):
            doc = ' '.join((inspect.getdoc(f) or '').split())
            params = ', '.join(f'{k}={v.default!r}' for k, v in inspect.signature(f).parameters.items()
                               if k != 'seed' and v.default is not inspect.Parameter.empty)
            print(f'\n{name}  ({mname})\n    {doc}\n    settings: {params}')
        sys.exit(0)
    if a.model not in M:
        sys.exit(f'no sound model {a.model!r}. Try --list.')
    kw = dict(s.split('=', 1) for s in a.settings)
    kw = {k: value(v) for k, v in kw.items()}
    f = M[a.model][1]
    parts = []
    for i in range(a.takes):
        y = np.atleast_2d(f(seed=a.seed + i, **kw))
        parts += [y, np.zeros((y.shape[0], int(.4 * SR)))]
    ch = max(p.shape[0] for p in parts)
    y = np.hstack([np.vstack([p] * ch) if p.shape[0] < ch else p for p in parts])
    out = pathlib.Path(a.wav) if a.wav else ROOT / 'out' / 'sounds' / f'{a.model}.wav'
    write(out, y)
    seeds = f'seed {a.seed}' if a.takes == 1 else f'seeds {a.seed}-{a.seed + a.takes - 1}'
    print(f'wrote {out} ({y.shape[1] / SR:.2f} s, {seeds})')
