#!/usr/bin/env python3
"""Build the studio: the film as an editable, annotatable set of actors, events and sounds,
in one self-contained HTML page.

  python3 tools/build_studio.py              -> out/studio.html
  python3 tools/build_studio.py --ui         only the studio's own code changed: reuse the last scan and sounds

What goes into the page:
- the film itself (dist/film.js) and the studio's instrumentation (studio/instrument.js),
  so every frame is drawn live and every actor can be picked and re-posed;
- a scan of every frame: which actors appear in which shot, and which actors take part in
  each named moment of timeline.json;
- every sound of the effects track as its own clip, with its share of the room reverb, plus
  the guide music, in one compressed audio sprite; with each clip, the line of
  tools/sfx_track.py that placed it and the moment it hangs on;
- the studio UI (studio/*.js, studio/style.css, studio/index.html).

Each build is a *checkpoint*: the page records the git commit it was built from, and the
changes people make in the studio (poses, timing, sound edits, notes, drawings, uploads)
are exported against it for an agent to implement.
"""
import base64
import datetime
import json
import pathlib
import re
import runpy
import subprocess
import sys
import tempfile
import wave

import numpy as np
from scipy.signal import fftconvolve, resample_poly

ROOT = pathlib.Path(__file__).resolve().parent.parent
TOOLS = ROOT / 'tools'
sys.path.insert(0, str(TOOLS))
from build import build  # noqa: E402
from timeline import DATA as TL, CUTS, FPS  # noqa: E402

SR = 44100
OUT_SR = 48000

NICE = {
    'hero': 'The man', 'dandy': 'The gentleman', 'scootKid': 'Scooter kid', 'postman': 'Postman', 'reader': 'Bench reader',
    'butcher': 'Butcher', 'catGirl': 'Girl', 'pondBoy': 'Pond boy', 'pondGirl': 'Pond girl', 'worker': 'Site worker',
    'iceKid': 'Ice-cream kid', 'vendor': 'Ice-cream seller', 'painter': 'Painter', 'driver': 'Van driver', 'thief': 'Thief',
    'lady': 'Old lady', 'b1': 'Bystander in a suit', 'b2': 'Bystander 2', 'b3': 'Bystander 3', 'b4': 'Bystander 4',
    'pigeon': 'Pigeon', 'bulldog': 'Bulldog', 'cat': 'Cat', 'gull': 'Gull', 'camera': 'Camera',
    'tophat': 'Top hat', 'scooter': 'Scooter', 'letter': 'Letter', 'geraniumPot': 'Flowerpot', 'sausageChain': 'Sausage chain',
    'sailboat': 'Toy boat', 'cone': 'Ice-cream cone', 'scoop': 'Scoop', 'handbag': 'Handbag', 'taxi': 'Taxi', 'van': 'Van',
    'box': 'Box', 'easel': 'Easel', 'canvasPainting': 'Canvas', 'canvasLondon': 'The painting', 'iceCart': 'Ice-cream cart',
    'dropping': 'Dropping', 'drawUmbrella': 'Umbrella', 'drawCup': 'Coffee cup', 'umbrellaFaceOn': 'Umbrella (face-on)',
    'cone_traffic': 'Traffic cone', 'skyFill': 'Sky', 'stoneWall': 'Stone wall', 'brickWall': 'Brick wall', 'sashWindow': 'Window',
    'door': 'Door', 'railings': 'Railings', 'lamppost': 'Lamppost', 'phoneBox': 'Phone box', 'pavement': 'Pavement', 'kerb': 'Kerb',
    'road': 'Road', 'tree': 'Tree', 'bench': 'Bench', 'planterTree': 'Planter tree', 'distantCity': 'Distant city',
    'parliament': 'Parliament', 'puddle': 'Puddle', 'streetBack': 'Street', 'streetTree': 'Street tree', 'windStreaks': 'Gust',
}

