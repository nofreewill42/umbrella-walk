#!/usr/bin/env python3
"""Turn a photographed ink drawing into the film's hero: trace the pen lines, cut them at the joints.

  python3 tools/trace_character.py            art/frog/drawing.jpg -> src/frog_ink.js  (+ out/frog_parts.png to check)

The ink is kept as drawn. The pen strokes become polygons (their exact outline, traced at sub-pixel
precision from the photo); nothing is redrawn or smoothed into a new style. The drawing is cut into:

  pieces  head (with its eyes, pupils and smile kept apart so the eyes can look and blink),
          body (the round belly), hand (the fingers), footL, footR:
          rigid, placed by an anchor point, drawn with a paper fill under the ink;
  tubes   neck, arm, legL, legR: the two parallel pen lines of a limb, straightened along the limb's
          own midline, so src/frog.js can lay them along any bent arm or leg of the skeleton.

Every coordinate below is a pixel of the photo, and only fits this drawing. For another drawing, photograph
it flat, then change PARTS: where the body circle is, rough midlines for the limbs, boxes for the rest.
Needs scikit-image for the sub-pixel tracing (pip install scikit-image).
"""
import json
import math
import pathlib
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageOps
from scipy import ndimage as ndi

try:
    from skimage import measure
except ImportError:
    sys.exit('needs scikit-image: pip install scikit-image')

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'art' / 'frog' / 'drawing.jpg'
OUT = ROOT / 'src' / 'frog_ink.js'

T_INK, BLUR = .42, 1.2          # ink = darker than 42 % against the paper around it, after a 1.2 px blur
SCALE = .00075                  # metres per photo pixel: makes him 1.96 m from feet to the top of his eyes
PAPER = '#f5f1e8'               # the paper inside him (the photo's paper, without the lamp's colour)

# ---------------------------------------------------------------- the frog, in photo pixels
PARTS = {
    'body': {'centre': (1689.4, 1700.5), 'radius': (120, 200)},
    'head': {'box': (1100, 800, 2300, 1382), 'anchor': (1672.0, 1381.0),      # anchor: where the neck meets the head
             'seeds': [(1672, 1335)]},                                          # inside the face: its outline has two pen lifts
    'neck': {'line': [(1673, 1545), (1673, 1460), (1672, 1375)], 'span': (12, 150), 'half': 45},
    'arm': {'line': [(1512, 1680), (1450, 1723), (1300, 1797), (1100, 1854), (1000, 1873), (950, 1878), (905, 1878)], 'span': (8, 610), 'half': 60},
    'legL': {'line': [(1634, 1850), (1631, 1900), (1601, 2200), (1583, 2400), (1544, 2600), (1479, 2800), (1396, 3000), (1356, 3100), (1317, 3200), (1290, 3290)], 'span': (14, 1440), 'half': 70},
    'legR': {'line': [(1751, 1850), (1753, 1900), (1790, 2200), (1814, 2400), (1840, 2600), (1855, 2800), (1865, 3000), (1873, 3100), (1888, 3200), (1895, 3290)], 'span': (14, 1432), 'half': 80},
    'footL': {'box': (940, 0, 1360, 3560), 'fill': [(1262, 3250), (1338, 3250), (1330, 3300), (1312, 3330), (1296, 3330), (1262, 3290)]},
    'footR': {'box': (1830, 0, 2340, 3520), 'fill': [(1866, 3270), (1942, 3270), (1990, 3296), (2050, 3322), (2092, 3372), (2098, 3394), (1868, 3394)]},
    'hand': {'box': (684, 1880, 968, 2068), 'wrist': (906.0, 1879.0),
             'cut': [(0, 2030, 712, 9999), (898, 0, 9999, 1904)],               # the umbrella shaft, the arm's own lines
             'crook': (700, 1840, 900, 1960)},                                     # the umbrella's crook over the fingers
    'mouth': {'side': (1990, 1262), 'front': (1560, 1290)},                        # where a cup meets the smile
    'cheek': (2045, 1188),                                                          # where the raindrop lands in the close-up
}
# the cup he holds in the drawing sits right of the long right leg: keep its lines out of the leg
CUP = lambda X, Y: (X > 1778 + .15 * (Y - 1880) + 12) & (Y > 1770) & (Y < 2140)


