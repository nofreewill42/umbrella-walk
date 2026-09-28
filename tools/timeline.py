#!/usr/bin/env python3
"""The film's timing, read from timeline.json, for the Python tools.

  python3 tools/timeline.py             the whole film as a cue sheet: every shot, its named
                                        moments, and the sounds and music hits tied to each one
  python3 tools/timeline.py --shot 9    one shot (number or name)

timeline.json holds the shot boundaries (in frames) and each shot's named moments (in seconds
from the start of the shot). The picture reads the same file (tools/build.py writes it into the
film script), so a moment changed there moves the drawing, its sound effects (tools/sfx_track.py)
and its music hits (tools/guide_track.py) together.

In the sound tools:  M(9, 'T_HOOK')         film time of shot 9's T_HOOK
                     M(9, 'T_TOSS', 1)      the second value of a moment that is a list
                     T(9, 1.7)              a plain time inside shot 9, not tied to any moment
"""
import argparse
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = json.loads((ROOT / 'timeline.json').read_text(encoding='utf-8'))
FPS = DATA['fps']
SHOTS = DATA['shots']
CUTS = [s['from'] for s in SHOTS] + [SHOTS[-1]['to']]     # frames; shot n runs from CUTS[n-1] up to CUTS[n]
NAMES = [s['name'] for s in SHOTS]
DUR = CUTS[-1] / FPS


def _shot(shot):
    if isinstance(shot, str):
        for s in SHOTS:
            if s['name'].lower() == shot.lower():
                return s
        raise KeyError(f'no shot called {shot!r} in timeline.json')
    return SHOTS[shot - 1]


def start(shot):
    """film time (s) where a shot starts; shot is its number (1-based) or its name"""
    return _shot(shot)['from'] / FPS


def end(shot):
    return _shot(shot)['to'] / FPS


def T(shot, sec=0.0):
    """film time of a plain moment inside a shot"""
    return start(shot) + sec


def moment(shot, name):
    """a named moment, in seconds from the start of its shot (a number or a list)"""
    s = _shot(shot)
    if name not in s['moments']:
        raise KeyError(f"shot {s['n']} ({s['name']}) has no moment {name!r}; it has {', '.join(s['moments'])}")
    return s['moments'][name]['t']


def M(shot, name, i=0):
    """film time of a named moment (i picks one value when the moment is a list)"""
    v = moment(shot, name)
    return start(shot) + (v[i] if isinstance(v, list) else v)


def shot_at(t):
    """the shot (1-based) playing at film time t"""
    f = t * FPS
    for s in SHOTS:
        if f < s['to']:
            return s['n']
    return SHOTS[-1]['n']


def space(shot):
    return _shot(shot)['space']


def _cues():
    """lines in the sound tools that hang on a named moment: {(shot, name): [(file, text), ...]}"""
    out = {}
    for f in ('sfx_track.py', 'guide_track.py'):
        in_doc = False
        for line in (ROOT / 'tools' / f).read_text(encoding='utf-8').splitlines():
            if line.count('"""') % 2:
                in_doc = not in_doc
                continue
            code = line.split('#', 1)[0]
            if in_doc or not code.strip():
                continue
            for m in re.finditer(r"\bM\((\d+), '(\w+)'", code):
                note = line.split('#', 1)[1].strip() if '#' in line else line.strip()
                out.setdefault((int(m.group(1)), m.group(2)), []).append((f.replace('_track.py', ''), note))
    return out


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--shot', help='only this shot (number or name)')
    a = ap.parse_args()
    cues = _cues()
    src = {}
    for f in sorted((ROOT / 'src').glob('s*.js')):
        for m in re.finditer(r"shot\('([^']+)'", f.read_text(encoding='utf-8')):
            src[m.group(1)] = f'src/{f.name}'
    steps = {}
    sp = ROOT / 'audio' / 'steps.json'
    if sp.exists():
        for e in json.loads(sp.read_text())['steps']:
            steps.setdefault(e['shot'], {}).setdefault(e['who'], 0)
            steps[e['shot']][e['who']] += 1
    for s in SHOTS:
        if a.shot and not (a.shot == str(s['n']) or a.shot.lower() == s['name'].lower()):
            continue
        t0, t1 = s['from'] / FPS, s['to'] / FPS
        print(f"\n{s['n']:2d}  {s['name'].upper()}   {t0:6.2f}-{t1:.2f} s  (frames {s['from']}-{s['to'] - 1}, {t1 - t0:.2f} s, {s['space']})")
        print(f"    {s['summary']}")
        st = steps.get(s['n'])
        print(f"    drawn in {src.get(s['name'], '?')}; footsteps: " + (', '.join(f'{w} {c}' for w, c in st.items()) if st else 'none'))
        for k, m in s['moments'].items():
            v = m['t']
            vs = ', '.join(f'{x:g}' for x in v) if isinstance(v, list) else f'{v:g}'
            print(f"    {k:9s} {vs:22s} {m['what']}")
            for f, note in cues.get((s['n'], k), []):
                print(f"    {'':9s} {'':22s}   {f:5s} -> {note}")