# which actor makes each kind of sound (best guesses; the studio shows sounds under their moments too)
MODEL_ACTOR = {
    'meow': 'cat', 'purr': 'cat', 'hiss': 'cat', 'lap': 'cat', 'bark2': 'bulldog', 'growl': 'bulldog', 'paws': 'bulldog',
    'coo': 'pigeon', 'squawk': 'pigeon', 'takeoff': 'pigeon', 'slurp': 'hero', 'sip': 'hero', 'kids_cheer': 'pondGirl',
    'clap': 'b4', 'car_pass': 'taxi', 'engine_start': 'van', 'engine': 'van', 'sliding_door': 'van', 'door_slam': 'driver',
    'scooter': 'scooter', 'bell': 'parliament', 'letterbox': 'door', 'paper': 'letter', 'umbrella_open': 'hero',
    'umbrella_close': 'hero', 'coin_flick': 'hero', 'coin_in_jar': 'iceCart', 'clang': 'hero', 'rail_slide': 'hero',
    'whoosh': 'hero', 'tick': 'hero', 'knock': 'hero', 'sniffs': 'hero', 'chop': 'butcher', 'squish': 'sausageChain',
    'splat': 'dropping', 'plop': 'dropping', 'ceramic': 'geraniumPot', 'scrape': 'geraniumPot', 'leaves': 'tree',
    'patter': 'hero', 'drip': 'drawCup', 'lid_tap': 'drawCup', 'splash': 'taxi', 'rain': None, 'thunder': None,
    'rustle': 'hero', 'wind': 'windStreaks', 'traffic': None, 'birdsong': None,
}
SHOT_ACTOR = {   # (shot, model) exceptions
    (1, 'knock'): 'tophat', (1, 'plop'): 'tophat', (1, 'scrape'): 'tophat', (2, 'tick'): 'scooter', (2, 'scrape'): 'scooter',
    (2, 'rustle'): 'scootKid', (3, 'rustle'): 'postman', (5, 'rustle'): 'reader', (5, 'splat'): 'dropping', (5, 'takeoff'): 'pigeon',
    (6, 'rail_slide'): 'hero', (6, 'coin_flick'): 'hero', (7, 'sniffs'): 'cat', (7, 'splat'): 'catGirl', (7, 'plop'): 'cat',
    (7, 'whoosh'): 'cat', (8, 'splash'): 'sailboat', (8, 'umbrella_open'): 'hero', (10, 'splat'): 'iceKid', (10, 'paws'): 'cat',
    (10, 'squish'): 'vendor', (11, 'rustle'): 'painter', (11, 'tick'): 'hero', (12, 'tick'): 'hero', (12, 'scrape'): 'van',
    (12, 'whoosh'): 'van', (13, 'plop'): 'handbag', (13, 'rail_slide'): 'handbag', (13, 'rustle'): 'thief', (13, 'whoosh'): 'thief',
    (14, 'rain'): 'hero', (17, 'umbrella_open'): 'b2', (17, 'tick'): 'b2', (17, 'rustle'): 'b3', (17, 'patter'): 'b2',
    (19, 'whoosh'): 'cat', (19, 'splat'): 'cat', (19, 'scrape'): 'cat', (19, 'hiss'): 'cat', (19, 'leaves'): 'tree',
}
CATEGORY = {
    'voice': ['meow', 'purr', 'hiss', 'bark2', 'growl', 'coo', 'squawk', 'kids_cheer'],
    'air': ['whoosh', 'takeoff', 'wind'],
    'contact': ['knock', 'tick', 'clang', 'ceramic', 'chop', 'splat', 'plop', 'letterbox', 'coin_flick', 'coin_in_jar', 'rail_slide',
                'scrape', 'squish', 'paper', 'door_slam', 'sliding_door', 'umbrella_open', 'umbrella_close', 'clap'],
    'foley': ['slurp', 'sip', 'lap', 'sniffs', 'rustle', 'footstep', 'paws'],
    'water': ['splash', 'drip', 'lid_tap', 'rain', 'canopy', 'patter'],
    'machine': ['car_pass', 'engine', 'engine_start', 'scooter'],
    'ambience': ['traffic', 'leaves', 'birdsong', 'thunder', 'bell', 'bed'],
}
CAT_OF = {m: c for c, ms in CATEGORY.items() for m in ms}


def git(*a):
    try:
        return subprocess.run(['git', *a], cwd=ROOT, capture_output=True, text=True, check=True).stdout.strip()
    except Exception:
        return ''


