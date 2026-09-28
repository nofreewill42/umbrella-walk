#!/usr/bin/env python3
"""Render The Umbrella Walk.

  python3 tools/render_film.py                  whole film  -> out/umbrella_walk.mp4
  python3 tools/render_film.py --shots 6 9      just shots 6 and 9 -> out/shots/06_butcher.mp4, 09_wet_concrete.mp4
  python3 tools/render_film.py --workers 4      how many shots render at once (default: CPU count, max 6)

If audio/soundtrack.* (wav, mp3, m4a, flac or ogg) exists it is muxed in; otherwise the film is silent.
"""
import argparse
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tools'))
from build import build  # noqa: E402


def fail(msg):
    print('error: ' + msg, file=sys.stderr)
    sys.exit(1)


def check_tools():
    if not shutil.which('ffmpeg'):
        fail('ffmpeg not found. Install it (macOS: brew install ffmpeg, Ubuntu: sudo apt install ffmpeg, Windows: winget install ffmpeg).')
    try:
        import playwright  # noqa: F401
    except ImportError:
        fail('Playwright not found. Run: pip install -r requirements.txt && python3 -m playwright install chromium')


def soundtrack():
    for ext in ('wav', 'mp3', 'm4a', 'flac', 'ogg'):
        p = ROOT / 'audio' / f'soundtrack.{ext}'
        if p.exists():
            return p
    return None


def slug(name):
    return re.sub(r'[^a-z0-9]+', '_', name.lower()).strip('_')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--shots', type=int, nargs='+', help='render only these shots (1-based), each to its own file')
    ap.add_argument('--workers', type=int, default=min(os.cpu_count() or 2, 6))
    ap.add_argument('--out', default=str(ROOT / 'out' / 'umbrella_walk.mp4'), help='output file for the whole film')
    ap.add_argument('--audio', help='use this audio file instead of audio/soundtrack.* (e.g. audio/guide.wav)')
    args = ap.parse_args()

    check_tools()
    build()
    from timeline import CUTS as cuts, NAMES as names
    n = len(cuts) - 1
    shots = args.shots or list(range(1, n + 1))
    bad = [k for k in shots if not 1 <= k <= n]
    if bad:
        fail(f'no such shot: {bad} (there are {n})')

    seg_dir = ROOT / 'out' / ('shots' if args.shots else '.segments')
    seg_dir.mkdir(parents=True, exist_ok=True)
    jobs = [(k, seg_dir / f'{k:02d}_{slug(names[k - 1])}.mp4', cuts[k - 1], cuts[k]) for k in shots]
    print(f'rendering {len(jobs)} shot(s), {sum(b - a for _, _, a, b in jobs)} frames, {args.workers} at a time')
    t0 = time.time()

    def run(job):
        k, out, a, b = job
        r = subprocess.run([sys.executable, str(ROOT / 'tools' / 'render_segment.py'), str(out), str(a), str(b)],
                           capture_output=True, text=True)
        print(f'  shot {k:2d} {names[k - 1]:<13} ' + ('ok' if r.returncode == 0 else 'FAILED') + f'  ({time.time() - t0:.0f}s)', flush=True)
        if r.returncode:
            print(r.stdout + r.stderr, file=sys.stderr)
        return r.returncode == 0

    with ThreadPoolExecutor(max_workers=max(1, args.workers)) as pool:
        results = list(pool.map(run, jobs))
    if not all(results):
        fail('some shots failed to render (see above)')

    if args.shots:
        print('done: ' + ', '.join(str(j[1].relative_to(ROOT)) for j in jobs))
        return

    out = pathlib.Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    lst = seg_dir / 'list.txt'
    lst.write_text(''.join(f"file '{j[1].resolve().as_posix()}'\n" for j in jobs))
    silent = seg_dir / 'film_silent.mp4'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(lst), '-c', 'copy', str(silent)], check=True)
    music = pathlib.Path(args.audio) if args.audio else soundtrack()
    if music and not music.exists():
        fail(f'audio file not found: {music}')
    if music:
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(silent), '-i', str(music), '-map', '0:v:0', '-map', '1:a:0',
                        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', str(out)], check=True)
        print(f'done: {out} ({time.time() - t0:.0f}s, with {music.name})')
    else:
        shutil.copyfile(silent, out)
        print(f'done: {out} ({time.time() - t0:.0f}s, silent: put the music at audio/soundtrack.wav to add sound)')


if __name__ == '__main__':
    main()
