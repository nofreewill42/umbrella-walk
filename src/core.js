// ===== core: math, easing, drawing helpers, camera =====
const W = 1920, H = 1080, FPS = 24;
let S = 1;            // current px per metre
let OLW = 2.4;        // outline width in screen px
const INK = '#25211f';
const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  lin: t => t,
  i: t => t * t, o: t => 1 - (1 - t) * (1 - t),
  io: t => t < .5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t),
  i3: t => t * t * t, o3: t => 1 - Math.pow(1 - t, 3),
  io3: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  sine: t => .5 - .5 * Math.cos(Math.PI * t),
  back: t => { const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  hold: t => t < 1 ? 0 : 1,
};
// keyframes: [[t, v], [t, v, easeFn], ...]  v may be number or array
function kf(t, keys, ease = E.io) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const k0 = keys[i], k1 = keys[i + 1];
    if (t <= k1[0]) {
      const u = (k1[2] || ease)((t - k0[0]) / (k1[0] - k0[0] || 1));
      return Array.isArray(k0[1]) ? k0[1].map((x, j) => lerp(x, k1[1][j], u)) : lerp(k0[1], k1[1], u);
    }
  }
  return keys[keys.length - 1][1];
}
function rng(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const dn = (a, f = 1) => [f * Math.sin(a), -Math.cos(a)];   // angle measured from straight down, + = forward
const upv = (a, f = 1) => [f * Math.sin(a), Math.cos(a)];
const add = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k];
const mix = (p, q, t) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t)];
const dist = (p, q) => Math.hypot(q[0] - p[0], q[1] - p[1]);
const px = v => v / S;

// camera: world (cx,cy) -> screen centre, s px/m, y up
function camera(ctx, cx, cy, s, rot = 0) {
  S = s;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.translate(W / 2, H / 2);
  if (rot) ctx.rotate(rot);
  ctx.scale(s, -s);
  ctx.translate(-cx, -cy);
}
function screen(ctx) { ctx.setTransform(1, 0, 0, 1, 0, 0); S = 1; }

// ---- path helpers ----
function P(ctx, pts, close = true) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close) ctx.closePath();
}
function smooth(ctx, pts, close = true, k = 0.5, start = true) {
  const n = pts.length;
  if (start) ctx.beginPath();
  const g = i => close ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)];
  if (start) ctx.moveTo(pts[0][0], pts[0][1]); else ctx.lineTo(pts[0][0], pts[0][1]);
  const m = close ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * k / 3, p1[1] + (p2[1] - p0[1]) * k / 3,
      p2[0] - (p3[0] - p1[0]) * k / 3, p2[1] - (p3[1] - p1[1]) * k / 3, p2[0], p2[1]);
  }
  if (close) ctx.closePath();
}
function fs(ctx, fill, w = OLW, stroke = INK) {
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (w) { ctx.lineWidth = w / S; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
}
function st(ctx, w = OLW, stroke = INK) { ctx.lineWidth = w / S; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
function limb(ctx, pts, width, color, ow = OLW) {
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
  if (ow) { ctx.strokeStyle = INK; ctx.lineWidth = width + 2 * ow / S; ctx.stroke(); }
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
}
function ell(ctx, x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, TAU); }
function circ(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.abs(r), 0, TAU); }
function seg2(ctx, a, b, w, color = INK) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineWidth = w / S; ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.stroke(); }
function rect(ctx, x, y, w, h) { ctx.beginPath(); ctx.rect(x, y, w, h); }
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath(); r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}
function txt(ctx, s, x, y, size, color, font = '700 {S}px Georgia, "DejaVu Serif", serif', align = 'center', rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(1 / S, -1 / S); if (rot) ctx.rotate(rot);
  ctx.font = font.replace('{S}', (size * S).toFixed(1)); ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.fillText(s, 0, 0); ctx.restore();
}
// local frame: translate+rotate+scale
function local(ctx, x, y, rot = 0, sx = 1, sy = sx) { ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); if (sx !== 1 || sy !== 1) { ctx.scale(sx, sy); } }
function sub(ctx, x, y, rot, sx, sy, fn) { ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.scale(sx, sy); const s0 = S; S = S * Math.abs(sy); fn(); S = s0; ctx.restore(); }
function withScale(sc, fn) { const s0 = S; S = S * sc; fn(); S = s0; }

// shaded colour
function shade(hex, k) { // k<0 darker, k>0 lighter
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = n >> 8 & 255, b = n & 255;
  if (k < 0) { r *= 1 + k; g *= 1 + k; b *= 1 + k; } else { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
  return '#' + [r, g, b].map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
}
function mixc(a, b, t) {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const c = [16, 8, 0].map(s => Math.round(lerp(A >> s & 255, B >> s & 255, t)));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}

// vertical gradient in world coords
function vgrad(ctx, y0, y1, stops) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  stops.forEach(([o, c]) => g.addColorStop(o, c)); return g;
}
function fillAll(ctx, color) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = color; ctx.fillRect(0, 0, W, H); ctx.restore(); }