# ---------------------------------------------------------------- the actor scan
SCAN = r"""
(() => {
  INST.install(); INST.S.scan = true;
  const c = document.getElementById('c'), ctx = c.getContext('2d'), k = c.width / 1920;
  const st = ctx.setTransform.bind(ctx);                          // draw the film smaller, it's only a scan
  ctx.setTransform = (a, b, cc, d, e, f) => st(a * k, b * k, cc * k, d * k, e * k, f * k);
  const prev = {};
  window.scanFrame = t => {
    const o = INST.frame(ctx, t), out = [];
    for (const a of o.actors) {
      let act = 0; const p = prev[a.key];
      if (p && a.nums) for (const q in a.nums) if (q in p) act += Math.min(1, Math.abs(a.nums[q] - p[q]));
      prev[a.key] = a.nums || {};
      out.push([a.key, a.fn, a.cat, +act.toFixed(4)]);
    }
    return out;
  };
})();
"""


def scan():
    from playwright.sync_api import sync_playwright
    js = (ROOT / 'dist' / 'film.js').read_text(encoding='utf-8')
    ins = (ROOT / 'studio' / 'instrument.js').read_text(encoding='utf-8')
    html = ("<html><body><canvas id=c width=480 height=270></canvas><script>" + js + "</script><script>" + ins +
            "</script><script>" + SCAN + "</script></body></html>")
    frames = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.set_content(html)
        frames = pg.evaluate(f"() => {{ const r = []; for (let i = 0; i < {CUTS[-1]}; i++) r.push(scanFrame(i / {FPS})); return r; }}")
        b.close()
    if errs:
        raise SystemExit('scan failed: ' + errs[0])
    return frames


def shot_of_frame(f):
    for i in range(len(CUTS) - 1):
        if f < CUTS[i + 1]:
            return i + 1
    return len(CUTS) - 1


def summarise(frames):
    actors = {}
    act = {}                                     # (key, shot) -> list of (frame, activity)
    for f, recs in enumerate(frames):
        s = shot_of_frame(f)
        for key, fn, cat, a in recs:
            A = actors.setdefault(key, {'key': key, 'fn': fn, 'cat': cat, 'name': NICE.get(key.split('#')[0], key.split('#')[0]), 'shots': {}})
            if '#' in key and cat in ('character', 'animal', 'prop'):
                A['name'] = NICE.get(key.split('#')[0], key.split('#')[0]) + ' ' + key.split('#')[1]
            r = A['shots'].setdefault(str(s), [f, f])
            r[1] = f
            act.setdefault((key, s), []).append((f, a))
    return actors, act


def event_actors(actors, act, sound_actors):
    """who takes part in each named moment: whoever moves unusually around it, plus whoever makes its sound"""
    out = {}
    for sh in TL['shots']:
        s = sh['n']
        for name, m in sh['moments'].items():
            v = m['t']
            t0, t1 = (v[0], v[-1]) if isinstance(v, list) else (v, v)
            f0, f1 = sh['from'] + int((t0 - .15) * FPS), sh['from'] + int((t1 + .15) * FPS)
            who = []
            for (key, ss), series in act.items():
                if ss != s or actors[key]['cat'] in ('set', 'camera', 'fx'):
                    continue
                vals = np.array([a for _, a in series])
                win = np.array([a for f, a in series if f0 <= f <= f1])
                if not len(win):
                    continue
                med = np.median(vals) + 1e-4
                if win.max() > max(.03, 1.8 * med):
                    who.append((float(win.max() / med), key))
            keys = [k for _, k in sorted(who, reverse=True)[:4]]
            for k in sound_actors.get((s, name), []):
                if k and k not in keys and str(s) in actors.get(k, {}).get('shots', {}):
                    keys.append(k)
            out[f'{s}:{name}'] = keys
    return out


# ---------------------------------------------------------------- the sounds
def read_wav(path):
    with wave.open(str(path)) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), '<i2').reshape(-1, w.getnchannels()).T.astype(float) / 32768
    return x if x.shape[0] == 2 else np.vstack([x, x])