def load_dark(path):
    im = np.asarray(ImageOps.exif_transpose(Image.open(path)).convert('RGB')).astype(np.float32)
    H, W = im.shape[:2]

    def paper(ch):                      # the paper's own colour, from a closing that removes the thin pen lines
        small = ndi.grey_closing(ch[::8, ::8], size=(7, 7))
        return np.asarray(Image.fromarray(ndi.gaussian_filter(small, 3)).resize((W, H), Image.BILINEAR))
    bg = np.stack([paper(im[..., c]) for c in range(3)], -1)
    norm = np.clip(im / np.maximum(bg, 1), 0, 1.2)
    dark = np.clip(1 - norm @ np.array([.299, .587, .114], np.float32), 0, 1)
    core = dark > .75
    ink_rgb = np.median(np.clip(norm[core], 0, 1), 0) * 255
    return ndi.gaussian_filter(dark, BLUR), '#%02x%02x%02x' % tuple(int(v) for v in ink_rgb)


dark, INK = load_dark(SRC)
H, W = dark.shape
Y, X = np.mgrid[0:H, 0:W]
ink = dark > T_INK
lab, n = ndi.label(ink, structure=np.ones((3, 3)))
ink &= ndi.sum(ink, lab, range(n + 1))[lab] >= 40          # drop specks
lab, n = ndi.label(ink, structure=np.ones((3, 3)))
objs = ndi.find_objects(lab)


def comps_in(box):
    x0, y0, x1, y1 = box
    return [i for i, sl in enumerate(objs, 1) if sl is not None and sl[1].start >= x0 and sl[1].stop <= x1 and sl[0].start >= y0 and sl[0].stop <= y1]


def contours(F, level=T_INK, eps=.7):
    """closed sub-pixel outlines of a field (zero outside the part), as (x, y) photo pixels"""
    out = []
    for c in measure.find_contours(np.pad(F.astype(np.float32), 2), level):
        if len(c) < 8: continue
        c = measure.approximate_polygon(c, eps)
        if len(c) >= 4: out.append(np.c_[c[:, 1] - 2, c[:, 0] - 2])
    return out


def area(p):
    return .5 * abs(p[:, 0] @ np.roll(p[:, 1], 1) - p[:, 1] @ np.roll(p[:, 0], 1))


def bbox(mask, pad=7):
    ys, xs = np.nonzero(mask)
    return xs.min() - pad, xs.max() + pad, ys.min() - pad, ys.max() + pad


def rel(P, anchor):                     # photo pixels -> part pixels, y up
    return [(float(x - anchor[0]), float(anchor[1] - y)) for x, y in P]


def piece(region, anchor, fill_close=4, extra_fill=(), seeds=()):
    """a rigid part: the ink inside region, and a paper fill for whatever the lines enclose.
    seeds: points inside a shape whose outline has small gaps where the pen lifted; the paper floods out from
    there but cannot squeeze through a gap narrower than 14 px (the ink keeps its gaps)"""
    x0, x1, y0, y1 = bbox(ink & region)
    sl = (slice(y0, y1), slice(x0, x1))
    ink_p = [p + [x0, y0] for p in contours(np.where(region[sl], dark[sl], 0))]
    walls = (ink & region)[sl]
    m = ndi.binary_fill_holes(ndi.binary_closing(walls, iterations=fill_close))
    if seeds:
        open_ = ndi.binary_erosion(~walls, iterations=7)
        lab_, _ = ndi.label(open_)
        for sx, sy in seeds:
            k = lab_[int(sy) - y0, int(sx) - x0]
            if k: m |= ndi.binary_dilation(lab_ == k, iterations=8) & ~walls | (ndi.binary_dilation(lab_ == k, iterations=8) & walls)
    m = ndi.binary_erosion(m, iterations=3)                 # the fill's edge runs inside the outer line
    fill_p = [p + [x0, y0] for p in contours(ndi.gaussian_filter(m.astype(np.float32), 1.5), .5, 1.2)]
    fill_p = [p for p in fill_p if area(p) > 400] + [np.array(q, float) for q in extra_fill]
    return {'ink': [rel(p, anchor) for p in ink_p], 'fill': [rel(p, anchor) for p in fill_p]}