// soft fog band across the screen at world y range (drawn in current camera)
function fogBand(ctx, x0, x1, y0, y1, color, a0 = 0, a1 = .6) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, rgba(color, a0)); g.addColorStop(1, rgba(color, a1));
  ctx.fillStyle = g; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
}
function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; }

// ground contact shadow
function shadow(ctx, x, y, rx, a = .18) { ctx.save(); ctx.fillStyle = `rgba(30,32,40,${a})`; ell(ctx, x, y, rx, rx * .12); ctx.fill(); ctx.restore(); }

// ===== rain (screen space) =====
function rainLayer(ctx, T, n, opts = {}) {
  const { slant = .12, len = 38, speed = 1900, color = 'rgba(225,232,240,', alpha = .45, seed = 7, width = 1.4 } = opts;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const r = rng(seed);
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x0 = r() * (W + 300) - 150, ph = r(), sp = speed * (0.75 + r() * .5), a = alpha * (.5 + r() * .5);
    const L = len * (.6 + r() * .8);
    let y = ((ph * (H + 200) + T * sp) % (H + 200)) - 100;
    const x = x0 + y * slant;
    ctx.strokeStyle = color + a + ')'; ctx.lineWidth = width * (.6 + r() * .8);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - slant * L, y - L); ctx.stroke();
  }
  ctx.restore();
}

// ===== paper grain / vignette (generated once) =====
let GRAIN = null;
function makeGrain() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d'); const id = g.createImageData(512, 512); const r = rng(1234);
  for (let i = 0; i < id.data.length; i += 4) {
    const v = 128 + (r() - .5) * 70 + (r() - .5) * 30;
    id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255;
  }
  g.putImageData(id, 0, 0);
  // fibres
  g.globalAlpha = .06; g.strokeStyle = '#000';
  for (let i = 0; i < 260; i++) { g.beginPath(); const x = r() * 512, y = r() * 512, a = r() * TAU, l = 6 + r() * 22; g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.lineWidth = .6; g.stroke(); }
  GRAIN = c;
}
function post(ctx, T, vign = .28, grain = .07) {
  if (!GRAIN) makeGrain();
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = grain * 1.6;
  const pat = ctx.createPattern(GRAIN, 'repeat'); ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  const g = ctx.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, H * 1.05);
  g.addColorStop(0, 'rgba(20,22,30,0)'); g.addColorStop(1, `rgba(20,22,30,${vign})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// hair / flame locks: pts alternate valley, tip, valley, tip ... (closed). curl bends each lock.
function locks(ctx, pts, curl = .25, start = true) {
  const n = pts.length;
  if (start) ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], d = [b[0] - a[0], b[1] - a[1]];
    const c = (i % 2 === 0 ? 1 : -1) * curl * (Array.isArray(a[2]) ? 1 : (a[2] == null ? 1 : a[2]));
    ctx.quadraticCurveTo(m[0] - d[1] * c, m[1] + d[0] * c, b[0], b[1]);
  }
  ctx.closePath();
}

// ===== shot registry =====
// The film's timing lives in timeline.json (shot boundaries and each shot's named moments).
// tools/build.py writes that file into the next line.
const TIMELINE = { fps: 24, shots: [] };
// shot boundaries in frames: shot i runs from CUTS[i - 1] up to CUTS[i]
const CUTS = TIMELINE.shots.map(s => s.from).concat(TIMELINE.shots.length ? [TIMELINE.shots[TIMELINE.shots.length - 1].to] : []);
// a shot's named moments, in seconds from the start of that shot:
//   const { T_HOOK, T_GO } = MOMENTS('Wet concrete');
// a moment is a number or a list of numbers (usually [start, end])
const _MOMENTS = {};
function MOMENTS(name) {
  if (_MOMENTS[name]) return _MOMENTS[name];
  const s = TIMELINE.shots.find(q => q.name === name);
  if (!s) throw new Error('no shot called "' + name + '" in timeline.json');
  const o = {};
  for (const k in s.moments) o[k] = s.moments[k].t;
  return (_MOMENTS[name] = o);
}
const CUT = i => [CUTS[i - 1] / 24, CUTS[i] / 24];   // shot i (1-based): [t0, t1]
const SHOTS = [];
function shot(name, t0, t1, draw, o = {}) { SHOTS.push(Object.assign({ name, t0, t1, draw }, o)); }