def sounds():
    g = runpy.run_path(str(TOOLS / 'sfx_track.py'), init_globals={'LOG': []}, run_name='studio')
    log, out, IRS = g['LOG'], g['out'], g['IRS']
    k_norm = .5 / (np.max(np.abs(out)) + 1e-9) * 1.25          # the effects' level in the guide mix
    src = (TOOLS / 'sfx_track.py').read_text(encoding='utf-8').splitlines()
    steps = json.loads((ROOT / 'audio' / 'steps.json').read_text())['steps']
    clips, meta = [], []
    for n, r in enumerate(log):
        y = r['y']
        wet = np.vstack([fftconvolve(y[c] * r['send'], IRS[r['space']][c]) for c in (0, 1)])
        clip = np.zeros_like(wet)
        clip[:, :y.shape[1]] += y
        clip += wet
        env = np.max(np.abs(clip), 0)
        thr = env.max() * 10 ** (-60 / 20)
        last = np.nonzero(env > thr)[0]
        clip = clip[:, :last[-1] + 1 if len(last) else 1] * k_norm
        line = src[r['line'] - 1] if r['line'] else ''
        code = line.split('  #')[0].strip()
        model = None
        mm = re.search(r'\b(?:W|A)\.(\w+)\(', code)
        if mm:
            model = mm.group(1)
        else:                                        # put(spin, ...): a sound built on the line before
            vm = re.match(r'put\((?:np\.vstack\(\[)?(\w+)', code)
            model = {'spin': 'scrape', 'wake': 'splash', 'rattle': 'scrape', 'sc': 'scooter', 'rev': 'engine'}.get(vm.group(1)) if vm else None
        for h in ('sip', 'tick', 'patter', 'bed'):
            if re.match(rf'\s*{h}\(', line):
                model = model if h == 'bed' and model else h
        if code.startswith('bed('):
            kind = 'bed'
        elif 'W.footstep(wet=wet' in code:
            kind = 'step'
        else:
            kind = 'event'
        t = r['i'] / SR
        comment = line.split('#', 1)[1].strip() if '#' in line else ''
        ref = re.search(r"\bM\((\d+), '(\w+)'(?:, (\d+))?\)", code)
        shot = shot_of_frame(int(t * FPS + 1e-6))
        actor = None
        if kind == 'step':
            e = min(steps, key=lambda e: abs(e['t'] - t))
            actor = 'hero' if e['who'].startswith('hero') else e['who']
            model, comment = 'footstep', f"{NICE.get(actor, actor)}'s footstep (from the drawing)"
            shot = e['shot']
        elif kind == 'bed':
            gm = re.search(r'W\.(\w+)\(', code)
            model = gm.group(1) if gm else 'bed'
            comment = comment or f'ambience: {model}'
        else:
            s_ref = int(ref.group(1)) if ref else shot
            actor = SHOT_ACTOR.get((s_ref, model), MODEL_ACTOR.get(model))
        seed = re.search(r'seed=(\d+)', code)
        meta.append({
            'id': f's{n}', 't': round(t, 4), 'dur': round(clip.shape[1] / SR, 4), 'kind': kind, 'model': model or '?',
            'cat': 'ambience' if kind == 'bed' else CAT_OF.get(model, 'contact'), 'shot': shot, 'actor': actor,
            'moment': [int(ref.group(1)), ref.group(2), int(ref.group(3) or 0)] if ref else None,
            'offset': round(t - (TL['shots'][int(ref.group(1)) - 1]['from'] / FPS + _mval(int(ref.group(1)), ref.group(2), int(ref.group(3) or 0))), 4) if ref else None,
            'line': r['line'], 'code': code[:220], 'comment': comment, 'L': r['L'], 'pan': round(float(r['pan']), 3) if np.isscalar(r['pan']) else 0,
            'seed': int(seed.group(1)) if seed else None, 'space': r['space'],
        })
        clips.append(clip)
    return clips, meta


def _mval(shot, name, i):
    v = TL['shots'][shot - 1]['moments'][name]['t']
    return v[i] if isinstance(v, list) else v