def midline(rough, half, step=6):
    """the midline between a tube's two pen lines, found from a rough polyline"""
    rough = np.asarray(rough, float)
    seg = np.diff(rough, axis=0); segL = np.hypot(*seg.T); cum = np.r_[0, np.cumsum(segL)]
    out = []
    for s in np.arange(0, cum[-1], step):
        k = min(np.searchsorted(cum, s, 'right') - 1, len(seg) - 1)
        p = rough[k] + seg[k] * (s - cum[k]) / segL[k]; d = seg[k] / segL[k]; nrm = np.array([-d[1], d[0]])
        vs = np.arange(-half, half + 1)
        on = ndi.map_coordinates(dark, [p[1] + vs * nrm[1], p[0] + vs * nrm[0]], order=1) > T_INK
        runs, i = [], 0
        while i < len(on):
            if on[i]:
                j = i
                while j + 1 < len(on) and on[j + 1]: j += 1
                runs.append((vs[i] + vs[j]) / 2); i = j + 1
            else: i += 1
        neg, pos = [r for r in runs if r < 0], [r for r in runs if r > 0]
        out.append(p + nrm * (max(neg) + min(pos)) / 2 if neg and pos else p)
    out = np.array(out)
    return np.stack([ndi.gaussian_filter1d(out[:, c], 3, mode='nearest') for c in (0, 1)], 1)


def project(P, C):
    """(u, v) of points on a polyline: u = arc length, v = distance, + on the left going along it (y up)"""
    P = np.asarray(P, float)
    seg = np.diff(C, axis=0); segL = np.hypot(*seg.T); cum = np.r_[0, np.cumsum(segL)]; d = seg / segL[:, None]
    out = np.zeros((len(P), 2))
    for a in range(0, len(P), 4000):
        Q = P[a:a + 4000]
        t = np.clip(((Q[:, None, :] - C[None, :-1, :]) * d[None]).sum(2), 0, segL[None])
        foot = C[None, :-1, :] + d[None] * t[..., None]
        dist = np.hypot(*(Q[:, None, :] - foot).transpose(2, 0, 1))
        k = np.argmin(dist, 1); r = np.arange(len(Q)); f = foot[r, k]; dk = d[k]
        crs = dk[:, 0] * (Q[:, 1] - f[:, 1]) - dk[:, 1] * (Q[:, 0] - f[:, 0])
        out[a:a + 4000] = np.c_[cum[k] + t[r, k], -np.sign(crs) * dist[r, k]]
    return out


def along(C, s):
    seg = np.diff(C, axis=0); segL = np.hypot(*seg.T); cum = np.r_[0, np.cumsum(segL)]
    k = min(np.searchsorted(cum, s, 'right') - 1, len(seg) - 1)
    d = seg[k] / segL[k]
    return C[k] + seg[k] * (s - cum[k]) / segL[k], d


