#!/usr/bin/env python3
"""Concatenate the film sources in src/ into one script, dist/film.js.

The sources share one global scope, so the order matters: core helpers first,
then the hero rig, the cast, props and the shared library, then the three
files of shots, then the timeline in main.js.
"""
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
ORDER = ['core', 'hero', 'cast', 'props', 'lib', 's1', 's2', 's3', 'main']


def build(quiet=False):
    # audio/cuts.json is the one place the shot timing lives; it replaces the CUTS line in core.js
    cuts = json.loads((ROOT / 'audio' / 'cuts.json').read_text())['cuts']
    parts = []
    for name in ORDER:
        path = ROOT / 'src' / f'{name}.js'
        code = path.read_text(encoding='utf-8')
        if name == 'core':
            code, n = re.subn(r'^const CUTS = \[[^\]]*\];', 'const CUTS = ' + json.dumps(cuts) + ';', code, flags=re.M)
            assert n == 1, 'CUTS line not found in src/core.js'
        parts.append(f'// ---- {name}.js ----\n' + code)
    out = ROOT / 'dist' / 'film.js'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text('\n'.join(parts), encoding='utf-8')
    if not quiet:
        print(f'built {out.relative_to(ROOT)} ({sum(len(p) for p in parts):,} chars)')
    return out


if __name__ == '__main__':
    build()