def sprite(clips, meta):
    """the guide music first, then every clip, back to back, as one Opus file"""
    music = read_wav(ROOT / 'audio' / 'guide.wav') * .55
    parts, pos = [music], music.shape[1]
    gap = int(.05 * SR)
    for c, m in zip(clips, meta):
        pos += gap
        m['at'] = round(pos / SR, 5)
        parts += [np.zeros((2, gap)), c]
        pos += c.shape[1]
    x = np.hstack(parts)
    x = resample_poly(x, OUT_SR // 300, SR // 300, axis=1)
    x = np.clip(x, -1, 1)
    with tempfile.TemporaryDirectory() as td:
        wv, op = pathlib.Path(td) / 's.wav', pathlib.Path(td) / 's.webm'
        with wave.open(str(wv), 'wb') as w:
            w.setnchannels(2)
            w.setsampwidth(2)
            w.setframerate(OUT_SR)
            w.writeframes((x.T * 32767).astype('<i2').tobytes())
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(wv), '-c:a', 'libopus', '-b:a', '48k', '-application', 'audio', str(op)], check=True)
        data = op.read_bytes()
    return data, {'music': [0, round(music.shape[1] / SR, 4)], 'seconds': round(x.shape[1] / OUT_SR, 2)}


# ---------------------------------------------------------------- assemble
def main():
    build(quiet=True)
    cache = ROOT / 'out' / '.studio'
    if '--ui' in sys.argv and (cache / 'data.json').exists():
        data = json.loads((cache / 'data.json').read_text())
        audio = (cache / 'audio.webm').read_bytes()
        return assemble(data, audio)
    print('scanning every frame for actors ...', flush=True)
    frames = scan()
    actors, act = summarise(frames)
    print(f'  {len(actors)} actors')
    print('collecting every sound ...', flush=True)
    clips, meta = sounds()
    sound_actors = {}
    for m in meta:
        if m['moment'] and m['actor']:
            sound_actors.setdefault((m['moment'][0], m['moment'][1]), []).append(m['actor'])
    ev = event_actors(actors, act, sound_actors)
    audio, spr = sprite(clips, meta)
    print(f'  {len(meta)} clips, audio sprite {len(audio) / 1e6:.1f} MB')
    commit = git('rev-parse', '--short', 'HEAD')
    data = {
        'checkpoint': {'commit': commit, 'dirty': bool(git('status', '--porcelain', '--', 'src', 'tools', 'timeline.json')),
                       'built': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M UTC'),
                       'repo': 'https://github.com/nofreewill42/umbrella-walk'},
        'timeline': TL, 'beats': json.loads((ROOT / 'audio' / 'beats.json').read_text())['beats'],
        'actors': actors, 'eventActors': ev, 'sounds': meta, 'sprite': spr,
    }
    cache.mkdir(parents=True, exist_ok=True)
    (cache / 'data.json').write_text(json.dumps(data))
    (cache / 'audio.webm').write_bytes(audio)
    assemble(data, audio)


def assemble(data, audio):
    d = ROOT / 'studio'
    page = (d / 'index.html').read_text(encoding='utf-8')
    js_json = json.dumps(data, separators=(',', ':')).replace('</', '<\\/')
    film = (ROOT / 'dist' / 'film.js').read_text(encoding='utf-8')
    parts = {
        '/*STYLE*/': (d / 'style.css').read_text(encoding='utf-8'),
        '/*FILM*/': film.replace('</script', '<\\/script'),
        '/*INSTRUMENT*/': (d / 'instrument.js').read_text(encoding='utf-8'),
        '/*DATA*/': js_json,
        '/*AUDIO*/': base64.b64encode(audio).decode(),
        '/*APP*/': '\n'.join((d / f).read_text(encoding='utf-8') for f in ('store.js', 'audio.js', 'app.js')),
    }
    for k, v in parts.items():
        assert k in page, k
        page = page.replace(k, v)
    out = ROOT / 'out' / 'studio.html'
    out.parent.mkdir(exist_ok=True)
    out.write_text(page, encoding='utf-8')
    print(f"wrote {out.relative_to(ROOT)} ({out.stat().st_size / 1e6:.1f} MB, checkpoint {data['checkpoint']['commit']})")


if __name__ == '__main__':
    main()
