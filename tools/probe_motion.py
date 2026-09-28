#!/usr/bin/env python3
"""Find every footfall in the film, from the drawings themselves.

  python3 tools/probe_motion.py        -> audio/steps.json

It runs the film frame by frame in headless Chromium with the character rigs wrapped, records
where each foot is (world height and screen position) whenever a character is drawn, and
reports the moments a foot comes down onto the ground. tools/sfx_track.py puts a footstep on
each one, panned to where the foot is on screen and as loud as the character is close. Re-run
it after changing any walk, run or hop.
"""
import json
import pathlib
import subprocess
import sys

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
FPS = 24

PROBE = r"""
(() => {
  window.__rec = [];
  const tf = (ctx, x, y) => { const m = ctx.getTransform(); return [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f, Math.hypot(m.a, m.b)]; };
  const low = pts => pts.reduce((b, q) => q[1] < b[1] ? q : b, pts[0]);
  const wrap = (name, fn, who, feet) => {
    const orig = window[name];
    window[name] = function (ctx, a, b) {
      const r = orig.apply(this, arguments);
      const p = b || a;
      if (p && !p.measure) {
        try { window.__rec.push({ who: who(a, b), feet: feet(ctx, a, b) }); } catch (e) { }
      }
      return r;
    };
  };
  const castName = sp => Object.keys(CAST).find(k => CAST[k] === sp) || 'person';
  wrap('heroSide', heroSide, () => 'hero', (ctx, p) => {
    const o = window.__origHero(ctx, Object.assign({}, p, { measure: 1 }));
    return o.L.map(l => { const q = low(l.boot); const s = tf(ctx, q[0], q[1]); return { y: q[1], x: q[0], sx: s[0], sy: s[1], k: s[2], ground: p.hipY == null ? (p.y || 0) : null, hx: o.Hp[0] }; });
  });
  wrap('personSide', personSide, (sp) => castName(sp), (ctx, sp, p) => {
    const o = window.__origPerson(ctx, sp, Object.assign({}, p, { measure: 1 }));
    return o.L.map(l => { const q = low(l.shoe); const s = tf(ctx, q[0], q[1]); return { y: q[1], x: q[0], sx: s[0], sy: s[1], k: s[2], ground: p.hipY == null ? (p.y || 0) : null, hx: o.Hp[0] }; });
  });
  wrap('heroBack', heroBack, () => 'heroBack', (ctx, p) => {
    const ph = p.phase || 0, w = p.walk || 0, x = p.x || 0, y = p.y || 0;
    return [-1, 1].map((s, i) => { const lift = w ? Math.max(0, Math.sin(2 * Math.PI * (ph + i * .5))) * .1 : 0; const sc = tf(ctx, x + s * .09, y + lift);
      return { y: y + lift, x: x + s * .09, sx: sc[0], sy: sc[1], k: sc[2], ground: y, hx: x }; });
  });
})();
"""


def probe(frames):
    js = (ROOT / 'dist' / 'film.js').read_text(encoding='utf-8')
    # the probe needs the rigs' measure passes, and the rigs must return the leg geometry
    js = js.replace('const out = { Hp, Sh, f };', 'const out = { Hp, Sh, f, L };')
    html = "<html><body><canvas id=c width=1920 height=1080></canvas><script>" + js + "</script></body></html>"
    rec = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        page = b.new_page()
        errs = []
        page.on('pageerror', lambda e: errs.append(str(e)))
        page.set_content(html)
        page.evaluate("window.__origHero = heroSide; window.__origPerson = personSide; 0")
        page.evaluate(PROBE)
        for i in frames:
            r = page.evaluate("t=>{window.__rec=[];FILM.renderFrame(document.getElementById('c').getContext('2d'),t);return window.__rec}", i / FPS)
            rec.append(r)
        b.close()
    if errs:
        print('page errors:', errs[:3])
    return rec


def contacts(rec, cuts):
    """a foot lands when it comes down to the ground after having been lifted"""
    tracks = {}
    for fi, calls in enumerate(rec):
        seen = {}
        shot = next(s for s in range(len(cuts) - 1) if cuts[s] <= fi < cuts[s + 1]) + 1
        for c in calls:
            n = seen.get(c['who'], 0)
            seen[c['who']] = n + 1
            key = (shot, c['who'], n)
            tracks.setdefault(key, {})[fi] = c['feet']
    events = []
    for (_, who, n), fr in tracks.items():
        frames = sorted(fr)
        # ground: the rig's own floor when it has one, else the lowest a foot gets in this run of frames
        for foot in (0, 1):
            floor = min(q[foot]['y'] for q in fr.values())
            up = False
            prev = None
            for fi in frames:
                f = fr[fi][foot]
                shot = next(s for s in range(len(cuts) - 1) if cuts[s] <= fi < cuts[s + 1]) + 1
                g = f['ground'] if f['ground'] is not None else floor
                h = f['y'] - g
                if prev is not None and prev[0] != fi - 1:
                    up = False                   # a gap (another shot): start again
                if h > .022:
                    up = True
                elif up and h < .01 and prev is not None and prev[0] == fi - 1:
                    ph = prev[1]
                    a = (ph - .01) / max(ph - h, 1e-6)          # sub-frame: where it crossed 1 cm
                    t = (fi - 1 + min(1, max(0, a))) / FPS
                    vx = (f['hx'] - fr[prev[0]][foot]['hx']) * FPS
                    events.append({'t': round(t, 4), 'shot': shot, 'who': who, 'n': n, 'foot': foot,
                                   'pan': round(max(-1, min(1, (f['sx'] - 960) / 960)), 3),
                                   'scale': round(f['k'], 1), 'drop': round((ph - h) * FPS, 3), 'speed': round(abs(vx), 2)})
                    up = False
                prev = (fi, h)
    # a swinging foot can brush the ground just before it lands: of two touches of the same foot
    # less than 0.2 s apart, only the later one is the footfall
    events.sort(key=lambda e: e['t'])
    keep = []
    for i, e in enumerate(events):
        nxt = next((q for q in events[i + 1:] if (q['shot'], q['who'], q['n'], q['foot']) == (e['shot'], e['who'], e['n'], e['foot'])), None)
        if nxt is None or nxt['t'] - e['t'] > .2:
            keep.append(e)
    return keep


if __name__ == '__main__':
    subprocess.run([sys.executable, str(ROOT / 'tools' / 'build.py')], check=True)
    from timeline import CUTS as cuts
    rec = probe(range(cuts[-1]))
    ev = contacts(rec, cuts)
    (ROOT / 'audio' / 'steps.json').write_text(json.dumps({'fps': FPS, 'steps': ev}, indent=0))
    by = {}
    for e in ev:
        by.setdefault((e['shot'], e['who']), 0)
        by[(e['shot'], e['who'])] += 1
    print(f'{len(ev)} footfalls ->', ', '.join(f'S{s} {w}:{c}' for (s, w), c in sorted(by.items())))
