// ============================================================================
// Umbrella Walk Studio: the app.
// Stage (the film drawn live, actors picked and posed), timeline (shots,
// moments, sounds, your changes), inspector (whatever is selected), cast,
// changes and the brief for an agent.
// ============================================================================
const SD = JSON.parse(document.getElementById('studio-data').textContent);
function toast(msg) { const t = document.getElementById('toast'); if (!t) return; t.textContent = msg; t.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), 2600); }

(() => {
  INST.install();
  const NFR = CUTS[CUTS.length - 1], FPSs = 24, FADE = 8;
  const $ = s => document.querySelector(s);
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const fmtT = t => { t = Math.max(0, t); const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + s.toFixed(2).padStart(5, '0'); };
  const fr = t => Math.max(0, Math.min(NFR - 1, Math.floor(t * FPSs + 1e-6)));
  const shotOfFrame = f => { for (let i = 0; i < CUTS.length - 1; i++) if (f < CUTS[i + 1]) return i + 1; return CUTS.length - 1; };
  const tlShot = n => TIMELINE.shots[n - 1];
  const origShot = n => SD.timeline.shots[n - 1];
  const shotT0 = n => tlShot(n).from / FPSs, shotT1 = n => tlShot(n).to / FPSs;
  const CATC = { character: 'var(--accent)', animal: 'var(--c-voice)', prop: 'var(--c-contact)', set: 'var(--c-ambience)', camera: 'var(--rain)', fx: 'var(--c-air)' };
  const SNDC = { voice: '#ec9a6c', air: '#a9c3d6', contact: '#e8cf6f', foley: '#bba88c', water: '#6fb4dc', machine: '#b690dc', ambience: '#6f7d8c', upload: '#9fd49a' };
  const uid = () => Math.random().toString(36).slice(2, 9);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const k in (attrs || {})) {
      const v = attrs[k]; if (v == null || v === false) continue;
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'html') el.innerHTML = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
    return el;
  }
  const ICON = {
    play: '<svg viewBox="0 0 20 20"><path d="M6 4l10 6-10 6z" fill="currentColor"/></svg>',
    jump: '<svg viewBox="0 0 20 20"><path d="M4 10h11M11 6l4 4-4 4"/></svg>',
    del: '<svg viewBox="0 0 20 20"><path d="M5 5l10 10M15 5L5 15"/></svg>',
    key: '<svg viewBox="0 0 20 20"><path d="M10 3l7 7-7 7-7-7z"/></svg>',
    note: '<svg viewBox="0 0 20 20"><path d="M4 4h12v9l-4 4H4z"/></svg>',
    pen: '<svg viewBox="0 0 20 20"><path d="M3 17l2-5 9-9 3 3-9 9z"/></svg>',
    clock: '<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="7"/><path d="M10 6v4l3 2"/></svg>',
    wave: '<svg viewBox="0 0 20 20"><path d="M2 10h2l2-5 3 10 3-8 2 5 2-2h2"/></svg>',
    img: '<svg viewBox="0 0 20 20"><rect x="3" y="4" width="14" height="12" rx="1"/><path d="M3 13l4-4 4 4 2-2 4 4"/></svg>',
    plus: '<svg viewBox="0 0 20 20"><path d="M10 4v12M4 10h12"/></svg>',
  };
  const ic = n => h('span', { html: ICON[n], style: { display: 'grid' } });
  const cap = (el, e) => { try { el.setPointerCapture(e.pointerId); } catch (err) { } };

  // ------------------------------------------------------------------ state
  const A = { t: 0, playing: false, speed: 1, sel: null, tool: 'select', edits: true, onion: false, loop: false, info: null, cut: null, live: null, pen: '#ffb347', view: [0, NFR / FPSs] };
  const actorMeta = key => SD.actors[key] || { key, name: key, cat: 'prop', shots: {} };
  const isShotBound = key => ['set', 'fx', 'camera'].includes(actorMeta(key).cat);
  const aidOf = (key, shot) => isShotBound(key) ? key + '@' + shot : key;
  const keyOf = aid => aid.split('@')[0];
  const shotBoundOf = aid => aid.includes('@') ? +aid.split('@')[1] : null;
  const actorName = aid => { const k = keyOf(aid), m = actorMeta(k), s = shotBoundOf(aid); return m.name + (s ? ' · shot ' + s : ''); };
  const actorShots = aid => { const s = shotBoundOf(aid); return s ? [s] : Object.keys(actorMeta(keyOf(aid)).shots).map(Number); };

  // ------------------------------------------------------------------ edits -> the film
  let KEYS = new Map();
  function indexKeys() {
    KEYS = new Map();
    for (const c of Store.all()) if (c.kind === 'key') { const k = c.aid + '|' + c.shot; if (!KEYS.has(k)) KEYS.set(k, []); KEYS.get(k).push(c); }
    KEYS.forEach(v => v.sort((a, b) => a.frame - b.frame));
  }
  const addMaps = (a, b, u) => { const o = {}; for (const k of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) o[k] = (a && a[k] || 0) * (1 - u) + (b && b[k] || 0) * u; return o; };
  function mixKeys(k0, k1, u) {
    return { dx: (k0.dx || 0) * (1 - u) + (k1.dx || 0) * u, dy: (k0.dy || 0) * (1 - u) + (k1.dy || 0) * u, rot: (k0.rot || 0) * (1 - u) + (k1.rot || 0) * u,
      sc: (k0.sc || 1) * (1 - u) + (k1.sc || 1) * u, d: addMaps(k0.d, k1.d, u), set: Object.assign({}, k0.set), hide: k0.hide && k1.hide };
  }
  function weigh(k, w) {
    const d = {}; for (const p in (k.d || {})) d[p] = k.d[p] * w;
    return { dx: (k.dx || 0) * w, dy: (k.dy || 0) * w, rot: (k.rot || 0) * w, sc: 1 + ((k.sc || 1) - 1) * w, d, set: w > .5 ? k.set : {}, hide: w > .5 && k.hide };
  }
  function ovAt(aid, shot, f) {
    let ks = KEYS.get(aid + '|' + shot) || [];
    if (A.live && A.live.aid === aid && A.live.shot === shot) ks = ks.filter(k => k.frame !== A.live.frame).concat([A.live]).sort((a, b) => a.frame - b.frame);
    if (!ks.length) return null;
    let k0 = null, k1 = null;
    for (const k of ks) { if (k.frame <= f) k0 = k; if (k.frame >= f) { k1 = k; break; } }
    if (k0 && k1) return k0 === k1 ? k0 : mixKeys(k0, k1, (f - k0.frame) / (k1.frame - k0.frame));
    const k = k0 || k1, dist = Math.abs(f - k.frame);
    return dist >= FADE ? null : weigh(k, 1 - dist / FADE);
  }
  let curShot = 1, curFrame = 0;
  INST.S.ov = key => A.edits ? ovAt(aidOf(key, curShot), curShot, curFrame) : null;

  function applyTiming() {
    SD.timeline.shots.forEach((s, i) => { for (const k in s.moments) TIMELINE.shots[i].moments[k].t = JSON.parse(JSON.stringify(s.moments[k].t)); delete _MOMENTS[s.name]; });
    if (!A.edits) return;
    for (const c of Store.all()) if (c.kind === 'timing') { const m = tlShot(c.shot).moments[c.moment]; if (m) { m.t = JSON.parse(JSON.stringify(c.to)); delete _MOMENTS[tlShot(c.shot).name]; } }
  }
  const momentVal = (shot, name) => tlShot(shot).moments[name].t;
  const momentT0 = (shot, name) => { const v = momentVal(shot, name); return shotT0(shot) + (Array.isArray(v) ? v[0] : v); };
  const soundEdit = s => Store.get('sound:' + s.id) || null;
  function soundTime(s, useEdits = A.edits) {
    let t = s.t;
    if (s.moment && useEdits) { const v = momentVal(s.moment[0], s.moment[1]); t = shotT0(s.moment[0]) + (Array.isArray(v) ? v[s.moment[2]] : v) + s.offset; }
    const e = useEdits && soundEdit(s);
    return t + (e && e.shift ? e.shift / 1000 : 0);
  }
  function mixItems() {
    const out = [];
    for (const s of SD.sounds) {
      const e = A.edits ? soundEdit(s) : null;
      if (e && e.mute) continue;
      let buf = Snd.clip.get(s.id);
      if (e && e.replace && Snd.uploads.get(e.replace)) buf = Snd.uploads.get(e.replace);
      else if (e && e.mask && !Snd.maskEmpty(e.mask)) buf = Snd.editedBuf(s.id, e.mask) || buf;
      out.push({ t: soundTime(s), buf, gain: e ? e.gain || 0 : 0, pan: e ? e.pan || 0 : 0 });
    }
    if (A.edits) for (const c of Store.all()) if (c.kind === 'newsound') out.push({ t: c.t, buf: Snd.uploads.get(c.ref), gain: c.gain || 0 });
    return out;
  }

  // ------------------------------------------------------------------ stage
  const stage = $('#stage'), over = $('#over'), pick = document.createElement('canvas');
  const sctx = stage.getContext('2d'), octx = over.getContext('2d'), pctx = pick.getContext('2d', { willReadFrequently: true });
  function patch(ctx) {
    const st = ctx.setTransform.bind(ctx);
    ctx.setTransform = function (a, b, c, d, e, f) { if (typeof a !== 'number') return st(a); const k = ctx.canvas.width / 1920; return st(a * k, b * k, c * k, d * k, e * k, f * k); };
  }
  patch(sctx); patch(pctx);
  function resize() {
    const box = $('#stageBox').getBoundingClientRect();
    let w = Math.max(160, box.width), hh = w * 9 / 16;
    if (hh > box.height && box.height > 60) { hh = box.height; w = hh * 16 / 9; }
    const dpr = Math.min(2, window.devicePixelRatio || 1), iw = Math.min(1920, Math.round(w * dpr)), ih = Math.round(iw * 9 / 16);
    for (const c of [stage, over]) { c.style.width = w + 'px'; c.style.height = hh + 'px'; }
    if (stage.width !== iw) { stage.width = over.width = pick.width = iw; stage.height = over.height = pick.height = ih; }
    tlResize(); render(); drawTL();
  }
  let renderReq = 0;
  const requestRender = () => { if (!renderReq) renderReq = requestAnimationFrame(() => { renderReq = 0; render(); }); };
  function selKeyForFrame() {
    if (!A.sel || A.sel.type !== 'actor') return null;
    const aid = A.sel.id, sb = shotBoundOf(aid);
    if (sb && sb !== curShot) return null;
    return keyOf(aid);
  }
  function render() {
    curFrame = fr(A.t); curShot = shotOfFrame(curFrame);
    INST.S.sel = selKeyForFrame(); INST.S.probe = null; INST.S.capture = null;
    A.info = INST.frame(sctx, A.playing ? A.t : curFrame / FPSs);
    drawOverlay();
    updateTransport();
    if (!A.playing) scheduleCapture();
  }
  const readPx = (c, x, y) => {
    const g = c.canvas === pick ? pctx : c, kk = c.canvas.width / pick.width;
    const d = g.getImageData(Math.floor(x * kk), Math.floor(y * kk), 1, 1).data; return ((d[0] << 24) | (d[1] << 16) | (d[2] << 8) | d[3]) >>> 0;
  };
  function pickAt(x, y) {
    const sv = INST.S.sel;
    INST.S.sel = null; INST.S.probe = { read: c => readPx(c, x, y), hit: null };
    INST.frame(pctx, curFrame / FPSs);
    const hit = INST.S.probe.hit; INST.S.probe = null; INST.S.sel = sv;
    return hit;
  }
  // cut the selected actor out of its frame: the pixels its drawing call changed
  function cutOut(key, t, canvas = pick, ctx = pctx) {
    const sv = INST.S.sel;
    INST.S.sel = null; INST.S.probe = null;
    INST.S.captureRead = c => { const g = c.canvas === canvas ? ctx : c; return g.getImageData(0, 0, c.canvas.width, c.canvas.height); };
    INST.S.capture = key;
    INST.frame(ctx, t);
    const cap = INST.S.capture; INST.S.capture = null; INST.S.sel = sv;
    if (!cap || !cap.after) return null;
    const a = cap.before.data, b = cap.after.data, W0 = cap.after.width, H0 = cap.after.height;
    let x0 = W0, y0 = H0, x1 = -1, y1 = -1;
    const mask = new Uint8Array(W0 * H0);
    for (let i = 0, p = 0; i < b.length; i += 4, p++) {
      if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 6) { mask[p] = 1; const x = p % W0, y = (p / W0) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    if (x1 < 0) return null;
    const w = x1 - x0 + 1, hh = y1 - y0 + 1, img = new ImageData(w, hh);
    for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) {
      const p = (y + y0) * W0 + x + x0; if (!mask[p]) continue;
      const o = (y * w + x) * 4, i = p * 4; img.data[o] = b[i]; img.data[o + 1] = b[i + 1]; img.data[o + 2] = b[i + 2]; img.data[o + 3] = 255;
    }
    const c = document.createElement('canvas'); c.width = w; c.height = hh; c.getContext('2d').putImageData(img, 0, 0);
    const kk = canvas.width / W0;                        // the pond draws some actors full size, off screen
    return { img: c, box: [x0 * kk, y0 * kk, w * kk, hh * kk], key, frame: fr(t) };
  }
  let capT = 0;
  function scheduleCapture() {
    clearTimeout(capT);
    const key = INST.S.sel;
    if (!key) { A.cut = null; drawViewer(); return; }
    capT = setTimeout(() => { A.cut = cutOut(key, curFrame / FPSs); drawOverlay(); drawViewer(); }, 70);
  }

  // ---- overlay: selection, skeleton, handles, drawings, onion skin ----
  const k1920 = () => stage.width / 1920;
  function jointsScreen() {
    const sk = A.info && A.info.skel;
    if (!sk || !sk.sk || !A.sel || A.sel.type !== 'actor' || sk.key !== selKeyForFrame()) return null;
    const m = sk.m, kk = sk.k;
    const toS = w => { const p = m.transformPoint({ x: w[0], y: w[1] }); return [p.x * kk, p.y * kk]; };
    return { toS, m, kk, joints: sk.sk.joints.map(j => Object.assign({}, j, { s: toS(j.w) })), bones: sk.sk.bones, f: sk.sk.f, anchor: toS(sk.anchor || [0, 0]) };
  }
  function handles() {
    if (!A.sel || A.sel.type !== 'actor' || !A.cut || A.cut.frame !== curFrame || A.cut.key !== selKeyForFrame()) return null;
    const [x, y, w, hh] = A.cut.box;
    const cx = v => Math.max(12, Math.min(over.width - 12, v)), cy = v => Math.max(12, Math.min(over.height - 12, v));   // keep the handles on screen
    return { box: [x, y, w, hh], rot: [cx(x + w / 2), cy(y - 22)], scl: [cx(x + w + 6), cy(y + hh + 6)] };
  }
  function drawOverlay() {
    const c = octx, W0 = over.width, H0 = over.height, k = k1920();
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W0, H0);
    if (A.onion && !A.playing && A.ghosts && A.ghosts.frame === curFrame) { c.globalAlpha = .28; for (const g of A.ghosts.imgs) c.drawImage(g, 0, 0, W0, H0); c.globalAlpha = 1; }
    // drawings near this frame
    for (const d of Store.all()) if (d.kind === 'draw' && Math.abs(d.frame - curFrame) <= 12) {
      c.globalAlpha = d.frame === curFrame ? 1 : .35 * (1 - Math.abs(d.frame - curFrame) / 13);
      for (const s of d.strokes || []) { c.strokeStyle = s.c; c.lineWidth = (s.w || 5) * k; c.lineCap = c.lineJoin = 'round'; c.beginPath(); s.p.forEach((p, i) => i ? c.lineTo(p[0] * k, p[1] * k) : c.moveTo(p[0] * k, p[1] * k)); c.stroke(); }
      c.globalAlpha = 1;
    }
    if (A.stroke) { const s = A.stroke; c.strokeStyle = s.c; c.lineWidth = s.w * k; c.lineCap = c.lineJoin = 'round'; c.beginPath(); s.p.forEach((p, i) => i ? c.lineTo(p[0] * k, p[1] * k) : c.moveTo(p[0] * k, p[1] * k)); c.stroke(); }
    if (A.sel && A.sel.type === 'actor' && keyOf(A.sel.id) === 'camera') { c.strokeStyle = 'rgba(121,184,214,.9)'; c.setLineDash([8, 6]); c.lineWidth = 2; c.strokeRect(6, 6, W0 - 12, H0 - 12); c.setLineDash([]); }
    const hs = handles(), js = jointsScreen();
    if (hs && A.tool === 'select') {
      const [x, y, w, hh] = hs.box;
      c.strokeStyle = 'rgba(214,160,100,.95)'; c.lineWidth = 1.5; c.setLineDash([6, 5]); c.strokeRect(x - 3, y - 3, w + 6, hh + 6); c.setLineDash([]);
      c.fillStyle = '#d6a064'; c.strokeStyle = '#121419'; c.lineWidth = 2;
      c.beginPath(); c.arc(hs.rot[0], hs.rot[1], 6, 0, 7); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(hs.rot[0], hs.rot[1] + 6); c.lineTo(hs.rot[0], y - 3); c.strokeStyle = 'rgba(214,160,100,.7)'; c.lineWidth = 1; c.stroke();
      c.fillStyle = '#d6a064'; c.strokeStyle = '#121419'; c.lineWidth = 2; c.fillRect(hs.scl[0] - 5, hs.scl[1] - 5, 10, 10); c.strokeRect(hs.scl[0] - 5, hs.scl[1] - 5, 10, 10);
    }
    if (js && A.tool === 'select') {
      const byId = Object.fromEntries(js.joints.map(j => [j.id, j]));
      c.lineWidth = 3; c.strokeStyle = 'rgba(18,20,25,.8)';
      for (const [a, b] of js.bones) { const p = byId[a], q = byId[b]; if (p && q) { c.beginPath(); c.moveTo(p.s[0], p.s[1]); c.lineTo(q.s[0], q.s[1]); c.stroke(); } }
      c.lineWidth = 1.6; c.strokeStyle = 'rgba(121,184,214,.95)';
      for (const [a, b] of js.bones) { const p = byId[a], q = byId[b]; if (p && q) { c.beginPath(); c.moveTo(p.s[0], p.s[1]); c.lineTo(q.s[0], q.s[1]); c.stroke(); } }
      for (const j of js.joints) {
        const hot = A.drag && A.drag.joint === j.id, r = j.param === 'root' ? 7 : j.id === 'tip' ? 7 : 5.5;
        c.fillStyle = j.param === 'root' ? '#d6a064' : j.id === 'tip' ? '#f0c75e' : '#79b8d6'; c.strokeStyle = '#0d0f13'; c.lineWidth = 2;
        c.beginPath(); if (j.param === 'root') c.rect(j.s[0] - r, j.s[1] - r, 2 * r, 2 * r); else c.arc(j.s[0], j.s[1], hot ? r + 2 : r, 0, 7); c.fill(); c.stroke();
      }
    }
    // keyframe marker for the selected actor
    if (A.sel && A.sel.type === 'actor') {
      const k2 = (KEYS.get(A.sel.id + '|' + curShot) || []).find(k => k.frame === curFrame);
      if (k2 || (A.live && A.live.frame === curFrame)) { c.fillStyle = '#f0c75e'; c.font = `600 ${Math.round(12 * Math.max(1, k * 1.4))}px Hanken Grotesk, sans-serif`; c.fillText('◆ keyframe', 12, H0 - 12); }
    }
  }
  function makeGhosts() {
    if (!A.onion || A.playing) { A.ghosts = null; return; }
    const imgs = [];
    for (const df of [-3, 3]) {
      const f = curFrame + df; if (f < 0 || f >= NFR || shotOfFrame(f) !== curShot) continue;
      const c = document.createElement('canvas'); c.width = pick.width; c.height = pick.height;
      const g = c.getContext('2d'); patch(g);
      const saveF = curFrame; curFrame = f; INST.frame(g, f / FPSs); curFrame = saveF;
      imgs.push(c);
    }
    A.ghosts = { frame: curFrame, imgs };
  }

  // ---- stage pointer: pick, pose, move, rotate, scale, draw ----
  function stagePt(e) { const r = over.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * over.width, (e.clientY - r.top) / r.height * over.height]; }
  const inv = (js, p) => { const q = js.m.inverse().transformPoint({ x: p[0] / js.kk, y: p[1] / js.kk }); return [q.x, q.y]; };
  function liveKey(aid) {
    if (A.live && A.live.aid === aid && A.live.frame === curFrame) return A.live;
    const ex = Store.get(`key:${aid}:${curFrame}`);
    const sk = A.info && A.info.skel, fn = sk && sk.key === keyOf(aid) ? sk.fn : (A.info && (A.info.actors.find(a => a.key === keyOf(aid)) || {}).fn) || actorMeta(keyOf(aid)).fn;
    A.live = ex ? JSON.parse(JSON.stringify(ex)) : { id: `key:${aid}:${curFrame}`, kind: 'key', aid, key: keyOf(aid), fn, shot: curShot, frame: curFrame, dx: 0, dy: 0, rot: 0, sc: 1, d: {}, set: {} };
    return A.live;
  }
  function commitLive() {
    if (!A.live) return;
    const k = A.live; A.live = null;
    const empty = !k.dx && !k.dy && !k.rot && (k.sc || 1) === 1 && !Object.values(k.d || {}).some(v => Math.abs(v) > 1e-6) && !Object.keys(k.set || {}).length && !k.hide;
    if (empty) Store.del(k.id); else Store.put(k);
  }
  over.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    const p = stagePt(e);
    cap(over, e);
    if (A.playing) togglePlay();
    if (A.tool === 'draw') { A.stroke = { c: A.pen, w: 6, p: [[p[0] / k1920(), p[1] / k1920()]] }; drawOverlay(); return; }
    const js = jointsScreen(), hs = handles();
    if (js) for (const j of js.joints) if (Math.hypot(j.s[0] - p[0], j.s[1] - p[1]) < 11) { A.drag = { kind: 'joint', joint: j.id, js, last: p }; return; }
    if (hs) {
      if (Math.hypot(hs.rot[0] - p[0], hs.rot[1] - p[1]) < 10) { A.drag = { kind: 'rot', last: p }; return; }
      if (Math.abs(hs.scl[0] - p[0]) < 9 && Math.abs(hs.scl[1] - p[1]) < 9) { A.drag = { kind: 'scale', last: p }; return; }
    }
    if (A.sel && A.sel.type === 'actor' && keyOf(A.sel.id) === 'camera' && !A.camClick) { A.drag = { kind: 'maybeCamera', start: p, last: p }; return; }
    A.camClick = false;
    const hit = pickAt(p[0], p[1]);
    if (hit && hit === selKeyForFrame()) { A.drag = { kind: 'move', last: p }; return; }   // drag what is selected
    if (hit) {                                          // characters, animals and props can be grabbed at once; sets need a click first
      select({ type: 'actor', id: aidOf(hit, curShot) });
      if (!isShotBound(hit)) A.drag = { kind: 'maybeMove', start: p, last: p };
    }
    else select({ type: 'act', id: String(curShot) });
    render();
  });
  over.addEventListener('pointermove', e => {
    const p = stagePt(e);
    if (A.stroke) { A.stroke.p.push([p[0] / k1920(), p[1] / k1920()]); drawOverlay(); return; }
    if (!A.drag) {                                       // cursor feedback
      const js = jointsScreen(); let hot = false;
      if (js) for (const j of js.joints) if (Math.hypot(j.s[0] - p[0], j.s[1] - p[1]) < 11) hot = true;
      over.classList.toggle('grab', hot); return;
    }
    const d = A.drag;
    if (d.kind === 'maybeMove' || d.kind === 'maybeCamera') { if (Math.hypot(p[0] - d.start[0], p[1] - d.start[1]) < 4) return; d.kind = d.kind === 'maybeMove' ? 'move' : 'camera'; }
    if (!A.sel || A.sel.type !== 'actor') return;
    const aid = A.sel.id, key = liveKey(aid);
    const sk = A.info && A.info.skel;
    const m = sk && sk.key === keyOf(aid) ? { m: sk.m, kk: sk.k } : { m: new DOMMatrix([k1920() * 100, 0, 0, -k1920() * 100, 0, 0]), kk: 1 };
    const w0 = inv(m, d.last), w1 = inv(m, p);
    if (d.kind === 'move') { key.dx += w1[0] - w0[0]; key.dy += w1[1] - w0[1]; }
    else if (d.kind === 'camera') { const cs = A.info.cam ? A.info.cam.s * k1920() : 400 * k1920(); key.dx += (p[0] - d.last[0]) / cs; key.dy -= (p[1] - d.last[1]) / cs; }
    else if (d.kind === 'rot' || d.kind === 'scale') {
      const an = sk && sk.anchor ? sk.anchor : w0;
      if (d.kind === 'rot') { const a0 = Math.atan2(w0[1] - an[1], w0[0] - an[0]), a1 = Math.atan2(w1[1] - an[1], w1[0] - an[0]); let da = a1 - a0; da = Math.atan2(Math.sin(da), Math.cos(da)); key.rot = (key.rot || 0) + da; }
      else { const r0 = Math.hypot(w0[0] - an[0], w0[1] - an[1]), r1 = Math.hypot(w1[0] - an[0], w1[1] - an[1]); if (r0 > 1e-3) key.sc = Math.max(.1, (key.sc || 1) * r1 / r0); }
    } else if (d.kind === 'joint') {
      const js = jointsScreen() || d.js, j = js.joints.find(q => q.id === d.joint);
      if (!j) return;
      if (j.param === 'root') { key.dx += w1[0] - w0[0]; key.dy += w1[1] - w0[1]; }
      else {
        const par = js.joints.find(q => q.id === j.parent);
        if (!par) return;
        if (j.mode === 'dx') key.d[j.param] = (key.d[j.param] || 0) + (w1[0] - w0[0]);
        else {
          const pw = inv(js, par.s), jw = inv(js, j.s), mw = inv(js, p);
          let da = Math.atan2(mw[1] - pw[1], mw[0] - pw[0]) - Math.atan2(jw[1] - pw[1], jw[0] - pw[0]);
          da = Math.atan2(Math.sin(da), Math.cos(da));
          key.d[j.param] = (key.d[j.param] || 0) + da * j.sign;
        }
      }
    }
    d.last = p;
    render();
  });
  over.addEventListener('pointerup', e => {
    if (A.stroke) {
      const s = A.stroke; A.stroke = null;
      if (s.p.length > 1) {
        const tg = targetOf(A.sel) || { type: 'act', id: String(curShot) }, id = `draw:${curFrame}:${tg.type}:${tg.id}`;
        const c = Store.get(id) || { id, kind: 'draw', frame: curFrame, shot: curShot, target: tg, strokes: [] };
        const pts = s.p.filter((q, i) => i % 2 === 0 || i === s.p.length - 1).map(q => [Math.round(q[0]), Math.round(q[1])]);
        c.strokes = (c.strokes || []).concat([{ c: s.c, w: s.w, p: pts }]);
        Store.put(JSON.parse(JSON.stringify(c)));
      }
      drawOverlay(); return;
    }
    if (A.drag) {
      const was = A.drag.kind; A.drag = null;
      if (was === 'maybeCamera') {                         // a click (not a drag) with the camera selected picks what is under it
        A.camClick = true; over.dispatchEvent(new PointerEvent('pointerdown', { clientX: e.clientX, clientY: e.clientY, button: 0, pointerId: e.pointerId, bubbles: true }));
        over.dispatchEvent(new PointerEvent('pointerup', { clientX: e.clientX, clientY: e.clientY, button: 0, pointerId: e.pointerId, bubbles: true })); return;
      }
      if (was !== 'maybeMove') { commitLive(); renderInsp(); }
      render();
    }
  });
  over.addEventListener('wheel', e => {
    if (!A.sel || A.sel.type !== 'actor' || keyOf(A.sel.id) !== 'camera') return;
    e.preventDefault(); const key = liveKey(A.sel.id); key.sc = Math.max(.2, (key.sc || 1) * (e.deltaY < 0 ? 1.04 : 1 / 1.04)); render(); clearTimeout(A.wheelT); A.wheelT = setTimeout(() => { commitLive(); renderInsp(); }, 300);
  }, { passive: false });

  // ------------------------------------------------------------------ transport
  function updateTransport() {
    $('#tcTime').textContent = fmtT(A.t);
    $('#tcFrame').textContent = 'f ' + curFrame + ' · ' + (A.t - shotT0(curShot)).toFixed(2) + 's in';
    const s = tlShot(curShot), ms = Object.entries(s.moments).filter(([, m]) => { const v = Array.isArray(m.t) ? m.t : [m.t], lt = A.t - shotT0(curShot); return v.some(x => Math.abs(x - lt) < .5 / FPSs + 1e-6) || (v.length === 2 && lt >= v[0] && lt <= v[1]); });
    $('#where').innerHTML = `<b>${curShot} · ${esc(s.name)}</b>` + (ms.length ? `<span class="mo">${ms.map(([k]) => esc(k)).join(' ')}</span>` : '');
    drawTL();
  }
  function setT(t, snap = true) {
    A.t = Math.max(0, Math.min(NFR / FPSs - 1e-4, t));
    if (snap) A.t = fr(A.t) / FPSs;
    if (A.onion) makeGhosts();
    render();
    if (A.sel && ['actor', 'sound'].includes(A.sel.type)) renderInspLight();
  }
  async function togglePlay() {
    if (A.playing) {
      A.playing = false; Snd.stop(); document.body.classList.remove('playing'); setT(A.t); return;
    }
    A.playing = true; document.body.classList.add('playing');
    const t0 = A.t >= NFR / FPSs - .05 ? 0 : A.t;
    A.t = t0;
    let c0 = null;
    if (A.speed === 1) c0 = await Snd.play(t0, mixItems());
    if (!A.playing) return;
    A.clock = { t0, c0, p0: performance.now() };
    const tick = () => {
      if (!A.playing) return;
      let t = A.clock.c0 != null ? A.clock.t0 + Math.max(0, Snd.now() - A.clock.c0) : A.clock.t0 + (performance.now() - A.clock.p0) / 1000 * A.speed;
      const end = A.loop ? shotT1(curShot) : NFR / FPSs;
      if (t >= end - 1e-3) {
        if (A.loop) { const s = shotT0(curShot); A.playing = false; Snd.stop(); A.t = s; togglePlay(); return; }
        A.t = end - 1 / FPSs; togglePlay(); return;
      }
      A.t = t;
      if (fr(t) !== curFrame || A.loop) render(); else drawTL();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  function allMoments() {
    const out = [];
    for (const s of TIMELINE.shots) for (const k in s.moments) { const v = s.moments[k].t; (Array.isArray(v) ? v : [v]).forEach((x, i) => out.push({ shot: s.n, name: k, t: s.from / FPSs + x, i })); }
    return out.sort((a, b) => a.t - b.t);
  }
  function stepMoment(dir) {
    const ms = allMoments(), eps = 1 / FPSs / 2;
    const m = dir > 0 ? ms.find(q => q.t > A.t + eps) : [...ms].reverse().find(q => q.t < A.t - eps);
    if (m) { setT(m.t); select({ type: 'event', id: m.shot + ':' + m.name }, false); }
  }
  function stepBeat(dir) {
    const b = SD.beats, eps = .02;
    const x = dir > 0 ? b.find(q => q > A.t + eps) : [...b].reverse().find(q => q < A.t - eps);
    if (x != null) setT(x);
  }
  $('#bPlay').onclick = togglePlay;
  $('#bPrevF').onclick = () => setT(A.t - 1 / FPSs);
  $('#bNextF').onclick = () => setT(A.t + 1 / FPSs);
  $('#bPrevEv').onclick = () => stepMoment(-1);
  $('#bNextEv').onclick = () => stepMoment(1);
  const setTool = t => { A.tool = t; $('#tSelect').classList.toggle('on', t === 'select'); $('#tDraw').classList.toggle('on', t === 'draw'); over.classList.toggle('draw', t === 'draw'); $('#drawBar').hidden = t !== 'draw'; drawOverlay(); };
  $('#tSelect').onclick = () => setTool('select');
  $('#tDraw').onclick = () => setTool('draw');
  document.querySelectorAll('#drawBar .sw').forEach(b => b.onclick = () => { A.pen = b.dataset.c; document.querySelectorAll('#drawBar .sw').forEach(x => x.classList.toggle('on', x === b)); });
  $('#bUndoStroke').onclick = () => {
    const d = Store.all().filter(c => c.kind === 'draw' && c.frame === curFrame).sort((a, b) => b.updated - a.updated)[0];
    if (!d) return toast('No drawing on this frame');
    const c = JSON.parse(JSON.stringify(d)); c.strokes.pop();
    if (c.strokes.length) Store.put(c); else Store.del(c.id);
  };
  const toggle = (id, prop, fn) => { const b = $(id); b.onclick = () => { A[prop] = !A[prop]; b.setAttribute('aria-pressed', A[prop]); if (fn) fn(); }; };
  toggle('#oEdits', 'edits', () => { applyTiming(); if (A.playing) { togglePlay(); } render(); renderInsp(); toast(A.edits ? 'Showing your edits' : 'Showing the checkpoint as it is'); });
  toggle('#oOnion', 'onion', () => { makeGhosts(); drawOverlay(); });
  toggle('#oLoop', 'loop');
  $('#oSpeed').onchange = e => { A.speed = +e.target.value; if (A.playing) { togglePlay(); togglePlay(); } };

  // ------------------------------------------------------------------ timeline
  const tlc = $('#tlc'), tctx = tlc.getContext('2d'), tip = $('#tlTip');
  const ROW = { ruler: [0, 22], acts: [24, 50], events: [52, 80], beds: [84, 88], sounds: [90, 138], changes: [142, 160], actor: [164, 182] };
  let TLITEMS = [];
  function tlResize() { const r = tlc.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1); tlc.width = Math.max(10, r.width * dpr); tlc.height = Math.max(10, r.height * dpr); }
  const tx = t => (t - A.view[0]) / (A.view[1] - A.view[0]) * (tlc.width / tlDpr());
  const txInv = x => A.view[0] + x / (tlc.width / tlDpr()) * (A.view[1] - A.view[0]);
  const tlDpr = () => Math.min(2, window.devicePixelRatio || 1);
  let tlReq = 0;
  function drawTL() { if (!tlReq) tlReq = requestAnimationFrame(() => { tlReq = 0; drawTLnow(); }); }
  function drawTLnow() {
    const dpr = tlDpr(), W0 = tlc.width / dpr, H0 = tlc.height / dpr, c = tctx;
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W0, H0);
    TLITEMS = [];
    const [v0, v1] = A.view, pps = W0 / (v1 - v0);
    c.font = '11px "JetBrains Mono", monospace'; c.textBaseline = 'middle';
    // row labels background
    const lab = (y, txt) => { c.fillStyle = '#5d6572'; c.font = '600 9px "Hanken Grotesk", sans-serif'; c.fillText(txt, 4, y); c.font = '11px "JetBrains Mono", monospace'; };
    // beats and seconds
    const step = [.5, 1, 2, 5, 10, 15, 30].find(q => q * pps >= 46) || 30;
    for (const b of SD.beats) { if (b < v0 || b > v1) continue; const x = tx(b); c.fillStyle = 'rgba(255,255,255,.06)'; c.fillRect(x, ROW.acts[0], 1, H0 - ROW.acts[0]); }
    for (let s = Math.ceil(v0 / step) * step; s <= v1; s += step) { const x = tx(s); c.fillStyle = '#3a404d'; c.fillRect(x, 14, 1, 8); c.fillStyle = '#8d95a2'; c.fillText(fmtT(s).replace(/\.00$/, ''), x + 3, 8); }
    // acts
    for (const s of TIMELINE.shots) {
      const x0 = tx(s.from / FPSs), x1 = tx(s.to / FPSs); if (x1 < 0 || x0 > W0) continue;
      const sel = A.sel && A.sel.type === 'act' && +A.sel.id === s.n, cur = s.n === curShot;
      c.fillStyle = sel ? '#3a2e22' : cur ? '#262b35' : (s.n % 2 ? '#20242d' : '#1c2028'); c.fillRect(x0 + .5, ROW.acts[0], x1 - x0 - 1, ROW.acts[1] - ROW.acts[0]);
      if (sel) { c.strokeStyle = '#d6a064'; c.lineWidth = 1.5; c.strokeRect(x0 + 1, ROW.acts[0] + .5, x1 - x0 - 2, ROW.acts[1] - ROW.acts[0] - 1); }
      c.save(); c.beginPath(); c.rect(x0 + 2, ROW.acts[0], x1 - x0 - 4, 26); c.clip();
      c.fillStyle = cur || sel ? '#ece7dd' : '#9aa1ad'; c.font = '600 11px "Hanken Grotesk", sans-serif'; c.fillText((x1 - x0 > 60 ? s.n + ' ' + s.name : String(s.n)), x0 + 5, (ROW.acts[0] + ROW.acts[1]) / 2);
      c.restore(); c.font = '11px "JetBrains Mono", monospace';
      if (Store.get('note:act:' + s.n)) { c.fillStyle = '#9fd49a'; c.beginPath(); c.arc(x1 - 7, ROW.acts[0] + 6, 3, 0, 7); c.fill(); }
      TLITEMS.push({ r: [x0, ROW.acts[0], x1 - x0, 26], kind: 'act', shot: s.n, tip: `Shot ${s.n} · ${s.name}\n${s.summary}` });
    }
    // events (moments)
    for (const s of TIMELINE.shots) for (const k in s.moments) {
      const v = s.moments[k].t, t0 = s.from / FPSs, vals = Array.isArray(v) ? v : [v];
      const ov = SD.timeline.shots[s.n - 1].moments[k].t, moved = JSON.stringify(ov) !== JSON.stringify(v);
      const sel = A.sel && A.sel.type === 'event' && A.sel.id === s.n + ':' + k;
      const y = ROW.events[0] + 13;
      if (vals.length === 2) { const a = tx(t0 + vals[0]), b = tx(t0 + vals[1]); c.fillStyle = sel ? 'rgba(240,199,94,.55)' : 'rgba(240,199,94,.22)'; c.fillRect(a, y - 3, Math.max(2, b - a), 6); }
      if (moved) { const ovals = Array.isArray(ov) ? ov : [ov]; c.strokeStyle = 'rgba(240,199,94,.5)'; c.setLineDash([2, 2]); c.beginPath(); c.moveTo(tx(t0 + ovals[0]), y); c.lineTo(tx(t0 + vals[0]), y); c.stroke(); c.setLineDash([]); }
      vals.forEach((x, i) => {
        if (vals.length === 2 && i === 1) return;
        const X = tx(t0 + x); if (X < -8 || X > W0 + 8) return;
        c.fillStyle = sel ? '#f0c75e' : moved ? '#ffdd88' : '#c9a24a'; c.beginPath(); c.moveTo(X, y - 6); c.lineTo(X + 5, y); c.lineTo(X, y + 6); c.lineTo(X - 5, y); c.closePath(); c.fill();
        if (sel) { c.strokeStyle = '#fff'; c.lineWidth = 1; c.stroke(); }
        TLITEMS.push({ r: [X - 6, ROW.events[0], 12, 28], kind: 'event', shot: s.n, name: k, i, tip: `${k}  ${s.moments[k].what}\nshot ${s.n}, ${x.toFixed(2)} s in${moved ? ' (moved)' : ''}\nDrag to move it; its sounds move with it.` });
      });
      if (pps > 55) { const X = tx(t0 + vals[0]); c.fillStyle = '#8d95a2'; c.font = '10px "JetBrains Mono", monospace'; c.fillText(k.replace(/^T_/, ''), X + 6, ROW.events[0] + 22); c.font = '11px "JetBrains Mono", monospace'; }
    }
    // sounds: beds as thin bars, the rest packed in lanes
    const lanes = [-1e9, -1e9, -1e9, -1e9];
    const lh = (ROW.sounds[1] - ROW.sounds[0]) / lanes.length;
    const sorted = SD.sounds.map(s => ({ s, t: soundTime(s) })).sort((a, b) => a.t - b.t);
    for (const { s, t } of sorted) {
      const e = soundEdit(s), x0 = tx(t), x1 = Math.max(x0 + 3, tx(t + s.dur));
      const selS = A.sel && A.sel.type === 'sound' && A.sel.id === s.id;
      const hl = A.sel && A.sel.type === 'actor' && s.actor && s.actor === keyOf(A.sel.id);
      if (s.kind === 'bed') { if (x1 < 0 || x0 > W0) continue; c.fillStyle = 'rgba(111,125,140,.45)'; c.fillRect(x0, ROW.beds[0], x1 - x0, 4); continue; }
      let L = lanes.findIndex(v => v < x0 - 1); if (L < 0) L = lanes.indexOf(Math.min(...lanes));
      lanes[L] = x1;
      if (x1 < 0 || x0 > W0) continue;
      const y = ROW.sounds[0] + L * lh;
      c.globalAlpha = e && e.mute ? .25 : (A.sel && A.sel.type === 'actor' && !hl ? .35 : 1);
      c.fillStyle = s.kind === 'step' ? '#6a6150' : SNDC[s.cat] || '#999'; c.fillRect(x0, y + 1, x1 - x0, lh - 3);
      c.globalAlpha = 1;
      if (e) { c.fillStyle = '#f0c75e'; c.fillRect(x0, y + 1, 2, lh - 3); }
      if (selS) { c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.strokeRect(x0 - .5, y + .5, x1 - x0 + 1, lh - 2); }
      TLITEMS.push({ r: [x0, y, Math.max(6, x1 - x0), lh], kind: 'sound', id: s.id, tip: `${s.comment || s.model}\n${s.model} · ${actorMeta(s.actor || '').name || ''} · ${fmtT(t)}${e ? '\n(edited)' : ''}` });
    }
    for (const c2 of Store.all()) if (c2.kind === 'newsound') { const x0 = tx(c2.t); c.fillStyle = SNDC.upload; c.fillRect(x0, ROW.sounds[0] + 3 * lh + 1, 30, lh - 3); TLITEMS.push({ r: [x0, ROW.sounds[0] + 3 * lh, 30, lh], kind: 'newsound', id: c2.id, t: c2.t, tip: 'Your sound: ' + (c2.name || '') }); }
    // changes
    for (const ch of Store.all()) {
      let t = null, col = '#9fd49a', shape = 'dot', tipTxt = '';
      if (ch.kind === 'key') { t = ch.frame / FPSs; col = '#f0c75e'; shape = 'diamond'; tipTxt = 'Pose keyframe: ' + actorName(ch.aid); }
      else if (ch.kind === 'draw') { t = ch.frame / FPSs; col = '#ffb347'; shape = 'square'; tipTxt = 'Drawing'; }
      else if (ch.kind === 'note') { const tg = ch.target; t = tg.type === 'event' ? momentT0(+tg.id.split(':')[0], tg.id.split(':')[1]) : tg.type === 'act' ? shotT0(+tg.id) : tg.type === 'action' ? momentT0(+tg.id.split(':')[0], tg.id.split(':')[1]) : tg.type === 'sound' ? soundTime(SD.sounds.find(s => s.id === tg.id) || { t: 0 }) : null; tipTxt = 'Note: ' + (ch.text || '').slice(0, 80); }
      else if (ch.kind === 'timing') { t = momentT0(ch.shot, ch.moment); col = '#ffdd88'; shape = 'diamond'; tipTxt = 'Moved ' + ch.moment; }
      else if (ch.kind === 'sound') { const s = SD.sounds.find(q => q.id === ch.sid); if (s) t = soundTime(s); col = '#f0c75e'; tipTxt = 'Sound edit'; }
      if (t == null) continue;
      const X = tx(t), y = (ROW.changes[0] + ROW.changes[1]) / 2; if (X < -6 || X > W0 + 6) continue;
      c.fillStyle = col; c.beginPath();
      if (shape === 'diamond') { c.moveTo(X, y - 5); c.lineTo(X + 4, y); c.lineTo(X, y + 5); c.lineTo(X - 4, y); } else if (shape === 'square') c.rect(X - 3.5, y - 3.5, 7, 7); else c.arc(X, y, 3.5, 0, 7);
      c.fill();
      TLITEMS.push({ r: [X - 5, ROW.changes[0], 10, 18], kind: 'change', id: ch.id, t, tip: tipTxt });
    }
    // the selected actor's lane: where it is drawn, and its keyframes
    if (A.sel && A.sel.type === 'actor') {
      const meta = actorMeta(keyOf(A.sel.id)), sb = shotBoundOf(A.sel.id);
      for (const s in meta.shots) { if (sb && +s !== sb) continue; const [f0, f1] = meta.shots[s]; const a = tx(f0 / FPSs), b = tx((f1 + 1) / FPSs); c.fillStyle = 'rgba(214,160,100,.28)'; c.fillRect(a, ROW.actor[0], b - a, 18); }
      c.fillStyle = '#d6a064'; c.font = '600 10px "Hanken Grotesk", sans-serif'; c.fillText(actorName(A.sel.id), 4, ROW.actor[0] + 9);
    }
    lab(ROW.beds[0] + 2, '');
    // playhead
    const X = tx(A.t); c.fillStyle = '#d6a064'; c.fillRect(X - .75, 0, 1.5, H0);
    c.beginPath(); c.moveTo(X - 6, 0); c.lineTo(X + 6, 0); c.lineTo(X, 8); c.closePath(); c.fill();
  }
  function tlHit(x, y) { for (let i = TLITEMS.length - 1; i >= 0; i--) { const it = TLITEMS[i], r = it.r; if (x >= r[0] - 2 && x <= r[0] + r[2] + 2 && y >= r[1] && y <= r[1] + r[3]) return it; } return null; }
  const tlPt = e => { const r = tlc.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  tlc.addEventListener('pointerdown', e => {
    const [x, y] = tlPt(e); cap(tlc, e);
    if (A.playing) togglePlay();
    const it = y < ROW.acts[0] ? null : tlHit(x, y);
    if (!it) { A.tdrag = { kind: 'scrub' }; setT(txInv(x)); return; }
    const wide = A.view[1] - A.view[0] > 16;              // zoomed out: a click zooms into the shot first, so drags are precise
    if (it.kind === 'act') { select({ type: 'act', id: String(it.shot) }); A.tdrag = { kind: 'scrub' }; setT(txInv(x)); return; }
    if (it.kind === 'event') {
      select({ type: 'event', id: it.shot + ':' + it.name }); const v = momentVal(it.shot, it.name);
      setT(momentT0(it.shot, it.name) + (Array.isArray(v) ? v[it.i] - v[0] : 0));
      if (wide) { zoomTo(it.shot); return; }
      A.tdrag = { kind: 'event', it, x0: x, orig: JSON.parse(JSON.stringify(v)), moved: false }; return;
    }
    if (it.kind === 'sound') {
      select({ type: 'sound', id: it.id }); const s = SD.sounds.find(q => q.id === it.id); setT(soundTime(s));
      if (wide) { zoomTo(s.shot); return; }
      A.tdrag = { kind: 'sound', it, x0: x, shift0: (soundEdit(s) || {}).shift || 0, moved: false }; Store.begin('sound:' + s.id); return;
    }
    if (it.kind === 'change') { const ch = Store.get(it.id); if (ch) { selectChangeTarget(ch); setT(it.t); } return; }
    if (it.kind === 'newsound') { setT(it.t); return; }
  });
  tlc.addEventListener('pointermove', e => {
    const [x, y] = tlPt(e);
    if (!A.tdrag) {
      const it = y < ROW.acts[0] ? null : tlHit(x, y);
      if (it && it.tip) { tip.hidden = false; tip.textContent = it.tip; const r = tlc.getBoundingClientRect(); tip.style.left = Math.min(x + 12, r.width - 330) + 'px'; tip.style.top = Math.max(0, y - 58) + 'px'; } else tip.hidden = true;
      return;
    }
    tip.hidden = true;
    const d = A.tdrag;
    if (d.kind === 'scrub') { setT(txInv(x)); return; }
    const dt = Math.round((txInv(x) - txInv(d.x0)) * FPSs) / FPSs;
    if (d.kind === 'event') {
      if (!d.moved && Math.abs(x - d.x0) < 3) return; d.moved = true;
      const m = tlShot(d.it.shot).moments[d.it.name];
      m.t = Array.isArray(d.orig) ? d.orig.map(v => +(v + dt).toFixed(4)) : +(d.orig + dt).toFixed(4);
      delete _MOMENTS[tlShot(d.it.shot).name];
      setT(momentT0(d.it.shot, d.it.name));
    } else if (d.kind === 'sound') {
      if (!d.moved && Math.abs(x - d.x0) < 3) return; d.moved = true;
      const s = SD.sounds.find(q => q.id === d.it.id), e2 = soundEdit(s) || { id: 'sound:' + s.id, kind: 'sound', sid: s.id };
      d.pending = Object.assign({}, e2, { shift: Math.round(d.shift0 + dt * 1000) });
      Store.put(d.pending, { undo: false }); drawTL();
    }
  });
  tlc.addEventListener('pointerup', () => {
    const d = A.tdrag; A.tdrag = null;
    if (!d) return;
    if (d.kind === 'event' && d.moved) {
      const s = d.it.shot, name = d.it.name, to = momentVal(s, name), from = SD.timeline.shots[s - 1].moments[name].t;
      if (JSON.stringify(to) === JSON.stringify(from)) Store.del(`timing:${s}:${name}`);
      else Store.put({ id: `timing:${s}:${name}`, kind: 'timing', shot: s, moment: name, from, to });
    }
    if (d.kind === 'sound') Store.commit('sound:' + d.it.id);
  });
  tlc.addEventListener('pointerleave', () => { tip.hidden = true; });
  tlc.addEventListener('wheel', e => {
    e.preventDefault();
    const [x] = tlPt(e), t = txInv(x), [v0, v1] = A.view, span = v1 - v0, full = NFR / FPSs;
    if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) { const d = (e.deltaX || e.deltaY) / 600 * span; A.view = clampView([v0 + d, v1 + d]); }
    else { const f = e.deltaY < 0 ? .85 : 1 / .85, ns = Math.max(1.5, Math.min(full, span * f)), a = (t - v0) / span; A.view = clampView([t - a * ns, t - a * ns + ns]); }
    drawTL();
  }, { passive: false });
  tlc.addEventListener('dblclick', e => { const [x, y] = tlPt(e); const it = tlHit(x, y); if (it && it.kind === 'act') zoomTo(it.shot); else { A.view = [0, NFR / FPSs]; drawTL(); } });
  function clampView([a, b]) { const full = NFR / FPSs, s = b - a; if (a < 0) { a = 0; b = s; } if (b > full) { b = full; a = full - s; } return [Math.max(0, a), b]; }
  function zoomTo(shot) { const a = shotT0(shot), b = shotT1(shot), pad = (b - a) * .08; A.view = clampView([a - pad, b + pad]); drawTL(); }

  // ------------------------------------------------------------------ selection
  function targetOf(sel) {
    if (!sel) return null;
    return { type: sel.type, id: sel.id };
  }
  function select(sel, jump = false) {
    A.sel = sel; A.cut = null; A.spec = null;
    if (sel && sel.type === 'actor' && jump) {
      const sh = actorShots(sel.id); const cur = sh.includes(curShot);
      if (!cur && sh.length) { const [f0, f1] = actorMeta(keyOf(sel.id)).shots[sh[0]]; setT(((f0 + f1) >> 1) / FPSs); zoomTo(sh[0]); }
    }
    renderInsp(); render(); drawTL();
  }
  function selectChangeTarget(ch) {
    if (ch.kind === 'key') select({ type: 'actor', id: ch.aid });
    else if (ch.kind === 'timing') select({ type: 'event', id: ch.shot + ':' + ch.moment });
    else if (ch.kind === 'sound') select({ type: 'sound', id: ch.sid });
    else if (ch.target) { const tg = ch.target; if (tg.type === 'action') select({ type: 'event', id: tg.id.split(':').slice(0, 2).join(':'), action: tg.id.split(':')[2] }); else if (tg.type === 'film') openDrawer('changes'); else select({ type: tg.type, id: tg.id }); }
  }

  // ------------------------------------------------------------------ inspector
  const insp = $('#insp');
  const tid = tg => tg.type + ':' + tg.id;
  function noteBox(target, placeholder) {
    const id = 'note:' + tid(target), ex = Store.get(id);
    const ta = h('textarea', { rows: 3, placeholder: placeholder || 'What should be different in the next version?', class: ex && ex.text ? 'has' : null });
    ta.value = ex ? ex.text : '';
    let tmo = null;
    ta.addEventListener('input', () => {
      ta.classList.toggle('has', !!ta.value.trim());
      clearTimeout(tmo);
      tmo = setTimeout(() => { if (ta.value.trim()) Store.put({ id, kind: 'note', target, text: ta.value }, { undo: false }); else Store.del(id, { undo: false }); }, 350);
    });
    return h('div', { class: 'sec' }, h('h3', null, 'Note'), ta);
  }
  function refsBox(target) {
    const refs = Store.all().filter(c => c.kind === 'ref' && tid(c.target) === tid(target));
    const grid = h('div', { class: 'refs' });
    for (const r of refs) {
      const url = Store.blobUrl(r), isAudio = (r.mime || '').startsWith('audio');
      const tile = h('div', { class: 'ref' + (isAudio ? ' audio' : ''), title: r.name || '' },
        isAudio ? h('button', { class: 'play', 'aria-label': 'Play ' + (r.name || 'sound'), onclick: async () => { const b = await Snd.decodeUpload(r.id, await Store.blobData(r)); if (b) Snd.preview(b); else toast('Could not play this file'); } }, ic('play')) : (url ? h('img', { src: url, alt: r.name || 'reference image' }) : 'image'),
        isAudio ? h('div', { style: { fontSize: '11px', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' } }, r.name || 'sound') : null,
        h('button', { 'aria-label': 'Remove', onclick: () => Store.del(r.id) }, ic('del')));
      grid.append(tile);
    }
    grid.append(h('div', { class: 'ref add', tabindex: 0, role: 'button', onclick: () => pickFile(target), onkeydown: e => { if (e.key === 'Enter') pickFile(target); } }, ic('plus'), h('div', null, 'Image or sound')));
    const box = h('div', { class: 'sec' }, h('h3', null, 'References', h('span', { class: 'grow' }), h('span', { class: 'muted', style: { textTransform: 'none', letterSpacing: 0, fontWeight: 400 } }, 'drop, paste or add')), grid);
    const audioRefs = refs.filter(r => (r.mime || '').startsWith('audio'));
    if (audioRefs.length && target.type !== 'sound') box.append(h('div', { class: 'row' }, h('button', { class: 'btn tiny', onclick: () => placeSound(audioRefs[audioRefs.length - 1], target) }, 'Place my sound at the playhead')));
    box.addEventListener('dragover', e => { e.preventDefault(); box.classList.add('drop'); });
    box.addEventListener('dragleave', () => box.classList.remove('drop'));
    box.addEventListener('drop', e => { e.preventDefault(); box.classList.remove('drop'); [...e.dataTransfer.files].forEach(f => addRef(target, f)); });
    return box;
  }
  let pickTarget = null;
  function pickFile(target) { pickTarget = target; const f = $('#fUpload'); f.accept = 'image/*,audio/*'; f.value = ''; f.click(); }
  $('#fUpload').addEventListener('change', e => { [...e.target.files].forEach(f => addRef(pickTarget, f)); });
  async function addRef(target, file) {
    if (!target) return;
    const isImg = file.type.startsWith('image/'), isAud = file.type.startsWith('audio/') || /\.(wav|mp3|ogg|m4a|flac|webm)$/i.test(file.name);
    if (!isImg && !isAud) return toast('Add an image or a sound file');
    if (file.size > 12e6) return toast('That file is too big (over 12 MB)');
    const id = 'ref:' + uid();
    let blob;
    if (isImg) blob = await Store.uploadImage(file);
    else blob = { data: await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(file); }), name: file.name, mime: file.type || 'audio/wav' };
    Store.put({ id, kind: 'ref', target, name: file.name, mime: isImg ? file.type : (file.type || 'audio/wav'), blob: { data: blob.data || null, asset: blob.asset || null } });
    if (isAud) Snd.decodeUpload(id, blob.data);
    toast((isImg ? 'Image' : 'Sound') + ' added');
  }
  async function placeSound(ref, target) {
    const b = await Snd.decodeUpload(ref.id, await Store.blobData(ref));
    if (!b) return toast('Could not read that sound file');
    Store.put({ id: 'newsound:' + uid(), kind: 'newsound', t: +A.t.toFixed(4), ref: ref.id, target, name: ref.name, gain: 0 });
    toast('Placed at ' + fmtT(A.t));
  }
  window.addEventListener('paste', e => {
    const items = [...(e.clipboardData || {}).items || []].filter(i => i.kind === 'file');
    if (!items.length || !A.sel) return;
    e.preventDefault(); items.forEach(i => addRef(targetOf(A.sel), i.getAsFile()));
  });

  function soundRow(s, withActor) {
    const e = soundEdit(s), t = soundTime(s);
    return h('div', { class: 'li' },
      h('span', { class: 'dot', style: { '--c': SNDC[s.cat] } }),
      h('div', { class: 'n', title: s.code }, h('span', { class: 't' }, fmtT(t) + ' '), s.comment || s.model, ' ', h('small', null, s.model + (withActor && s.actor ? ' · ' + actorMeta(s.actor).name : '') + (e ? ' · edited' : ''))),
      h('div', { class: 'acts' },
        h('button', { title: 'Play', 'aria-label': 'Play', onclick: () => { const b = e && e.mask && !Snd.maskEmpty(e.mask) ? Snd.editedBuf(s.id, e.mask) : Snd.clip.get(s.id); Snd.load().then(() => Snd.preview(b || Snd.clip.get(s.id), e ? e.gain || 0 : 0)); } }, ic('play')),
        h('button', { title: 'Open', 'aria-label': 'Open', onclick: () => { setT(t); select({ type: 'sound', id: s.id }); } }, ic('jump'))));
  }
  function list(rows, empty) { return rows.length ? h('div', { class: 'list' }, rows) : h('div', { class: 'empty' }, empty); }
  function head(kind, color, title, sub) { return h('div', { class: 'ipHead' }, h('div', { class: 'kind', style: { '--c': color } }, h('i'), kind), h('h2', null, title), sub ? h('div', { class: 'sub' }, sub) : null); }

  function renderInsp() {
    if (document.activeElement && insp.contains(document.activeElement) && document.activeElement.tagName === 'TEXTAREA') return;
    insp.innerHTML = '';
    const sel = A.sel;
    let p;
    if (!sel) p = inspFilm();
    else if (sel.type === 'actor') p = inspActor(sel.id);
    else if (sel.type === 'act') p = inspAct(+sel.id);
    else if (sel.type === 'event') p = inspEvent(sel.id, sel.action);
    else if (sel.type === 'sound') p = inspSound(sel.id);
    insp.append(p);
    if (sel && sel.type === 'actor') drawViewer();
    if (sel && sel.type === 'sound') drawSpec();
  }
  function renderInspLight() {                           // on scrub: refresh only what depends on the frame
    if (A.sel && A.sel.type === 'actor') { const pp = insp.querySelector('#params'); if (pp) pp.replaceWith(paramsBox(A.sel.id)); const kh = insp.querySelector('#keyHere'); if (kh) kh.replaceWith(keyHereBox(A.sel.id)); }
  }
  function inspFilm() {
    return h('div', { class: 'ip' },
      head('The film', 'var(--accent)', 'The Umbrella Walk', `${TIMELINE.shots.length} shots · ${fmtT(NFR / FPSs)} · checkpoint ${SD.checkpoint.commit || 'dev'}`),
      h('div', { class: 'sec' }, h('h3', null, 'How this works'),
        h('div', { class: 'muted' }, 'Click anything in the picture, a shot, a moment or a sound in the timeline. Drag joints to re-pose; each change becomes a keyframe on this frame. Write notes, draw on the frame, add pictures or sounds. Brief turns it all into instructions for an agent.')),
      h('div', { class: 'sec' }, h('h3', null, 'Keys'),
        h('div', { class: 'muted', style: { fontFamily: 'var(--f-mono)', fontSize: '11px', lineHeight: '1.7' } }, 'Space play · ←/→ frame · Shift+←/→ moment · [ ] beat · V select · D draw · E edits on/off · O onion skin · L loop shot · C cast · Ctrl+Z undo · Esc deselect')),
      noteBox({ type: 'film', id: 'film' }, 'A note on the whole film'));
  }
  function inspAct(n) {
    const s = tlShot(n), o = origShot(n), meta = Object.values(SD.actors).filter(a => a.shots[n]);
    const cast = meta.filter(a => !['set', 'fx', 'camera'].includes(a.cat));
    const sets = meta.filter(a => ['set', 'fx', 'camera'].includes(a.cat));
    const chip = a => h('button', { class: 'chip', style: { '--c': CATC[a.cat] }, onclick: () => select({ type: 'actor', id: aidOf(a.key, n) }) }, h('i'), a.name);
    const moments = Object.entries(s.moments).map(([k, m]) => h('div', { class: 'li' }, h('span', { class: 't' }, (Array.isArray(m.t) ? m.t[0] : m.t).toFixed(2)), h('div', { class: 'n' }, h('b', null, k), ' ', h('small', null, m.what)), h('div', { class: 'acts' }, h('button', { 'aria-label': 'Open', onclick: () => { setT(momentT0(n, k)); select({ type: 'event', id: n + ':' + k }); } }, ic('jump')))));
    return h('div', { class: 'ip' },
      head('Shot ' + n + ' · ' + s.space, 'var(--accent)', s.name, s.summary),
      h('div', { class: 'row muted', style: { fontFamily: 'var(--f-mono)', fontSize: '11px' } }, `${fmtT(s.from / FPSs)}–${fmtT(s.to / FPSs)} · ${((s.to - s.from) / FPSs).toFixed(2)} s · frames ${s.from}–${s.to - 1}`),
      h('div', { class: 'sec' }, h('h3', null, 'Who is in it'), h('div', { class: 'chips' }, cast.map(chip))),
      h('div', { class: 'sec' }, h('h3', null, 'Set and camera'), h('div', { class: 'chips' }, sets.map(chip))),
      h('div', { class: 'sec' }, h('h3', null, 'Moments'), list(moments, 'No named moments')),
      noteBox({ type: 'act', id: String(n) }, 'What should this shot do differently?'),
      refsBox({ type: 'act', id: String(n) }));
  }
  function inspEvent(id, actionKey) {
    const [n, name] = [+id.split(':')[0], id.split(':')[1]], s = tlShot(n), m = s.moments[name], om = origShot(n).moments[name];
    const v = m.t, moved = JSON.stringify(v) !== JSON.stringify(om.t);
    const who = SD.eventActors[id] || [];
    const sounds = SD.sounds.filter(q => q.moment && q.moment[0] === n && q.moment[1] === name);
    const nudge = d => {
      const cur = momentVal(n, name), to = Array.isArray(cur) ? cur.map(x => +(x + d).toFixed(4)) : +(cur + d).toFixed(4);
      if (JSON.stringify(to) === JSON.stringify(om.t)) Store.del(`timing:${n}:${name}`); else Store.put({ id: `timing:${n}:${name}`, kind: 'timing', shot: n, moment: name, from: om.t, to });
      setT(momentT0(n, name));
    };
    const vs = x => Array.isArray(x) ? x.map(q => q.toFixed(2)).join(' – ') : x.toFixed(2);
    const act = actionKey ? h('div', { class: 'sec', style: { borderLeft: '2px solid var(--accent)', paddingLeft: '10px' } },
      h('h3', null, actorMeta(actionKey).name + ' in this moment', h('span', { class: 'grow' }),
        h('button', { class: 'btn tiny', title: 'Select them on the stage at this moment, to pose them', onclick: () => { setT(momentT0(n, name)); select({ type: 'actor', id: aidOf(actionKey, n) }); } }, 'Pose')),
      list(sounds.filter(q => q.actor === actionKey).map(q => soundRow(q)), 'No sound of theirs here yet'),
      noteBox({ type: 'action', id: `${n}:${name}:${actionKey}` }, `What should ${actorMeta(actionKey).name} do here?`),
      refsBox({ type: 'action', id: `${n}:${name}:${actionKey}` })) : null;
    return h('div', { class: 'ip' },
      head('Moment · shot ' + n + ' ' + s.name, 'var(--key)', name, m.what),
      h('div', { class: 'sec' }, h('h3', null, 'When'),
        h('div', { class: 'row' },
          h('button', { class: 'btn tiny', onclick: () => nudge(-1 / FPSs), title: 'One frame earlier' }, '−1f'),
          h('span', { style: { fontFamily: 'var(--f-mono)' }, title: 'seconds into the shot' }, vs(v) + ' s'),
          h('button', { class: 'btn tiny', onclick: () => nudge(1 / FPSs), title: 'One frame later' }, '+1f'),
          moved ? h('button', { class: 'btn tiny ghost', onclick: () => { Store.del(`timing:${n}:${name}`); setT(momentT0(n, name)); } }, 'Reset to ' + vs(om.t)) : null),
        h('div', { class: 'muted', style: { fontSize: '12px' } }, 'Or drag its diamond in the timeline. The drawing, its sounds and the music hit on it move together.')),
      h('div', { class: 'sec' }, h('h3', null, 'Who takes part', h('span', { class: 'grow' }), h('span', { class: 'muted', style: { textTransform: 'none', letterSpacing: 0, fontWeight: 400 } }, 'click one for their part')), h('div', { class: 'chips' }, who.map(k => h('button', { class: 'chip' + (k === actionKey ? ' on' : ''), style: { '--c': CATC[actorMeta(k).cat] }, onclick: () => select({ type: 'event', id, action: k === actionKey ? null : k }) }, h('i'), actorMeta(k).name)))),
      act,
      h('div', { class: 'sec' }, h('h3', null, 'Sounds on this moment'), list(sounds.map(q => soundRow(q, true)), 'None')),
      noteBox({ type: 'event', id }, 'What should happen at this moment?'),
      refsBox({ type: 'event', id }));
  }

  // ---- actor ----
  const ENUMS = {
    cat: { 'o.pose': ['crouch', 'walk', 'loaf', 'sit', 'leap'], 'o.eyes': ['open', 'wide', 'happy', 'half'] },
    personSide: { 'ex.eyes': ['open', 'wide', 'happy', 'closed', 'sad', 'cry'], 'ex.mouth': ['smile', 'grin', 'laugh', 'o', 'frown', 'chew', 'cry'] },
    personFront: { 'ex.eyes': ['open', 'wide', 'happy', 'closed', 'sad', 'cry'], 'ex.mouth': ['smile', 'grin', 'laugh', 'o', 'frown', 'chew', 'cry'] },
  };
  const FIRST = { heroSide: ['lean', 'nod', 'smirk', 'umb.ang', 'umb.open', 'sipT'], heroFront: ['lean', 'sway', 'smirk', 'umb.ang', 'umb.open', 'sipT'], personSide: ['lean', 'nod'], personFront: ['sway', 'tilt'] };
  function inspActor(aid) {
    const key = keyOf(aid), meta = actorMeta(key), shots = actorShots(aid);
    const onFrame = A.info && A.info.actors.find(a => a.key === key), fnNow = onFrame ? onFrame.fn : meta.fn;
    const keys = Store.all().filter(c => c.kind === 'key' && c.aid === aid).sort((a, b) => a.frame - b.frame);
    const snds = SD.sounds.filter(s => s.actor === key && s.kind !== 'bed' && (!shotBoundOf(aid) || s.shot === shotBoundOf(aid)));
    const acts = Object.entries(SD.eventActors).filter(([, ks]) => ks.includes(key)).filter(([e]) => !shotBoundOf(aid) || +e.split(':')[0] === shotBoundOf(aid));
    const viewer = h('div', { class: 'viewer', id: 'viewer' }, h('canvas', { id: 'vc' }), h('div', { class: 'vlabel', id: 'vlabel' }));
    return h('div', { class: 'ip' },
      head(meta.cat + (fnNow && fnNow !== key ? ' · ' + fnNow : ''), CATC[meta.cat], meta.name, h('div', { class: 'chips' }, shots.map(s => h('button', { class: 'chip' + (s === curShot ? ' on' : ''), onclick: () => { const r = meta.shots[s]; setT(((r[0] + r[1]) >> 1) / FPSs); zoomTo(s); } }, 'Shot ' + s)))),
      viewer,
      keyHereBox(aid),
      paramsBox(aid),
      h('div', { class: 'sec' }, h('h3', null, 'Keyframes'), list(keys.map(k => h('div', { class: 'li' }, ic('key'), h('div', { class: 'n' }, h('span', { class: 't' }, `f ${k.frame} `), describeKey(k)), h('div', { class: 'acts' }, h('button', { 'aria-label': 'Go there', onclick: () => setT(k.frame / FPSs) }, ic('jump')), h('button', { 'aria-label': 'Delete keyframe', onclick: () => Store.del(k.id) }, ic('del'))))), 'None yet. Drag a joint or the actor on the stage.')),
      h('div', { class: 'sec' }, h('h3', null, 'In these moments'), list(acts.map(([e]) => { const [n, nm] = e.split(':'); return h('div', { class: 'li' }, h('span', { class: 't' }, 'S' + n), h('div', { class: 'n' }, h('b', null, nm), ' ', h('small', null, tlShot(+n).moments[nm].what)), h('div', { class: 'acts' }, h('button', { 'aria-label': 'Open', onclick: () => { setT(momentT0(+n, nm)); select({ type: 'event', id: e, action: key }); } }, ic('jump')))); }), 'None')),
      h('div', { class: 'sec' }, h('h3', null, 'Sounds'), list(snds.slice(0, 40).map(s => soundRow(s)), 'No sounds of its own')),
      noteBox({ type: 'actor', id: aid }, `What should change about ${meta.name}?`),
      refsBox({ type: 'actor', id: aid }));
  }
  function keyHereBox(aid) {
    const here = Store.get(`key:${aid}:${curFrame}`), key = keyOf(aid), drawn = A.info && A.info.actors.some(a => a.key === key);
    return h('div', { class: 'row', id: 'keyHere' },
      here ? h('span', { class: 'chip on', style: { '--c': 'var(--key)' } }, h('i'), 'keyframe on this frame') : h('span', { class: 'muted', style: { fontSize: '12px' } }, drawn ? 'Drag to pose. Edits fade out over 8 frames either side of a keyframe; two keyframes hold between them.' : 'Not drawn on this frame.'),
      h('div', { class: 'grow' }),
      drawn ? h('button', { class: 'btn tiny', onclick: () => { const k = liveKey(aid); k.hide = !k.hide; commitLive(); render(); renderInsp(); } }, here && here.hide ? 'Show' : 'Hide here') : null,
      here ? h('button', { class: 'btn tiny danger', onclick: () => { Store.del(here.id); } }, 'Reset') : null);
  }
  function describeKey(k) {
    const bits = [];
    if (k.hide) bits.push('hidden');
    if (k.dx || k.dy) bits.push(`moved ${fmtV(k.dx || 0)}, ${fmtV(k.dy || 0)} m`);
    if (k.rot) bits.push(`rotated ${(k.rot * 180 / Math.PI).toFixed(0)}°`);
    if (k.sc && k.sc !== 1) bits.push(`scaled ×${k.sc.toFixed(2)}`);
    for (const p in (k.d || {})) if (Math.abs(k.d[p]) > 1e-4) bits.push(`${p} ${k.d[p] > 0 ? '+' : ''}${fmtV(k.d[p])}`);
    for (const p in (k.set || {})) bits.push(`${p} = ${k.set[p]}`);
    return bits.join(' · ') || 'no change';
  }
  const fmtV = v => (Math.abs(v) >= 10 ? v.toFixed(1) : Math.abs(v) >= 1 ? v.toFixed(2) : v.toFixed(3)).replace(/\.?0+$/, '') || '0';
  function paramsBox(aid) {
    const sk = A.info && A.info.skel, key = keyOf(aid);
    const box = h('div', { class: 'sec', id: 'params' }, h('h3', null, 'Pose and settings on this frame'));
    if (!sk || sk.key !== key) { box.append(h('div', { class: 'empty' }, 'Not drawn on this frame.')); return box; }
    const fn = sk.fn, nums = sk.nums || {}, k = Store.get(`key:${aid}:${curFrame}`);
    const all = Object.keys(nums).filter(p => !/^(x|y|f|measure|hipY)$/.test(p) && !/\.(0|1)\.fa$/.test(p));
    const first = FIRST[fn] || all.slice(0, 6);
    const edited = Object.keys((k && k.d) || {}).filter(p => p in nums);          // whatever this keyframe changes is always shown
    const shown = [...new Set(first.filter(p => p in nums).concat(edited, A.moreParams ? all : []))];
    const grid = h('div', { class: 'params' });
    const root = [['x', 'dx', .005], ['y', 'dy', .005], ['rotate °', 'rot', .01], ['scale', 'sc', .005]];
    for (const [lbl, f, st] of root) grid.append(scrub(lbl, () => { const o = ovAt(aid, curShot, curFrame) || {}; return f === 'rot' ? (o.rot || 0) * 180 / Math.PI : f === 'sc' ? (o.sc || 1) : (o[f] || 0); }, d => { const kk = liveKey(aid); if (f === 'sc') kk.sc = Math.max(.1, (kk.sc || 1) + d); else kk[f] = (kk[f] || 0) + (f === 'rot' ? d * Math.PI / 180 * 50 : d); render(); }, st, k && (f === 'sc' ? k.sc && k.sc !== 1 : k[f])));
    for (const p of shown) grid.append(scrub(p, () => nums[p], d => { const kk = liveKey(aid); kk.d[p] = (kk.d[p] || 0) + d; render(); }, Math.max(.002, Math.min(.05, Math.abs(nums[p] || .5) * .01)), k && k.d && k.d[p]));
    const en = ENUMS[fn] || {};
    for (const p in en) {
      const cur = k && k.set && k.set[p];
      const sel = h('select', { 'aria-label': p, onchange: e => { const kk = liveKey(aid); if (e.target.value) kk.set[p] = e.target.value; else delete kk.set[p]; commitLive(); render(); renderInsp(); } }, h('option', { value: '' }, 'as animated'), en[p].map(v => h('option', { value: v, selected: v === cur }, v)));
      grid.append(h('div', { class: 'param' }, h('label', null, p), sel));
    }
    box.append(grid);
    if (all.length > shown.length || A.moreParams) box.append(h('button', { class: 'moreParams', onclick: () => { A.moreParams = !A.moreParams; renderInsp(); } }, A.moreParams ? 'Fewer settings' : `All ${all.length} settings`));
    return box;
  }
  function scrub(label, get, onDelta, step, changed, gid) {
    const v = get();
    const el = h('div', { class: 'scrub' + (changed ? ' changed' : ''), tabindex: 0, role: 'slider', 'aria-label': label, 'aria-valuenow': typeof v === 'number' ? v.toFixed(3) : '' }, h('span', { class: 'v' }, typeof v === 'number' ? fmtV(v) : '–'));
    el.addEventListener('pointerdown', e => {
      cap(el, e); let lx = e.clientX; A.busy = true; if (gid) Store.begin(gid);
      const mv = ev => { const dx = ev.clientX - lx; lx = ev.clientX; onDelta(dx * step * (ev.shiftKey ? .2 : 1)); const nv = get(); el.firstChild.textContent = typeof nv === 'number' ? fmtV(nv) : '–'; };
      const up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); A.busy = false; commitLive(); if (gid) Store.commit(gid); renderInsp(); };
      el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up);
    });
    el.addEventListener('keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); if (gid) Store.begin(gid); onDelta((e.key === 'ArrowRight' ? 1 : -1) * step * 5); commitLive(); if (gid) Store.commit(gid); renderInsp(); } });
    return h('div', { class: 'param' }, h('label', null, label), el);
  }
  // the actor on its own, with its skeleton
  function drawViewer() {
    const vc = document.getElementById('vc'); if (!vc) return;
    const r = vc.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    vc.width = Math.max(10, r.width * dpr); vc.height = Math.max(10, r.height * dpr);
    const c = vc.getContext('2d'); c.clearRect(0, 0, vc.width, vc.height);
    const lab = document.getElementById('vlabel');
    const cut = A.cut;
    if (!cut || cut.key !== selKeyForFrame() || cut.frame !== curFrame) { if (lab) lab.textContent = selKeyForFrame() ? 'cutting out…' : 'not on this frame'; return; }
    const [bx, by, bw, bh] = cut.box, pad = 14 * dpr;
    const sc = Math.min((vc.width - 2 * pad) / bw, (vc.height - 2 * pad) / bh, 4);
    const ox = (vc.width - bw * sc) / 2, oy = (vc.height - bh * sc) / 2;
    c.imageSmoothingQuality = 'high'; c.drawImage(cut.img, ox, oy, bw * sc, bh * sc);
    const js = jointsScreen();
    A.viewMap = { ox, oy, sc, bx, by, dpr };
    if (js) {
      const S2 = p => [ox + (p[0] - bx) * sc, oy + (p[1] - by) * sc], byId = Object.fromEntries(js.joints.map(j => [j.id, j]));
      c.lineWidth = 2 * dpr; c.strokeStyle = 'rgba(121,184,214,.9)';
      for (const [a, b] of js.bones) { const p = byId[a], q = byId[b]; if (p && q) { const P = S2(p.s), Q = S2(q.s); c.beginPath(); c.moveTo(P[0], P[1]); c.lineTo(Q[0], Q[1]); c.stroke(); } }
      for (const j of js.joints) { const P = S2(j.s); c.fillStyle = j.param === 'root' ? '#d6a064' : j.id === 'tip' ? '#f0c75e' : '#79b8d6'; c.strokeStyle = '#0d0f13'; c.beginPath(); c.arc(P[0], P[1], 6 * dpr, 0, 7); c.fill(); c.stroke(); }
    }
    if (lab) lab.textContent = `f ${curFrame} · ${js ? 'drag the joints' : 'drag on the stage to move'}`;
  }
  // dragging joints in the viewer maps back to the stage
  document.addEventListener('pointerdown', e => {
    if (e.target.id !== 'vc' || !A.viewMap) return;
    const vc = e.target, r = vc.getBoundingClientRect(), vm = A.viewMap;
    const toStage = ev => { const x = (ev.clientX - r.left) * vm.dpr, y = (ev.clientY - r.top) * vm.dpr; return [vm.bx + (x - vm.ox) / vm.sc, vm.by + (y - vm.oy) / vm.sc]; };
    const js = jointsScreen(); if (!js) return;
    const p0 = toStage(e); const j = js.joints.find(q => Math.hypot(q.s[0] - p0[0], q.s[1] - p0[1]) < 10 / vm.sc * vm.dpr + 4);
    if (!j) return;
    cap(vc, e);
    const fake = (ev, type) => { const p = toStage(ev), rr = over.getBoundingClientRect(); over.dispatchEvent(new PointerEvent(type, { clientX: rr.left + p[0] / over.width * rr.width, clientY: rr.top + p[1] / over.height * rr.height, button: 0, pointerId: ev.pointerId, bubbles: true })); };
    A.drag = { kind: 'joint', joint: j.id, js, last: p0 };
    const mv = ev => fake(ev, 'pointermove'), up = ev => { vc.removeEventListener('pointermove', mv); vc.removeEventListener('pointerup', up); fake(ev, 'pointerup'); };
    vc.addEventListener('pointermove', mv); vc.addEventListener('pointerup', up);
  });

  // ---- sound ----
  function inspSound(id) {
    const s = SD.sounds.find(q => q.id === id); if (!s) return h('div', { class: 'ip' }, 'Sound not found');
    const e = soundEdit(s) || {};
    const upd = (patch, o) => { const cur = soundEdit(s) || { id: 'sound:' + s.id, kind: 'sound', sid: s.id }; const nx = Object.assign({}, cur, patch); const empty = !nx.gain && !nx.pan && !nx.shift && !nx.mute && (!nx.mask || Snd.maskEmpty(nx.mask)) && !nx.replace; if (empty) Store.del(nx.id, o); else Store.put(nx, o); };
    const G = 'sound:' + s.id, NU = { undo: false };
    const uploadsHere = Store.all().filter(c => c.kind === 'ref' && c.target.type === 'sound' && c.target.id === id && (c.mime || '').startsWith('audio'));
    const brush = A.brush || (A.brush = { mode: 'cut', r: 2 });
    const bt = (m, lbl, title) => h('button', { class: 'tog', 'aria-pressed': brush.mode === m, title, onclick: () => { brush.mode = m; renderInsp(); } }, lbl);
    const mom = s.moment ? `${s.moment[1]} in shot ${s.moment[0]}` : 'a plain time';
    return h('div', { class: 'ip' },
      head('Sound · ' + s.cat + (s.kind === 'step' ? ' · footstep' : s.kind === 'bed' ? ' · ambience' : ''), SNDC[s.cat], s.comment || s.model, `${fmtT(soundTime(s))} · ${s.dur.toFixed(2)} s · ${s.actor ? actorMeta(s.actor).name : 'no one in particular'}`),
      h('div', { class: 'sec' },
        h('h3', null, 'Spectrum', h('span', { class: 'grow' }),
          h('button', { class: 'btn tiny', onclick: () => Snd.load().then(() => Snd.preview(Snd.clip.get(s.id))) }, ic('play'), 'Original'),
          h('button', { class: 'btn tiny', onclick: () => { const cur = soundEdit(s) || {}; const b = cur.replace && Snd.uploads.get(cur.replace) ? Snd.uploads.get(cur.replace) : cur.mask && !Snd.maskEmpty(cur.mask) ? Snd.editedBuf(s.id, cur.mask) : Snd.clip.get(s.id); Snd.load().then(() => Snd.preview(b || Snd.clip.get(s.id), cur.gain || 0)); } }, ic('play'), 'Edited')),
        h('div', { class: 'spec' }, h('canvas', { id: 'spc' }), h('span', { class: 'axis', style: { top: '4px' } }, '20k'), h('span', { class: 'axis', style: { top: '50%' } }, '900'), h('span', { class: 'axis', style: { bottom: '4px' } }, '40 Hz')),
        h('div', { class: 'brushes' }, bt('cut', 'Cut', 'Paint to make those frequencies quieter'), bt('boost', 'Boost', 'Paint to make them louder'), bt('add', 'Add', 'Paint new sound (noise) where there was none'), bt('erase', 'Erase', 'Paint to undo your painting'),
          h('span', { class: 'sep' }), h('label', { class: 'muted', for: 'bsz' }, 'size'), h('input', { id: 'bsz', type: 'range', min: 1, max: 6, value: brush.r, style: { width: '80px' }, oninput: ev => { brush.r = +ev.target.value; } }),
          e.mask && !Snd.maskEmpty(e.mask) ? h('button', { class: 'btn tiny ghost', onclick: () => upd({ mask: null }) }, 'Clear painting') : null)),
      h('div', { class: 'sec' }, h('h3', null, 'Level, place, timing'),
        h('div', { class: 'params' },
          scrub('level dB', () => (soundEdit(s) || {}).gain || 0, d => upd({ gain: +(((soundEdit(s) || {}).gain || 0) + d).toFixed(1) }, NU), .1, e.gain, G),
          scrub('pan', () => (soundEdit(s) || {}).pan || 0, d => upd({ pan: Math.max(-1, Math.min(1, +(((soundEdit(s) || {}).pan || 0) + d).toFixed(2))) }, NU), .01, e.pan, G),
          scrub('shift ms', () => (soundEdit(s) || {}).shift || 0, d => upd({ shift: Math.round(((soundEdit(s) || {}).shift || 0) + d) }, NU), 2, e.shift, G),
          h('div', { class: 'param' }, h('label', null, 'mute'), h('button', { class: 'tog', 'aria-pressed': !!e.mute, onclick: () => upd({ mute: !e.mute }) }, e.mute ? 'Muted' : 'Playing'))),
        uploadsHere.length ? h('div', { class: 'row' }, h('button', { class: 'tog', 'aria-pressed': !!e.replace, onclick: async () => { const r = uploadsHere[uploadsHere.length - 1]; if (e.replace) upd({ replace: null }); else { await Snd.decodeUpload(r.id, await Store.blobData(r)); upd({ replace: r.id }); } } }, e.replace ? 'Playing my sound instead' : 'Play my sound instead')) : null),
      h('div', { class: 'sec' }, h('h3', null, 'Where it comes from'),
        h('div', { class: 'chips' }, s.actor ? h('button', { class: 'chip', style: { '--c': CATC[actorMeta(s.actor).cat] }, onclick: () => select({ type: 'actor', id: aidOf(s.actor, s.shot) }, true) }, h('i'), actorMeta(s.actor).name) : null,
          s.moment ? h('button', { class: 'chip', style: { '--c': 'var(--key)' }, onclick: () => select({ type: 'event', id: s.moment[0] + ':' + s.moment[1] }) }, h('i'), mom) : null),
        h('div', { class: 'code' }, `tools/sfx_track.py line ${s.line}\n${s.code}`)),
      noteBox({ type: 'sound', id }, 'How should this sound be different?'),
      refsBox({ type: 'sound', id }));
  }
  function drawSpec() {
    const cv = document.getElementById('spc'); if (!cv) return;
    const s = SD.sounds.find(q => q.id === A.sel.id); if (!s) return;
    const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.max(10, Math.round(r.width * dpr)); cv.height = Math.max(10, Math.round(r.height * dpr));
    const c = cv.getContext('2d');
    if (!Snd.ready()) { c.fillStyle = '#8d95a2'; c.font = `${12 * dpr}px Hanken Grotesk, sans-serif`; c.fillText('Loading the sound…', 12 * dpr, 24 * dpr); Snd.load().then(ok => { if (ok && A.sel && A.sel.id === s.id) drawSpec(); }); return; }
    const e = soundEdit(s) || {};
    const cacheKey = s.id + ':' + cv.width + ':' + (e.mask ? JSON.stringify(e.mask.a) : '') + ':' + (e.replace || '');
    if (!A.spec || A.spec.key !== cacheKey) {
      let buf = Snd.clip.get(s.id);
      if (e.replace && Snd.uploads.get(e.replace)) buf = Snd.uploads.get(e.replace);
      else if (e.mask && e.mask.a.some(v => v)) buf = Snd.editedBuf(s.id, e.mask);
      A.spec = { key: cacheKey, img: Snd.spectrogram(buf, cv.width, cv.height) };
    }
    c.putImageData(A.spec.img, 0, 0);
    const m = e.mask; if (!m) return;
    const cw = cv.width / m.w, chh = cv.height / m.h;
    for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) {
      const k = j * m.w + i, g = m.g[k], a = m.a[k]; if (!g && !a) continue;
      const y = cv.height - (j + 1) * chh;
      c.fillStyle = a ? `rgba(240,199,94,${.3 + a / 255 * .45})` : g < 0 ? `rgba(12,13,17,${Math.min(.85, .3 + -g / 40)})` : `rgba(159,212,154,${Math.min(.7, .25 + g / 18)})`;
      c.fillRect(i * cw, y, cw + .5, chh + .5);
    }
  }
  document.addEventListener('pointerdown', e => {
    if (e.target.id !== 'spc') return;
    const cv = e.target, s = SD.sounds.find(q => q.id === A.sel.id); if (!s) return;
    cap(cv, e);
    const cur = soundEdit(s) || { id: 'sound:' + s.id, kind: 'sound', sid: s.id };
    const ed = JSON.parse(JSON.stringify(cur)); if (!ed.mask) ed.mask = Snd.newMask();
    const m = ed.mask, br = A.brush || { mode: 'cut', r: 2 };
    A.busy = true; Store.begin(ed.id);
    const paint = ev => {
      const r = cv.getBoundingClientRect(), i0 = Math.floor((ev.clientX - r.left) / r.width * m.w), j0 = Math.floor((1 - (ev.clientY - r.top) / r.height) * m.h);
      for (let j = j0 - br.r + 1; j < j0 + br.r; j++) for (let i = i0 - br.r + 1; i < i0 + br.r; i++) {
        if (i < 0 || j < 0 || i >= m.w || j >= m.h) continue; const k = j * m.w + i;
        if (br.mode === 'cut') m.g[k] = Math.max(-40, m.g[k] - 6); else if (br.mode === 'boost') m.g[k] = Math.min(18, m.g[k] + 3);
        else if (br.mode === 'add') m.a[k] = Math.min(255, m.a[k] + 40); else { m.g[k] = 0; m.a[k] = 0; }
      }
      Store.put(ed, { undo: false }); drawSpec();
    };
    paint(e);
    const up = () => {
      cv.removeEventListener('pointermove', paint); cv.removeEventListener('pointerup', up);
      Store.put(JSON.parse(JSON.stringify(ed)), { undo: false }); Store.commit(ed.id); A.busy = false; A.spec = null; renderInsp();
    };
    cv.addEventListener('pointermove', paint); cv.addEventListener('pointerup', up);
  });

  // ------------------------------------------------------------------ cast
  const thumbs = new Map();
  const THUMB = { hero: '6' };                           // the shot a portrait is taken from (else their longest)
  function openDrawer(which) {
    for (const d of ['cast', 'changes', 'brief']) $('#' + d + 'Drawer').hidden = d !== which;
    if (which === 'cast') renderCast(); if (which === 'changes') renderChanges(); if (which === 'brief') renderBrief();
  }
  const closeDrawers = () => { for (const d of ['cast', 'changes', 'brief']) $('#' + d + 'Drawer').hidden = true; };
  $('#bCast').onclick = () => openDrawer($('#castDrawer').hidden ? 'cast' : null);
  $('#bCastClose').onclick = closeDrawers; $('#bChangesClose').onclick = closeDrawers; $('#bBriefClose').onclick = closeDrawers;
  $('#bChanges').onclick = () => openDrawer($('#changesDrawer').hidden ? 'changes' : null);
  $('#bExport').onclick = () => openDrawer($('#briefDrawer').hidden ? 'brief' : null);
  function renderCast() {
    const body = $('#castBody'); body.innerHTML = '';
    const groups = [['character', 'Characters'], ['animal', 'Animals'], ['prop', 'Props']];
    const queue = [];
    for (const [cat, title] of groups) {
      const as = Object.values(SD.actors).filter(a => a.cat === cat).sort((a, b) => (a.key === 'hero' ? -1 : b.key === 'hero' ? 1 : +Object.keys(a.shots)[0] - +Object.keys(b.shots)[0]));
      const grid = h('div', { class: 'castGrid' });
      for (const a of as) {
        const img = h('img', { alt: a.name }), th = h('div', { class: 'th' }, img);
        if (thumbs.has(a.key)) img.src = thumbs.get(a.key); else queue.push([a, img]);
        grid.append(h('button', { class: 'card', onclick: () => { closeDrawers(); select({ type: 'actor', id: a.key }, true); } }, th, h('div', { class: 'nm' }, a.name), h('div', { class: 'sh' }, 'shots ' + Object.keys(a.shots).join(' '))));
      }
      body.append(h('div', { class: 'castGroup' }, h('h3', null, title + ' · ' + as.length), grid));
    }
    const sets = h('div', { class: 'list' });
    for (const s of TIMELINE.shots) {
      const as = Object.values(SD.actors).filter(a => ['set', 'fx', 'camera'].includes(a.cat) && a.shots[s.n]);
      sets.append(h('div', { class: 'li' }, h('span', { class: 't' }, 'S' + s.n), h('div', { class: 'chips' }, as.map(a => h('button', { class: 'chip', style: { '--c': CATC[a.cat] }, onclick: () => { closeDrawers(); const r = a.shots[s.n]; setT(((r[0] + r[1]) >> 1) / FPSs); select({ type: 'actor', id: aidOf(a.key, s.n) }); } }, h('i'), a.name))), h('span')));
    }
    body.append(h('div', { class: 'castGroup' }, h('h3', null, 'Sets, camera and effects, by shot'), sets));
    const tc = document.createElement('canvas'); tc.width = 640; tc.height = 360; const tg = tc.getContext('2d', { willReadFrequently: true }); patch(tg);
    const next = () => {
      if (!queue.length || $('#castDrawer').hidden) return;
      const [a, img] = queue.shift(), s = THUMB[a.key] || Object.keys(a.shots).sort((p, q) => (a.shots[q][1] - a.shots[q][0]) - (a.shots[p][1] - a.shots[p][0]))[0];
      const [f0, f1] = a.shots[s];
      const sv = [curShot, curFrame]; curShot = +s; curFrame = (f0 + f1) >> 1;
      const cut = cutOut(a.key, curFrame / FPSs, tc, tg);
      curShot = sv[0]; curFrame = sv[1];
      if (cut) { const url = cut.img.toDataURL('image/png'); thumbs.set(a.key, url); img.src = url; }
      setTimeout(next, 5);
    };
    setTimeout(next, 30);
  }

  // ------------------------------------------------------------------ changes list
  function describe(c) {
    const tgName = tg => !tg ? '' : tg.type === 'film' ? 'the film' : tg.type === 'act' ? 'shot ' + tg.id + ' ' + tlShot(+tg.id).name : tg.type === 'event' ? 'moment ' + tg.id.split(':')[1] : tg.type === 'actor' ? actorName(tg.id) : tg.type === 'sound' ? 'sound “' + ((SD.sounds.find(s => s.id === tg.id) || {}).comment || tg.id) + '”' : tg.type === 'action' ? actorMeta(tg.id.split(':')[2]).name + ' at ' + tg.id.split(':')[1] : tg.id;
    if (c.kind === 'key') return [ICON.key, `${actorName(c.aid)} · frame ${c.frame}`, describeKey(c)];
    if (c.kind === 'timing') { const f = x => Array.isArray(x) ? x.map(v => v.toFixed(2)).join('–') : x.toFixed(2); return [ICON.clock, `${c.moment} moved`, `${f(c.from)} → ${f(c.to)} s`]; }
    if (c.kind === 'sound') { const s = SD.sounds.find(q => q.id === c.sid) || {}; const b = []; if (c.gain) b.push((c.gain > 0 ? '+' : '') + c.gain + ' dB'); if (c.pan) b.push('pan ' + c.pan); if (c.shift) b.push((c.shift > 0 ? '+' : '') + c.shift + ' ms'); if (c.mute) b.push('muted'); if (c.mask && !Snd.maskEmpty(c.mask)) b.push('spectrum painted'); if (c.replace) b.push('replaced by an upload'); return [ICON.wave, `Sound: ${s.comment || s.model || c.sid}`, b.join(' · ')]; }
    if (c.kind === 'note') return [ICON.note, `Note on ${tgName(c.target)}`, c.text];
    if (c.kind === 'draw') return [ICON.pen, `Drawing on frame ${c.frame}`, `${(c.strokes || []).length} strokes · about ${tgName(c.target)}`];
    if (c.kind === 'ref') return [ICON.img, `${(c.mime || '').startsWith('audio') ? 'Sound' : 'Image'} for ${tgName(c.target)}`, c.name || ''];
    if (c.kind === 'newsound') return [ICON.wave, `Your sound placed at ${fmtT(c.t)}`, c.name || ''];
    return ['', c.kind, ''];
  }
  const shotOfChange = c => c.shot || (c.kind === 'sound' ? (SD.sounds.find(s => s.id === c.sid) || {}).shot : c.kind === 'newsound' ? shotOfFrame(fr(c.t)) : c.target ? (c.target.type === 'act' ? +c.target.id : ['event', 'action'].includes(c.target.type) ? +c.target.id.split(':')[0] : c.target.type === 'sound' ? (SD.sounds.find(s => s.id === c.target.id) || {}).shot : c.target.type === 'actor' && shotBoundOf(c.target.id) ? shotBoundOf(c.target.id) : 0) : 0);
  function renderChanges() {
    const all = Store.all().filter(c => !(c.kind === 'note' && c.target.type === 'film'));
    $('#chSummary').textContent = all.length ? `${all.length} changes` : 'Nothing yet. Pose, move, note, draw or add references, and it appears here.';
    const fn = Store.get('note:film:film'), fta = $('#filmNote');
    if (document.activeElement !== fta) fta.value = fn ? fn.text : '';
    const body = $('#chBody'); body.innerHTML = '';
    const by = new Map();
    for (const c of all) { const s = shotOfChange(c) || 0; if (!by.has(s)) by.set(s, []); by.get(s).push(c); }
    for (const s of [...by.keys()].sort((a, b) => a - b)) {
      const rows = by.get(s).sort((a, b) => (a.frame || 0) - (b.frame || 0)).map(c => { const [icn, t1, t2] = describe(c); return h('div', { class: 'li' }, h('span', { html: icn, style: { display: 'grid', color: 'var(--muted)' } }), h('div', { class: 'n' }, t1, ' ', h('small', null, t2)), h('div', { class: 'acts' }, h('button', { 'aria-label': 'Go to it', onclick: () => { closeDrawers(); selectChangeTarget(c); if (c.frame != null) setT(c.frame / FPSs); } }, ic('jump')), h('button', { 'aria-label': 'Delete', onclick: () => Store.del(c.id) }, ic('del')))); });
      body.append(h('div', { class: 'chShot' }, h('h3', null, s ? `Shot ${s} · ${tlShot(s).name}` : 'The whole film'), h('div', { class: 'list' }, rows)));
    }
    if (all.length) {
      const conf = h('span', { hidden: true }, ' Delete everything? ', h('button', { class: 'btn tiny danger', onclick: () => { Store.clearAll(); applyTiming(); render(); } }, 'Yes, delete all'), ' ', h('button', { class: 'btn tiny ghost', onclick: () => { conf.hidden = true; } }, 'No'));
      body.append(h('div', { class: 'row' }, h('button', { class: 'btn tiny ghost danger', onclick: () => { conf.hidden = false; } }, 'Clear all changes'), conf));
    }
  }
  $('#filmNote').addEventListener('input', e => { clearTimeout(A.fnT); A.fnT = setTimeout(() => { const v = e.target.value; if (v.trim()) Store.put({ id: 'note:film:film', kind: 'note', target: { type: 'film', id: 'film' }, text: v }, { undo: false }); else Store.del('note:film:film', { undo: false }); }, 350); });

  // ------------------------------------------------------------------ brief
  function maskSummary(m) {
    if (!m) return '';
    const out = [], seen = new Set();
    for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) {
      const k = j * m.w + i; if (seen.has(k) || (!m.g[k] && !m.a[k])) continue;
      const kind = m.a[k] ? 'add' : m.g[k] < 0 ? 'cut' : 'boost';
      let i1 = i, j1 = j;                                 // grow a box of the same kind
      while (i1 + 1 < m.w && (kind === 'add' ? m.a[j * m.w + i1 + 1] : kind === 'cut' ? m.g[j * m.w + i1 + 1] < 0 && !m.a[j * m.w + i1 + 1] : m.g[j * m.w + i1 + 1] > 0 && !m.a[j * m.w + i1 + 1])) i1++;
      const rowOk = jj => { for (let ii = i; ii <= i1; ii++) { const kk = jj * m.w + ii; if (kind === 'add' ? !m.a[kk] : kind === 'cut' ? !(m.g[kk] < 0) || m.a[kk] : !(m.g[kk] > 0) || m.a[kk]) return false; } return true; };
      while (j1 + 1 < m.h && rowOk(j1 + 1)) j1++;
      let sum = 0, n = 0; for (let jj = j; jj <= j1; jj++) for (let ii = i; ii <= i1; ii++) { const kk = jj * m.w + ii; seen.add(kk); sum += kind === 'add' ? m.a[kk] : m.g[kk]; n++; }
      out.push({ kind, i, i1, j, j1, v: sum / n });
    }
    return out;
  }
  function briefText() {
    const all = Store.all(), L = [];
    const ck = SD.checkpoint;
    L.push(`# Changes to The Umbrella Walk`);
    L.push(`Made in the studio against checkpoint ${ck.commit || 'dev'}${ck.dirty ? ' (with local edits)' : ''}, built ${ck.built}. Repository: ${ck.repo}`);
    L.push(`Apply them in the repository (read AGENTS.md first). Times are film seconds; frames are at 24 fps. Moment names and timings live in timeline.json; sounds are placed in tools/sfx_track.py.`);
    L.push(`Poses are offsets from what the checkpoint draws on that frame: distances in metres (x right, y up), angles in radians added to the rig's own values (legs.N.th/kn, arms.X.sh/el, farms.X.sh/el, lean, nod, sway, umb.ang…), other names are the drawing function's own options. A single keyframe is a local accent that fades in and out over 8 frames; two or more keyframes on the same actor hold and blend between them. Implement each as real animation in the shot's code (usually kf() keyframes), keeping to the rules in AGENTS.md.`);
    const fn = all.find(c => c.id === 'note:film:film');
    if (fn) { L.push('', '## The whole film', '', fn.text.trim()); }
    const by = new Map();
    for (const c of all) { if (c.id === 'note:film:film') continue; const s = shotOfChange(c) || 0; if (!by.has(s)) by.set(s, []); by.get(s).push(c); }
    const attach = [];
    for (const s of [...by.keys()].sort((a, b) => a - b)) {
      const cs = by.get(s).sort((a, b) => (a.frame || 0) - (b.frame || 0));
      if (s) { const sh = tlShot(s); L.push('', `## Shot ${s} · ${sh.name} (${fmtT(sh.from / FPSs)}–${fmtT(sh.to / FPSs)}, frames ${sh.from}–${sh.to - 1}, drawn in ${['', 's1', 's1', 's1', 's1', 's1', 's2', 's2', 's2', 's2', 's2'][s] ? 'src/' + ['', 's1', 's1', 's1', 's1', 's1', 's2', 's2', 's2', 's2', 's2'][s] + '.js' : 'src/s3.js'})`); }
      else L.push('', '## Across the film');
      for (const c of cs) {
        if (c.kind === 'note') {
          const tg = c.target;
          if (tg.type === 'act') L.push(`- Note on the shot: ${c.text.trim()}`);
          else if (tg.type === 'event') { const [n, nm] = tg.id.split(':'); L.push(`- Note on moment ${nm} (${tlShot(+n).moments[nm].what}, ${JSON.stringify(momentVal(+n, nm))} s into the shot): ${c.text.trim()}`); }
          else if (tg.type === 'action') { const [n, nm, who] = tg.id.split(':'); L.push(`- Note on what ${actorMeta(who).name} (${who}) does at ${nm}: ${c.text.trim()}`); }
          else if (tg.type === 'actor') L.push(`- Note on ${actorName(tg.id)} (${keyOf(tg.id)}): ${c.text.trim()}`);
          else if (tg.type === 'sound') { const so = SD.sounds.find(q => q.id === tg.id) || {}; L.push(`- Note on the sound “${so.comment || so.model}” (tools/sfx_track.py line ${so.line}: \`${so.code}\`): ${c.text.trim()}`); }
        } else if (c.kind === 'key') {
          const sh = tlShot(c.shot), at = `on frame ${c.frame} (${((c.frame - sh.from) / FPSs).toFixed(2)} s into the shot)`;
          if (c.key === 'camera') L.push(`- Camera ${at}: ${[c.dx || c.dy ? `look ${fmtV(c.dx || 0)} m right, ${fmtV(c.dy || 0)} m up (camera cx, cy)` : '', c.sc && c.sc !== 1 ? `zoom ×${c.sc.toFixed(2)} (pxPerMetre)` : '', c.rot ? `roll ${(c.rot * 180 / Math.PI).toFixed(0)}°` : ''].filter(Boolean).join(', ')}.`);
          else L.push(`- Pose: ${actorName(c.aid)} (${keyOf(c.aid)}, drawn by ${c.fn || actorMeta(keyOf(c.aid)).fn}()) ${at}: ${describeKey(c)}.`);
        } else if (c.kind === 'timing') {
          L.push(`- Timing: move moment ${c.moment} (${tlShot(c.shot).moments[c.moment].what}) from ${JSON.stringify(c.from)} to ${JSON.stringify(c.to)} s into the shot, in timeline.json. Check that the drawing still reads, and re-run probe_motion.py / sfx_track.py.`);
        } else if (c.kind === 'sound') {
          const so = SD.sounds.find(q => q.id === c.sid) || {}, b = [];
          if (c.gain) b.push(`${c.gain > 0 ? 'louder' : 'quieter'} by ${Math.abs(c.gain)} dB (L ${so.L} → ${(so.L + c.gain).toFixed(1)})`);
          if (c.pan) b.push(`pan ${c.pan > 0 ? 'right' : 'left'} by ${Math.abs(c.pan)}`);
          if (c.shift) b.push(`${c.shift > 0 ? 'later' : 'earlier'} by ${Math.abs(c.shift)} ms`);
          if (c.mute) b.push('remove it');
          if (c.replace) { const r = Store.get(c.replace); b.push(`make it sound like the attached recording ${r ? r.name : ''}`); if (r) attach.push(r); }
          if (c.mask && !Snd.maskEmpty(c.mask)) for (const r of maskSummary(c.mask)) {
            const t0 = (r.i / c.mask.w * so.dur).toFixed(2), t1 = ((r.i1 + 1) / c.mask.w * so.dur).toFixed(2), f0 = Math.round(Snd.hzOfBand(r.j) * .9), f1 = Math.round(Snd.hzOfBand(r.j1) * 1.1);
            b.push(r.kind === 'add' ? `add noise-like energy at ${f0}–${f1} Hz between ${t0} and ${t1} s` : `${r.kind === 'cut' ? 'cut' : 'boost'} ${f0}–${f1} Hz between ${t0} and ${t1} s by about ${Math.abs(r.v).toFixed(0)} dB`);
          }
          L.push(`- Sound “${so.comment || so.model}” at ${fmtT(so.t)} (${so.model}, tools/sfx_track.py line ${so.line}: \`${so.code}\`): ${b.join('; ')}.`);
        } else if (c.kind === 'draw') {
          L.push(`- Drawing over frame ${c.frame} (attached as draw-${c.frame}.png), about ${describe(c)[2].split('about ')[1]}.`); attach.push(c);
        } else if (c.kind === 'ref') {
          L.push(`- Reference ${(c.mime || '').startsWith('audio') ? 'sound' : 'image'} “${c.name}” for ${describe(c)[1].split(' for ')[1]} (attached).`); attach.push(c);
        } else if (c.kind === 'newsound') {
          const r = Store.get(c.ref); L.push(`- Add a sound like the attached ${r ? r.name : 'recording'} at ${fmtT(c.t)} (frame ${fr(c.t)}), for ${describe({ kind: 'note', target: c.target })[1].replace('Note on ', '')}.`);
        }
      }
    }
    if (!all.length) L.push('', '(No changes yet.)');
    return L.join('\n');
  }
  function renderBrief() { $('#briefText').textContent = briefText(); $('#briefMsg').textContent = ''; }
  $('#bCopy').onclick = async () => {
    const txt = briefText();
    try { await navigator.clipboard.writeText(txt); $('#briefMsg').textContent = 'Copied. Paste it to your agent; attach the saved file if there are images or sounds.'; }
    catch (e) { const r = document.createRange(); r.selectNodeContents($('#briefText')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); $('#briefMsg').textContent = 'Selected. Press Ctrl+C (⌘C) to copy.'; }
  };
  async function frameWithDrawing(c) {
    const cv = document.createElement('canvas'); cv.width = 1280; cv.height = 720; const g = cv.getContext('2d'); patch(g);
    const sv = [curShot, curFrame]; curShot = c.shot; curFrame = c.frame; INST.S.sel = null; INST.frame(g, c.frame / FPSs); curShot = sv[0]; curFrame = sv[1];
    g.setTransform(1, 0, 0, 1, 0, 0); const k = 1280 / 1920;
    for (const s of c.strokes || []) { g.strokeStyle = s.c; g.lineWidth = (s.w || 5) * k; g.lineCap = g.lineJoin = 'round'; g.beginPath(); s.p.forEach((p, i) => i ? g.lineTo(p[0] * k, p[1] * k) : g.moveTo(p[0] * k, p[1] * k)); g.stroke(); }
    return cv.toDataURL('image/jpeg', .85);
  }
  $('#bSaveJson').onclick = async () => {
    $('#briefMsg').textContent = 'Preparing…';
    const changes = [];
    for (const c of Store.all()) {
      const o = JSON.parse(JSON.stringify(c));
      if (c.kind === 'ref') o.blob = { data: await Store.blobData(c) };
      if (c.kind === 'draw') o.image = await frameWithDrawing(c);
      changes.push(o);
    }
    const doc = { format: 'umbrella-walk-studio/1', checkpoint: SD.checkpoint, saved: new Date().toISOString(), brief: briefText(), changes };
    const r = await Store.save(`umbrella-walk-changes-${(SD.checkpoint.commit || 'dev')}.json`, JSON.stringify(doc));
    $('#briefMsg').textContent = r === 'saved' ? 'Saved. Give this file to your agent with the brief.' : r === 'declined' ? 'Not saved.' : 'This view cannot save files. Use Copy as text.';
  };
  $('#fImport').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const doc = JSON.parse(await f.text()); if (!doc || !Array.isArray(doc.changes)) throw 0;
      for (const c of doc.changes) { if (!c.id || !c.kind) continue; delete c.image; Store.put(c, { undo: false }); if (c.kind === 'ref' && (c.mime || '').startsWith('audio') && c.blob && c.blob.data) Snd.decodeUpload(c.id, c.blob.data); }
      applyTiming(); render(); renderBrief();
      $('#briefMsg').textContent = `Opened ${doc.changes.length} changes${doc.checkpoint && doc.checkpoint.commit !== SD.checkpoint.commit ? ' (made against checkpoint ' + doc.checkpoint.commit + ')' : ''}.`;
    } catch (err) { $('#briefMsg').textContent = 'That is not a studio file.'; }
  });

  // ------------------------------------------------------------------ keys
  document.addEventListener('keydown', e => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'textarea' || tag === 'input' || tag === 'select') { if (e.key === 'Escape') e.target.blur(); return; }
    const k = e.key, mod = e.ctrlKey || e.metaKey;
    if (mod && (k === 'z' || k === 'Z')) { e.preventDefault(); if (e.shiftKey ? Store.redo() : Store.undo()) { applyTiming(); render(); renderInsp(); } return; }
    if (mod && k === 'y') { e.preventDefault(); if (Store.redo()) { applyTiming(); render(); renderInsp(); } return; }
    if (mod) return;
    if (k === ' ') { e.preventDefault(); togglePlay(); }
    else if (k === 'ArrowLeft') { e.preventDefault(); e.shiftKey ? stepMoment(-1) : setT(A.t - 1 / FPSs); }
    else if (k === 'ArrowRight') { e.preventDefault(); e.shiftKey ? stepMoment(1) : setT(A.t + 1 / FPSs); }
    else if (k === '[') stepBeat(-1); else if (k === ']') stepBeat(1);
    else if (k === 'v' || k === 'V') setTool('select'); else if (k === 'd' || k === 'D') setTool('draw');
    else if (k === 'e' || k === 'E') $('#oEdits').click(); else if (k === 'o' || k === 'O') $('#oOnion').click(); else if (k === 'l' || k === 'L') $('#oLoop').click();
    else if (k === 'c' || k === 'C') $('#bCast').click();
    else if (k === 'f' || k === 'F') { A.view = [0, NFR / FPSs]; drawTL(); }
    else if (k === 'Escape') { if (![...document.querySelectorAll('.drawer')].every(d => d.hidden)) closeDrawers(); else select(null); }
  });

  // ------------------------------------------------------------------ boot
  let insT = null;
  Store.on(() => {
    indexKeys(); applyTiming();
    $('#nChanges').textContent = Store.all().filter(c => !(c.kind === 'note' && !c.text)).length;
    for (const c of Store.all()) if (c.kind === 'ref' && (c.mime || '').startsWith('audio') && !Snd.uploads.has(c.id) && c.blob && c.blob.data) Snd.decodeUpload(c.id, c.blob.data);
    requestRender(); drawTL();
    clearTimeout(insT); insT = setTimeout(() => { if (!A.drag && !A.busy) renderInsp(); if (!$('#changesDrawer').hidden) renderChanges(); if (!$('#briefDrawer').hidden) renderBrief(); }, 120);
  });
  $('#ckpt').textContent = 'checkpoint ' + (SD.checkpoint.commit || 'dev') + (SD.checkpoint.dirty ? '+' : '');
  window.addEventListener('resize', () => { clearTimeout(A.rsT); A.rsT = setTimeout(resize, 80); });
  setTimeout(() => { const hnt = $('#stageHint'); if (hnt) hnt.style.opacity = 0; }, 9000);
  const hash = (location.hash || '').slice(1);
  const startShot = /^s\d+$/.test(hash) ? +hash.slice(1) : 1;
  A.t = shotT0(startShot) + Math.min(1.5, (shotT1(startShot) - shotT0(startShot)) / 2);
  resize();
  select({ type: 'act', id: String(startShot) });
  Store.init().then(() => { indexKeys(); applyTiming(); render(); renderInsp(); });
  window.STUDIO = { A, select, setT, render, Store, pickAt, briefText };   // for tests and curious agents
})();