def tube(spec, exclude):
    """a limb's two pen lines, straightened: u from the root (body end), v across; plus the paper between them"""
    half, (u0, u1) = spec['half'], spec['span']
    C = midline(spec['line'], half + 5)
    x0, x1 = int(C[:, 0].min() - half - 5), int(C[:, 0].max() + half + 6)
    y0, y1 = int(C[:, 1].min() - half - 5), int(C[:, 1].max() + half + 6)
    left, right = [], []
    for s in np.linspace(u0, u1, max(3, int((u1 - u0) / 4))):
        p, d = along(C, s); nrm = np.array([-d[1], d[0]])
        left.append(tuple(p + nrm * half - [x0, y0])); right.append(tuple(p - nrm * half - [x0, y0]))
    img = Image.new('L', (x1 - x0, y1 - y0), 0)
    ImageDraw.Draw(img).polygon(left + right[::-1], fill=1)
    band = np.asarray(img).astype(bool) & ~exclude[y0:y1, x0:x1]
    ink_uv = []
    for p in contours(np.where(band, dark[y0:y1, x0:x1], 0), eps=.6):
        uv = project(p + [x0, y0], C); uv[:, 0] -= u0
        ink_uv.append([(float(u), float(v)) for u, v in uv])
    # the paper between the lines: the middle of each line, sample by sample along the limb
    rows = []
    for s in np.arange(u0, u1 + 1e-6, 8):
        p, d = along(C, s); nrm = np.array([-d[1], d[0]])
        vs = np.arange(-half, half + 1)
        on = ndi.map_coordinates(dark, [p[1] + vs * nrm[1], p[0] + vs * nrm[0]], order=1) > T_INK
        lo = hi = half
        while lo > 0 and not on[lo]: lo -= 1
        while hi < len(on) - 1 and not on[hi]: hi += 1
        lo2, hi2 = lo, hi
        while lo2 > 0 and on[lo2]: lo2 -= 1
        while hi2 < len(on) - 1 and on[hi2]: hi2 += 1
        rows.append([s - u0, -vs[(hi + hi2) // 2], -vs[(lo + lo2) // 2]])
    rows = np.array(rows, float)
    w = rows[:, 2] - rows[:, 1]; med = np.median(w); bad = (w > med * 1.35) | (w < med * .35)
    good = np.nonzero(~bad)[0]
    for j in np.nonzero(bad)[0]: rows[j, 1:] = rows[good[np.argmin(np.abs(good - j))], 1:]
    for c in (1, 2): rows[:, c] = ndi.gaussian_filter1d(rows[:, c], 1.5, mode='nearest')
    fill = [(u, a) for u, a, b in rows] + [(u, b) for u, a, b in rows[::-1]]
    root, _ = along(C, u0); end, dend = along(C, u1)
    return {'L': float(u1 - u0), 'ink': ink_uv, 'fill': [fill]}, root, end, dend


parts = {}
# ---- body: follow the drawn circle's own centre line (polar, a Viterbi ridge), keep its stroke, trim the limbs off it
cx, cy = PARTS['body']['centre']
R = np.hypot(X - cx, Y - cy); TH = np.arctan2(Y - cy, X - cx)
nb = 720; th = (np.arange(nb) + .5) / nb * 2 * np.pi - np.pi
rs = np.arange(*PARTS['body']['radius'], .5); nr = len(rs)
prof = np.array([ndi.map_coordinates(dark, [cy + rs * np.sin(a), cx + rs * np.cos(a)], order=1) for a in th])


def ridge(Pm, J=3):
    cost = -Pm[0].copy(); back = np.zeros(Pm.shape, int)
    for i in range(1, len(Pm)):
        best = np.full(nr, np.inf); arg = np.zeros(nr, int)
        for dj in range(-J, J + 1):
            sh = np.roll(cost, dj) + .02 * abs(dj)
            if dj > 0: sh[:dj] = np.inf
            if dj < 0: sh[dj:] = np.inf
            m = sh < best; best[m] = sh[m]; arg[m] = (np.arange(nr) - dj)[m]
        cost = best - Pm[i]; back[i] = arg
    path = np.zeros(len(Pm), int); path[-1] = np.argmin(cost)
    for i in range(len(Pm) - 1, 0, -1): path[i - 1] = back[i, path[i]]
    return path


path = ridge(np.r_[prof, prof, prof])[nb:2 * nb]
rin, rout = np.zeros(nb), np.zeros(nb)
for i in range(nb):
    a = b = path[i]
    while a > 0 and prof[i, a - 1] > T_INK and rs[path[i]] - rs[a - 1] <= 9: a -= 1
    while b < nr - 1 and prof[i, b + 1] > T_INK and rs[b + 1] - rs[path[i]] <= 9: b += 1
    rin[i], rout[i] = rs[a] - 1.5, rs[b] + 1.5
bins = ((TH + np.pi) / (2 * np.pi) * nb).astype(int) % nb
ring = (R >= rin[bins]) & (R <= rout[bins])
x0, x1, y0, y1 = bbox(ring & ink)
rmid = rs[path]
parts['body'] = {'ink': [rel(p + [x0, y0], (cx, cy)) for p in contours(np.where(ring, dark, 0)[y0:y1, x0:x1])],
                 'fill': [rel([(cx + rmid[b] * math.cos(th[b]), cy + rmid[b] * math.sin(th[b])) for b in range(0, nb, 3)], (cx, cy))],
                 'r': float(np.median(rmid))}
body_disc = R < rout[bins] + 2

# ---- head: everything above the neck; the pupils and the smile kept apart
hx0, hy0, hx1, hy1 = PARTS['head']['box']; HA = PARTS['head']['anchor']
head_region = (Y > hy0) & (Y < hy1) & (X > hx0) & (X < hx1)
pupils, smile = [], []
for i in comps_in((hx0, hy0, hx1, hy1 + 1)):
    ys, xs = objs[i - 1]; w, h = xs.stop - xs.start, ys.stop - ys.start
    a = (lab[objs[i - 1]] == i).sum(); mid = (ys.start + ys.stop) / 2
    if a > 1500 and a / (w * h) > .45 and mid < 1110: pupils.append(i)         # solid blobs up in the eyes
    elif ys.start > 1110 and ys.stop < 1310 and h < 200: smile.append(i)         # the curve (and its curls) across the face
parts['head'] = piece(head_region, HA, fill_close=6, seeds=PARTS['head']['seeds'])
del parts['head']['ink']
for key, ids in (('pupils', pupils), ('smile', smile)):
    m = np.isin(lab, ids) & head_region
    x0, x1, y0, y1 = bbox(m)
    F = np.where(ndi.binary_dilation(m, iterations=3), dark, 0)[y0:y1, x0:x1]
    parts['head'][key] = [rel(p + [x0, y0], HA) for p in contours(F)]
rest = head_region & ~ndi.binary_dilation(np.isin(lab, pupils + smile), iterations=2)
x0, x1, y0, y1 = bbox(rest & ink)
parts['head']['outline'] = [rel(p + [x0, y0], HA) for p in contours(np.where(rest, dark, 0)[y0:y1, x0:x1])]
parts['head']['pupilC'] = [rel([(np.mean(np.nonzero(lab == i)[1]), np.mean(np.nonzero(lab == i)[0]))], HA)[0] for i in pupils]

parts['head']['top'] = float(HA[1] - np.nonzero(ink & head_region)[0].min())
parts['head']['mouth'] = {k: rel([v], HA)[0] for k, v in PARTS['mouth'].items()}
parts['head']['cheek'] = rel([PARTS['cheek']], HA)[0]
parts['head']['width'] = [float(np.nonzero(ink & head_region)[1].min() - HA[0]), float(np.nonzero(ink & head_region)[1].max() - HA[0])]

# ---- tubes
ends = {}
for k in ('neck', 'arm', 'legL', 'legR'):
    parts[k], root, end, dend = tube(PARTS[k], body_disc | (CUP(X, Y) if k == 'legR' else False))
    ends[k] = (root, end, dend)
    parts[k]['root'] = rel([root], (cx, cy))[0]                   # where the limb leaves the body, body pixels
    parts[k]['end'] = rel([end], (cx, cy))[0]

# ---- feet: everything below each leg's end
for k, leg in (('footL', 'legL'), ('footR', 'legR')):
    bx0, _, bx1, by1 = PARTS[k]['box']; e = ends[leg][1]
    region = (Y > e[1] - 4) & (Y < by1) & (X > bx0) & (X < bx1)
    parts[k] = piece(region, e, fill_close=3, extra_fill=[PARTS[k]['fill']])
    allp = np.array([q for p in parts[k]['ink'] for q in p])
    parts[k]['low'] = float(allp[:, 1].min())                     # the lowest point, below the ankle (negative)

# ---- hand: the fingers round the crook, without the crook itself, the shaft or the arm's lines
bx0, by0, bx1, by1 = PARTS['hand']['box']
region = (X > bx0) & (X < bx1) & (Y > by0) & (Y < by1)
for c0, c1, c2, c3 in PARTS['hand']['cut']: region &= ~((X > c0) & (X < c2) & (Y > c1) & (Y < c3))
crook = [i for i in comps_in(PARTS['hand']['crook']) if (lab[objs[i - 1]] == i).sum() > 800]
region &= ~ndi.binary_dilation(np.isin(lab, crook), iterations=2)
WR = PARTS['hand']['wrist']
parts['hand'] = piece(region, WR, fill_close=3)
fm = ndi.binary_fill_holes(ndi.binary_closing(ink & region, iterations=3))
gy, gx = np.nonzero(fm)
parts['hand']['grip'] = rel([(gx.mean(), gy.mean())], WR)[0]     # the middle of the fingers: what they hold sits here
d = -ends['arm'][2]                                                # from the wrist back up the arm, photo axes
parts['hand']['dir'] = [float(d[0]), float(-d[1])]                # world axes (y up)


# ---------------------------------------------------------------- write src/frog_ink.js
def enc(polys):
    """polygons -> 'x,y,dx,dy,...;...' in half pixels (y up)"""
    out = []
    for p in polys:
        q = np.round(np.asarray(p, float) * 2).astype(int)
        dq = np.r_[q[:1], np.diff(q, axis=0)]
        out.append(','.join(str(v) for v in dq.ravel()))
    return ';'.join(out)


def js(v):
    if isinstance(v, dict): return '{ ' + ', '.join(f'{k}: {js(x)}' for k, x in v.items()) + ' }'
    if isinstance(v, (list, tuple)) and v and isinstance(v[0], (int, float, np.floating)): return '[' + ', '.join(f'{float(x):.1f}' for x in v) + ']'
    if isinstance(v, (list, tuple)): return '[' + ', '.join(js(x) for x in v) + ']'
    if isinstance(v, str): return "'" + v + "'"
    return f'{float(v):.1f}'


doc = {'scale': SCALE, 'ink': INK, 'paper': PAPER}
for k, p in parts.items():
    doc[k] = {kk: (enc(vv) if kk in ('ink', 'fill', 'pupils', 'smile', 'outline') else vv) for kk, vv in p.items()}
lines = ['// ===== the frog, traced from his drawing (art/frog/drawing.jpg) by tools/trace_character.py: do not edit by hand =====',
         '// Pen lines as polygons, in photo pixels with y up: "x,y,dx,dy,..." in half pixels, one polygon per ";".',
         '// Pieces are relative to their anchor; tubes run u along the limb from the body, v across it. src/frog.js draws them.',
         'const FROG_INK = {']
for k, v in doc.items():
    if k == 'scale': lines.append(f'  scale: {SCALE},')
    elif isinstance(v, str): lines.append(f"  {k}: '{v}',")
    else:
        lines.append(f'  {k}: {{')
        for kk, vv in v.items():
            lines.append(f"    {kk}: '{vv}'," if isinstance(vv, str) else f'    {kk}: {js(vv)},')
        lines.append('  },')
lines.append('};')
OUT.write_text('\n'.join(lines) + '\n', encoding='utf-8')
print(f'wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} KB), ink {INK}',
      {k: sum(len(p) for p in v.get('ink', [])) for k, v in parts.items()})
