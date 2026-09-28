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
      else if (k === 'style' && typeof v === 'object') { for (const sk in v) if (sk.startsWith('--')) el.style.setProperty(sk, v[sk]); else el.style[sk] = v[sk]; }   // custom properties need setProperty
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
  const A = { t: 0, playing: false, speed: 1, sel: null, tool: 'select', edits: true, peek: false, forceOrig: false, split: false, splitX: .5, onion: false, loop: false, info: null, cut: null, live: null, pen: '#ffb347', thumbVer: 0 };
  // your version is on screen unless you hold Compare (peek), switched it off (edits), or a pass draws the original
  const ED = () => A.edits && !A.peek && !A.forceOrig;
  const showingOriginal = () => A.peek || !A.edits;
  function canEdit(say = true) {
    if (!showingOriginal()) return true;
    if (say) toast(A.peek ? 'Let go of Compare to edit.' : 'This is the original. Click Compare to see yours and edit it.');
    return false;
  }
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
  INST.S.ov = key => ED() ? ovAt(aidOf(key, curShot), curShot, curFrame) : null;

  function applyTiming() {
    SD.timeline.shots.forEach((s, i) => { for (const k in s.moments) TIMELINE.shots[i].moments[k].t = JSON.parse(JSON.stringify(s.moments[k].t)); delete _MOMENTS[s.name]; });
    if (!ED()) return;
    for (const c of Store.all()) if (c.kind === 'timing') { const m = tlShot(c.shot).moments[c.moment]; if (m) { m.t = JSON.parse(JSON.stringify(c.to)); delete _MOMENTS[tlShot(c.shot).name]; } }
  }
  const momentVal = (shot, name) => tlShot(shot).moments[name].t;
  const momentT0 = (shot, name) => { const v = momentVal(shot, name); return shotT0(shot) + (Array.isArray(v) ? v[0] : v); };
  const soundEdit = s => Store.get('sound:' + s.id) || null;
  function soundTime(s, useEdits = ED()) {
    let t = s.t;
    if (s.moment && useEdits) { const v = momentVal(s.moment[0], s.moment[1]); t = shotT0(s.moment[0]) + (Array.isArray(v) ? v[s.moment[2]] : v) + s.offset; }
    const e = useEdits && soundEdit(s);
    return t + (e && e.shift ? e.shift / 1000 : 0);
  }
  function mixItems() {
    const out = [];
    for (const s of SD.sounds) {
      const e = ED() ? soundEdit(s) : null;
      if (e && e.mute) continue;
      let buf = Snd.clip.get(s.id);
      if (e && e.replace && Snd.uploads.get(e.replace)) buf = Snd.uploads.get(e.replace);
      else if (e && e.mask && !Snd.maskEmpty(e.mask)) buf = Snd.editedBuf(s.id, e.mask) || buf;
      out.push({ t: soundTime(s), buf, gain: e ? e.gain || 0 : 0, pan: e ? e.pan || 0 : 0 });
    }
    if (ED()) for (const c of Store.all()) if (c.kind === 'newsound') out.push({ t: c.t, buf: Snd.uploads.get(c.ref), gain: c.gain || 0 });
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
    const orig = showingOriginal(), tt = A.playing ? A.t : curFrame / FPSs;
    INST.S.sel = orig ? null : selKeyForFrame(); INST.S.probe = null; INST.S.capture = null;
    A.frameErr = null;
    try {
      if (orig) { renderOriginal(sctx, tt); A.info = { actors: [], skel: null, cam: null }; }
      else { A.info = INST.frame(sctx, tt); if (A.split) splitComposite(tt); }
    } catch (e) { A.frameErr = e; A.info = { actors: [], skel: null, cam: null }; }
    showFrameError();
    drawOverlay();
    updateTransport();
    updateOrigBadge();
    if (!A.playing && !orig) scheduleCapture();
  }

  // ---- the original, next to yours ----
  // Compare is spring-loaded: hold it (or hold E) to see the checkpoint and let go to see yours. A short
  // click keeps the original up until the next click. Split shows both at once, divided by a line you drag.
  // While you try an LLM's code edits, the original is the checkpoint's own code, run in a hidden frame.
  let BASE = null;
  function baseRealm() {
    if (BASE !== null) return BASE;
    BASE = false;
    try {
      const f = document.createElement('iframe');
      f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1;
      f.style.cssText = 'position:absolute;width:1px;height:1px;left:-9px;top:-9px;border:0;visibility:hidden';
      f.addEventListener('load', () => { try { if (f.contentWindow.FILM) { BASE = f.contentWindow; render(); drawTL(); } } catch (e) { } });
      f.srcdoc = '<!doctype html><meta charset="utf-8"><script>' + document.getElementById('film-src').textContent + '<\/script>';
      document.body.appendChild(f);
    } catch (e) { }
    return BASE;
  }
  function renderOriginal(ctx, t) {
    if (window.PATCH) {
      const b = baseRealm();
      if (b && b.FILM) { b.FILM.renderFrame(ctx, t); return true; }
      ctx.save(); ctx.resetTransform(); ctx.fillStyle = '#0c0d11'; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); ctx.restore();
      return false;
    }
    const was = A.forceOrig; A.forceOrig = true; applyTiming();
    try { INST.frame(ctx, t); return true; } finally { A.forceOrig = was; applyTiming(); }
  }
  const splitCv = document.createElement('canvas'); let splitCtx = null;
  function splitComposite(tt) {
    if (!splitCtx || splitCv.width !== stage.width || splitCv.height !== stage.height) { splitCv.width = stage.width; splitCv.height = stage.height; splitCtx = splitCv.getContext('2d'); patch(splitCtx); }
    const sel = INST.S.sel; INST.S.sel = null;
    try { if (!renderOriginal(splitCtx, tt)) return; } finally { INST.S.sel = sel; }
    const sx = Math.round(stage.width * A.splitX);
    sctx.save(); sctx.resetTransform(); sctx.drawImage(splitCv, 0, 0, sx, stage.height, 0, 0, sx, stage.height); sctx.restore();
  }
  function updateOrigBadge() {
    const b = $('#origBadge'), orig = showingOriginal();
    b.hidden = !orig;
    if (orig) $('#origWhy').textContent = !A.edits ? 'your changes are hidden · click Compare to go back' : 'let go to see yours';
    $('#oCompare').setAttribute('aria-pressed', String(!A.edits));
    $('#oSplit').setAttribute('aria-pressed', String(A.split));
  }
  function showFrameError() {
    let el = document.getElementById('stageErr');
    if (!A.frameErr) { if (el) el.remove(); return; }
    if (!el) { el = h('div', { id: 'stageErr', class: 'stageErr' }); $('#stageBox').append(el); }
    el.textContent = `This frame did not draw.\n${A.frameErr.name || 'Error'}: ${A.frameErr.message}${window.PATCH ? '\n\nIt comes from the LLM edits you are trying. Copy this message back to the LLM, or discard the edits.' : ''}`;
  }
  function restartAudio() { if (!A.playing) return; A.playing = false; Snd.stop(); document.body.classList.remove('playing'); togglePlay(); }
  function peekStart() {
    if (A.peekAt) return;
    A.peekAt = performance.now(); A.peek = true; applyTiming();
    restartAudio(); render(); drawTL();
  }
  function peekEnd(latch = true) {
    if (!A.peekAt) return;
    const quick = latch && performance.now() - A.peekAt < 280;
    A.peekAt = 0; A.peek = false;
    if (quick) { A.edits = !A.edits; A.thumbVer++; }
    applyTiming(); restartAudio(); render(); renderInsp(); drawTL();
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
    if (showingOriginal()) return;                       // the original is shown as it is: no handles, no drawings
    if (A.split) {
      const sx = Math.round(W0 * A.splitX), k = Math.max(1, W0 / 1280);
      c.fillStyle = 'rgba(12,13,17,.55)'; c.fillRect(sx - 1.5 * k, 0, 3 * k, H0);
      c.fillStyle = '#79b8d6'; c.fillRect(sx - .75 * k, 0, 1.5 * k, H0);
      c.beginPath(); c.arc(sx, H0 / 2, 11 * k, 0, 7); c.fill();
      c.fillStyle = '#0d0f13'; c.beginPath(); c.moveTo(sx - 6 * k, H0 / 2); c.lineTo(sx - 2 * k, H0 / 2 - 4 * k); c.lineTo(sx - 2 * k, H0 / 2 + 4 * k); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(sx + 6 * k, H0 / 2); c.lineTo(sx + 2 * k, H0 / 2 - 4 * k); c.lineTo(sx + 2 * k, H0 / 2 + 4 * k); c.closePath(); c.fill();
      c.font = `600 ${Math.round(11 * k)}px Hanken Grotesk, sans-serif`; c.textBaseline = 'top';
      const tag = (txt, x, al) => { const w = c.measureText(txt).width + 14 * k; const x0 = al === 'r' ? x - w : x; c.fillStyle = 'rgba(12,13,17,.8)'; c.fillRect(x0, 10 * k, w, 20 * k); c.fillStyle = txt === 'ORIGINAL' ? '#79b8d6' : '#d6a064'; c.fillText(txt, x0 + 7 * k, 14 * k); };
      if (sx > 90 * k) tag('ORIGINAL', sx - 10 * k, 'r');
      if (W0 - sx > 70 * k) tag('YOURS', sx + 10 * k, 'l');
    }
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
    if (!canEdit()) return { d: {}, set: {}, dx: 0, dy: 0, rot: 0, sc: 1 };   // looking at the original: nothing to change
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
    if (showingOriginal()) { canEdit(); return; }
    if (A.split && Math.abs(p[0] - over.width * A.splitX) < 14 * Math.max(1, over.width / 1280)) { A.drag = { kind: 'split' }; return; }
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
      if (!isShotBound(hit) && e.pointerType !== 'touch') A.drag = { kind: 'maybeMove', start: p, last: p };   // on touch: select first, then drag
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
      over.classList.toggle('grab', hot);
      over.style.cursor = A.split && Math.abs(p[0] - over.width * A.splitX) < 14 * Math.max(1, over.width / 1280) ? 'ew-resize' : '';
      return;
    }
    const d = A.drag;
    if (d.kind === 'split') { A.splitX = Math.max(.03, Math.min(.97, p[0] / over.width)); render(); return; }
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
    if (!A.playing && !A.tdrag) ensureVisible(A.t, 'nearest');
    if (A.sel && ['actor', 'sound'].includes(A.sel.type)) renderInspLight();
  }
  async function togglePlay() {
    if (A.playing) {
      A.playing = false; Snd.stop(); document.body.classList.remove('playing'); setT(A.t); return;
    }
    A.playing = true; document.body.classList.add('playing'); TL.follow = true;
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
      if (TL.follow) ensureVisible(t, 'page');
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
    const ms = allMoments();
    const m = dir > 0 ? ms.find(q => fr(q.t) > curFrame) : [...ms].reverse().find(q => fr(q.t) < curFrame);
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
  const touchMode = () => { over.style.touchAction = A.tool === 'draw' || (A.sel && A.sel.type === 'actor') || A.split ? 'none' : 'pan-y'; };
  const setTool = t => { A.tool = t; $('#tSelect').classList.toggle('on', t === 'select'); $('#tDraw').classList.toggle('on', t === 'draw'); over.classList.toggle('draw', t === 'draw'); $('#drawBar').hidden = t !== 'draw'; touchMode(); drawOverlay(); };
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
  (() => {                                             // Compare: hold to peek, click to keep
    const b = $('#oCompare');
    b.addEventListener('pointerdown', e => { if (e.button === 0) { e.preventDefault(); peekStart(); } });
    b.addEventListener('pointerup', peekEnd);
    b.addEventListener('pointercancel', peekEnd);
    b.addEventListener('pointerleave', () => { if (A.peekAt) peekEnd(); });
    b.addEventListener('click', e => { if (e.detail === 0) { A.edits = !A.edits; A.thumbVer++; applyTiming(); restartAudio(); render(); renderInsp(); drawTL(); } });
    $('#oSplit').onclick = () => { A.split = !A.split; if (A.split && !A.edits) { A.edits = true; applyTiming(); } touchMode(); render(); };
  })();
  toggle('#oOnion', 'onion', () => { makeGhosts(); drawOverlay(); });
  toggle('#oLoop', 'loop');
  $('#oSpeed').onchange = e => { A.speed = +e.target.value; e.target.blur(); if (A.playing) { togglePlay(); togglePlay(); } };

  // ------------------------------------------------------------------ timeline: the film as rows
  // Time is laid out like text. A row is a line and a shot is a paragraph: with "Shot per row" every
  // shot starts a new row; with "Even rows" every row holds the same number of seconds. The slider sets
  // that number, from one second (nearly every frame) to the whole film on one row. All rows share one
  // scale, so the same width is the same time everywhere. The panel scrolls like a page; while the film
  // plays it turns the page for you, until you scroll yourself.
  const DUR = NFR / FPSs;
  const tlc = $('#tlc'), tctx = tlc.getContext('2d'), tip = $('#tlTip'), scroller = $('#tlScroll'), tlSpace = $('#tlSpace'), backPill = $('#tlBack');
  const shotbar = $('#tlShots'), sbctx = shotbar.getContext('2d');
  const LONGEST = Math.max(...TIMELINE.shots.map(s => (s.to - s.from) / FPSs));
  const MINLEN = 1;
  const REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pref = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem('uws.' + k) || 'null'); localStorage.setItem('uws.' + k, JSON.stringify(v)); } catch (e) { return null; } };
  const TL = Object.assign({ by: 'shot', len: +(LONGEST + .08).toFixed(2), thumbs: true, h: 0 }, pref('tl') || {});
  Object.assign(TL, { rows: [], total: 0, follow: true, q: '', hits: [], hit: -1, hitKeys: new Set(), items: [], legend: null });
  const saveTL = () => pref('tl', { by: TL.by, len: TL.len, thumbs: TL.thumbs, h: TL.h });
  let GUT = 104; const PADR = 14, TH_H = 46, TH_W = Math.round(TH_H * 16 / 9);
  const lanes = () => TL.thumbs ? { film: 5, mom: 5 + TH_H + 3, snd: 5 + TH_H + 24, chg: 5 + TH_H + 43, h: 5 + TH_H + 61 } : { film: -1, mom: 6, snd: 27, chg: 46, h: 66 };
  const tlDpr = () => Math.min(2, window.devicePixelRatio || 1);
  const maxLen = () => TL.by === 'shot' ? +(LONGEST + .08).toFixed(2) : DUR;
  const lenFromSlider = v => MINLEN * Math.pow(maxLen() / MINLEN, v / 1000);
  const sliderFromLen = l => Math.round(Math.log(l / MINLEN) / Math.log(maxLen() / MINLEN) * 1000);
  const pps = () => Math.max(1, scroller.clientWidth - GUT - PADR) / (TL.len * (TL.by === 'shot' ? 1.06 : 1));
  const tOfX = (r, x) => Math.max(r.t0, Math.min(r.t1 - 1e-4, r.t0 + (x - GUT) / pps()));

  function layoutRows() {
    GUT = scroller.clientWidth < 620 ? 62 : 104;           // a narrow gutter on phones
    TL.len = Math.max(MINLEN, Math.min(maxLen(), TL.len || maxLen()));
    const rows = [], len = TL.len, L = lanes();
    if (TL.by === 'time') {
      const n = Math.max(1, Math.ceil(DUR / len - 1e-6));
      for (let k = 0; k < n; k++) rows.push({ t0: k * len, t1: Math.min(DUR, (k + 1) * len) });
    } else {
      for (const s of TIMELINE.shots) {
        const a = s.from / FPSs, b = s.to / FPSs; let n = Math.max(1, Math.ceil((b - a) / len - 1e-6));
        if (n > 1 && (b - a) - (n - 1) * len < len * .06) n--;        // a sliver at the end joins the row before
        for (let k = 0; k < n; k++) rows.push({ t0: a + k * len, t1: k === n - 1 ? b : a + (k + 1) * len, shot: s.n, first: k === 0 });
      }
    }
    let y = 6;
    rows.forEach((r, i) => { if (TL.by === 'shot' && r.first && i) y += 9; r.i = i; r.y = y; r.h = L.h; y += L.h + 3; });
    TL.rows = rows; TL.total = y + 10;
    tlSpace.style.height = Math.max(0, TL.total - scroller.clientHeight) + 'px';
    $('#tlLen').value = sliderFromLen(TL.len);
    $('#tlLenV').textContent = TL.len >= DUR - .01 ? 'whole film' : TL.by === 'shot' && TL.len >= LONGEST ? 'a shot a row' : (TL.len < 9.95 ? TL.len.toFixed(1) : Math.round(TL.len)) + ' s a row';
    $('#tlByShot').setAttribute('aria-pressed', TL.by === 'shot');
    $('#tlByTime').setAttribute('aria-pressed', TL.by === 'time');
    $('#tlThumbs').setAttribute('aria-pressed', TL.thumbs);
  }
  function rowOfT(t) {
    const R = TL.rows; if (!R.length) return null;
    let lo = 0, hi = R.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (R[m].t0 <= t + 1e-9) lo = m; else hi = m - 1; }
    return R[lo];
  }
  function rowAtY(y) {
    const R = TL.rows; if (!R.length) return null;
    let lo = 0, hi = R.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (R[m].y <= y) lo = m; else hi = m - 1; }
    return R[lo];
  }
  function tlResize() {
    const dpr = tlDpr(), w = scroller.clientWidth, hh = scroller.clientHeight;
    tlc.style.height = hh + 'px';
    if (tlc.width !== Math.round(w * dpr) || tlc.height !== Math.round(hh * dpr)) { tlc.width = Math.max(10, Math.round(w * dpr)); tlc.height = Math.max(10, Math.round(hh * dpr)); }
    const sw = shotbar.clientWidth;
    if (shotbar.width !== Math.round(sw * dpr)) { shotbar.width = Math.max(10, Math.round(sw * dpr)); shotbar.height = Math.round(14 * dpr); }
    layoutRows();
  }

  // ---- frames for the filmstrips, drawn in the background and kept ----
  const THUMBS = new Map(), TQ = new Set(); let tqT = 0;
  const thumbKey = f => f + (A.edits ? 'e' : 'o');
  function thumbOf(f) {
    const k = thumbKey(f), e = THUMBS.get(k);
    if (!e || e.ver !== A.thumbVer) TQ.add(f);
    if (e) { THUMBS.delete(k); THUMBS.set(k, e); }
    return e ? e.cv : null;
  }
  // draw another frame without disturbing the stage's own state
  function offFrame(f, fn) {
    const sv = [curShot, curFrame, INST.S.sel, INST.S.probe, INST.S.capture];
    curFrame = f; curShot = shotOfFrame(f); INST.S.sel = null; INST.S.probe = null; INST.S.capture = null;
    try { return fn(); } catch (e) { return null; } finally { [curShot, curFrame, INST.S.sel, INST.S.probe, INST.S.capture] = sv; }
  }
  function renderThumb(f) {
    const k = Math.min(2, tlDpr()), cv = document.createElement('canvas');
    cv.width = Math.round(TH_W * k); cv.height = Math.round(TH_H * k);
    const g = cv.getContext('2d'); patch(g);
    offFrame(f, () => INST.frame(g, f / FPSs));
    THUMBS.set(thumbKey(f), { cv, ver: A.thumbVer });
  }
  function pumpThumbs() {
    if (tqT || !TQ.size || A.peek) return;
    tqT = setTimeout(() => {
      tqT = 0;
      if (A.peek || A.drag) { if (TQ.size) pumpThumbs(); return; }
      const t0 = performance.now(), budget = A.playing ? 5 : 18; let n = 0;
      for (const f of TQ) { TQ.delete(f); renderThumb(f); n++; if (performance.now() - t0 > budget) break; }
      while (THUMBS.size > 900) THUMBS.delete(THUMBS.keys().next().value);
      if (n) drawTL();
    }, A.playing ? 40 : 0);
  }

  // ---- drawing ----
  let tlReq = 0;
  function drawTL() { if (!tlReq) tlReq = requestAnimationFrame(() => { tlReq = 0; drawTLnow(); }); }
  const diamond = (c, x, y, r, fill, stroke) => { c.beginPath(); c.moveTo(x, y - r); c.lineTo(x + r * .8, y); c.lineTo(x, y + r); c.lineTo(x - r * .8, y); c.closePath(); c.fillStyle = fill; c.fill(); if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1.2; c.stroke(); } };
  function fitText(c, s, x, y, w) {
    if (c.measureText(s).width <= w) { c.fillText(s, x, y); return; }
    let a = 0, b = s.length;
    while (a < b) { const m = (a + b + 1) >> 1; if (c.measureText(s.slice(0, m) + '…').width <= w) a = m; else b = m - 1; }
    c.fillText(s.slice(0, a) + '…', x, y);
  }
  function changeTime(ch) {
    if (ch.kind === 'key' || ch.kind === 'draw') return ch.frame / FPSs;
    if (ch.kind === 'timing') { const fa = [].concat(ch.from), ta = [].concat(ch.to), i = Math.max(0, fa.findIndex((v, k) => Math.abs(v - ta[k]) > 1e-6)); return shotT0(ch.shot) + (ED() ? ta[i] : fa[i]); }
    if (ch.kind === 'sound') { const s = SD.sounds.find(q => q.id === ch.sid); return s ? soundTime(s) : null; }
    if (ch.kind === 'newsound') return ch.t;
    const tg = ch.target; if (!tg) return null;
    if (ch.frame != null) return ch.frame / FPSs;
    if (tg.type === 'event' || tg.type === 'action') { const [n, nm] = tg.id.split(':'); return tlShot(+n) && tlShot(+n).moments[nm] ? momentT0(+n, nm) : null; }
    if (tg.type === 'act') return shotT0(+tg.id);
    if (tg.type === 'sound') { const s = SD.sounds.find(q => q.id === tg.id); return s ? soundTime(s) : null; }
    if (tg.type === 'actor') { const sh = actorShots(tg.id)[0], m = actorMeta(keyOf(tg.id)).shots[sh]; return m ? m[0] / FPSs : null; }
    return null;
  }
  const CHSTYLE = { key: ['#f0c75e', 'diamond'], draw: ['#ffb347', 'square'], note: ['#9fd49a', 'bubble'], timing: ['#ffdd88', 'diamond'], sound: ['#f0c75e', 'bar'], ref: ['#9fd49a', 'square'], newsound: ['#9fd49a', 'bar'] };
  let CHPOS = [];
  function changePositions() {
    CHPOS = [];
    for (const ch of Store.all()) {
      if (ch.kind === 'note' && (!ch.text || ch.target.type === 'film')) continue;
      const t = changeTime(ch); if (t == null) continue;
      CHPOS.push({ t, ch });
    }
    CHPOS.sort((a, b) => a.t - b.t);
  }
  function drawTLnow() {
    const dpr = tlDpr(), W0 = tlc.width / dpr, H0 = tlc.height / dpr, c = tctx, top = scroller.scrollTop;
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W0, H0);
    c.fillStyle = '#14161b'; c.fillRect(0, 0, W0, H0);
    TL.items = []; TQ.clear();
    const P = pps(), L = lanes();
    changePositions();
    const snds = SD.sounds.map(s => ({ s, t: soundTime(s) })).sort((a, b) => a.t - b.t);
    for (const r of TL.rows) { if (r.y + r.h < top - 2) continue; if (r.y > top + H0 + 2) break; drawRow(c, r, r.y - top, P, L, W0, snds); }
    drawShotbar(); updateBackPill(); pumpThumbs();
  }
  function drawRow(c, r, y, P, L, W0, snds) {
    const X = t => GUT + (t - r.t0) * P, xEnd = X(r.t1), cy = v => v - y + r.y;
    const last = r.i === TL.rows.length - 1, here = A.t >= r.t0 - 1e-9 && (A.t < r.t1 - 1e-9 || last);
    TL.items.push({ r: [GUT, r.y, Math.max(0, xEnd - GUT), r.h], kind: 'row', row: r });
    c.fillStyle = here ? '#1c2029' : '#181b22'; c.fillRect(0, y, W0, r.h);
    if (here) { c.fillStyle = '#d6a064'; c.fillRect(0, y, 2, r.h); }
    // gutter: which shot, and when
    const s0 = shotOfFrame(fr(r.t0 + 1e-6)), sh0 = tlShot(s0), opens = Math.abs(sh0.from / FPSs - r.t0) < 1e-6;
    c.textBaseline = 'alphabetic';
    c.font = '600 12px "Hanken Grotesk", sans-serif'; c.fillStyle = opens ? '#ece7dd' : '#7a8290';
    fitText(c, (opens ? '' : '… ') + sh0.n + ' ' + sh0.name, 10, y + 18, GUT - 18);
    c.font = '11px "JetBrains Mono", monospace'; c.fillStyle = here ? '#c9c4ba' : '#6f7785';
    c.fillText(fmtT(r.t0), 10, y + 34);
    if (opens && Store.get('note:act:' + sh0.n)) { c.fillStyle = '#9fd49a'; c.beginPath(); c.arc(GUT - 12, y + 14, 3.5, 0, 7); c.fill(); }
    if (GUT > 80 && L.film >= 0) { c.font = '600 9px "Hanken Grotesk", sans-serif'; c.fillStyle = '#4d5462'; c.textBaseline = 'middle'; c.fillText('MOMENTS', 10, y + L.mom + 9); c.fillText('SOUNDS', 10, y + L.snd + 8); c.fillText('CHANGES', 10, y + L.chg + 8); }
    TL.items.push({ r: [0, r.y, GUT - 6, r.h], kind: 'gutter', shot: s0, t: r.t0, tip: `Shot ${sh0.n} · ${sh0.name}\n${sh0.summary}\nClick to open the shot.` });
    // the shots in this row: frames, cuts, selection
    for (const s of TIMELINE.shots) {
      const sa = s.from / FPSs, sb = s.to / FPSs, a = Math.max(r.t0, sa), b = Math.min(r.t1, sb);
      if (b <= a + 1e-9) continue;
      const xa = X(a), xb = X(b);
      if (L.film >= 0) drawStrip(c, s, a, b, xa, xb, y + L.film, P);
      else { c.fillStyle = s.n % 2 ? '#20242d' : '#1c2028'; c.fillRect(xa, y + 3, xb - xa, r.h - 6); }
      if (sa > r.t0 + 1e-6) {                              // a cut inside the row
        c.fillStyle = '#0c0d11'; c.fillRect(xa - 1.5, y + 2, 3, r.h - 4);
        if (L.film >= 0) {
          c.font = '600 11px "Hanken Grotesk", sans-serif'; const lab = s.n + ' ' + s.name, w = Math.min(c.measureText(lab).width + 10, Math.max(24, xb - xa - 4));
          c.fillStyle = 'rgba(12,13,17,.82)'; c.fillRect(xa + 2, y + L.film + 2, w, 16);
          c.fillStyle = '#ece7dd'; fitText(c, lab, xa + 7, y + L.film + 14, w - 9);
        }
      }
      const hitShot = TL.q && TL.hitKeys.has('shot:' + s.n);
      if (A.sel && A.sel.type === 'act' && +A.sel.id === s.n || hitShot) {
        c.strokeStyle = hitShot ? '#79b8d6' : '#d6a064'; c.lineWidth = 1.5;
        c.strokeRect(xa + .75, y + .75, xb - xa - 1.5, r.h - 1.5);
      }
    }
    // where the selected character is on screen (and search hits on characters), under the frames
    const under = y + (L.film >= 0 ? L.film + TH_H + 1 : 2);
    const presence = (key, sb, col) => { const meta = actorMeta(key); for (const sN in meta.shots) { if (sb && +sN !== sb) continue; const [f0, f1] = meta.shots[sN], a = Math.max(r.t0, f0 / FPSs), b = Math.min(r.t1, (f1 + 1) / FPSs); if (b > a) { c.fillStyle = col; c.fillRect(X(a), under, X(b) - X(a), 2); } } };
    if (A.sel && A.sel.type === 'actor') presence(keyOf(A.sel.id), shotBoundOf(A.sel.id), '#d6a064');
    if (TL.q) for (const k of TL.hitKeys) if (k.startsWith('a:')) presence(k.slice(2), null, '#79b8d6');
    drawMoments(c, r, y + L.mom, cy(y + L.mom), X, xEnd);
    drawSounds(c, r, y + L.snd, cy(y + L.snd), X, xEnd, snds);
    drawChanges(c, r, y + L.chg, cy(y + L.chg), X, xEnd);
    if (here) {                                           // the playhead
      const px = X(A.t);
      c.fillStyle = '#d6a064'; c.fillRect(px - .75, y + 1, 1.5, r.h - 2);
      c.beginPath(); c.moveTo(px - 5, y); c.lineTo(px + 5, y); c.lineTo(px, y + 6); c.closePath(); c.fill();
    }
  }
  function drawStrip(c, s, a, b, xa, xb, y, P) {
    c.save(); c.beginPath(); c.rect(xa, y, xb - xa, TH_H); c.clip();
    c.fillStyle = '#0b0c10'; c.fillRect(xa, y, xb - xa, TH_H);
    const step = TH_W / P, s0 = s.from / FPSs;                // tiles start at the shot's first frame
    for (let k = Math.floor((a - s0) / step + 1e-6); ; k++) {
      const ta = s0 + k * step; if (ta >= b - 1e-6) break;
      const x = xa + (ta - a) * P, f = Math.min(s.to - 1, Math.max(s.from, fr(Math.max(ta, a) + 1e-6)));
      const th = thumbOf(f);
      if (th) c.drawImage(th, x, y, TH_W, TH_H);
      else { c.fillStyle = '#15171d'; c.fillRect(x + 1, y + 1, TH_W - 2, TH_H - 2); }
      c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(x + TH_W - 1, y, 1, TH_H);
    }
    c.restore();
  }
  function drawMoments(c, r, y, cy, X, xEnd) {
    const yc = y + 9, labels = [];
    c.font = '10px "JetBrains Mono", monospace'; c.textBaseline = 'middle';
    for (const s of TIMELINE.shots) {
      const s0 = s.from / FPSs; if (s.to / FPSs <= r.t0 || s0 >= r.t1) continue;
      const list = Object.entries(s.moments).map(([k, m]) => [k, Array.isArray(m.t) ? m.t : [m.t], m]).sort((p, q) => p[1][0] - q[1][0]);
      for (const [k, vals, m] of list) {
        const ov = SD.timeline.shots[s.n - 1].moments[k].t, moved = JSON.stringify(ov) !== JSON.stringify(m.t);
        const sel = A.sel && A.sel.type === 'event' && A.sel.id === s.n + ':' + k;
        const hk = 'm:' + s.n + ':' + k, hit = TL.q && TL.hitKeys.has(hk);
        c.globalAlpha = TL.q && !hit ? .22 : 1;
        const range = vals.length === 2;
        if (range) {
          const a = Math.max(GUT, X(s0 + vals[0])), b = Math.min(xEnd, X(s0 + vals[1]));
          if (b >= a - 1) { c.fillStyle = sel ? 'rgba(240,199,94,.62)' : 'rgba(240,199,94,.24)'; c.fillRect(a, yc - 3, Math.max(2, b - a), 6); }
        }
        if (moved) {
          const o = (Array.isArray(ov) ? ov : [ov])[0], T0 = s0 + o;
          if (T0 >= r.t0 && T0 < r.t1) { const ox = X(T0), nx = Math.max(GUT, Math.min(xEnd, X(s0 + vals[0]))); c.strokeStyle = 'rgba(255,221,136,.6)'; c.setLineDash([2, 2]); c.lineWidth = 1; c.beginPath(); c.moveTo(ox, yc); c.lineTo(nx, yc); c.stroke(); c.setLineDash([]); c.beginPath(); c.moveTo(ox, yc - 4); c.lineTo(ox + 3.2, yc); c.lineTo(ox, yc + 4); c.lineTo(ox - 3.2, yc); c.closePath(); c.stroke(); }
        }
        vals.forEach((x, i) => {
          if (range && i === 1) return;
          const T = s0 + x; if (T < r.t0 - 1e-6 || T >= r.t1 - 1e-9) return;
          const px = X(T);
          diamond(c, px, yc, sel ? 6.5 : 5.5, sel ? '#f0c75e' : moved ? '#ffdd88' : '#c9a24a', sel || hit ? '#ffffff' : null);
          labels.push({ px, lab: i === 0 ? k.replace(/^T_/, '').toLowerCase() + (vals.length > 2 ? ' ×' + vals.length : '') : null, col: sel ? '#f0c75e' : hit ? '#cfe6f2' : '#9aa1ad', a: TL.q && !hit ? .22 : 1, pri: sel || hit ? 1 : 0 });
          TL.items.push({ r: [px - 7, cy, 14, 18], kind: 'event', shot: s.n, name: k, i, tip: `${k.replace(/^T_/, '').toLowerCase()} · ${m.what}\nshot ${s.n}, ${x.toFixed(2)} s in${moved ? ' (moved)' : ''}\nDrag to move it: its sounds and music hit move too.` });
        });
      }
    }
    labels.sort((p, q) => p.px - q.px);                  // a label is shown only where it fits before the next mark
    let end = -1e9;
    labels.forEach((l, i) => {
      if (!l.lab) return;
      const w = c.measureText(l.lab).width, x = l.px + 8, next = labels.slice(i + 1).find(q => q.px > l.px + 1), room = (next ? next.px - 7 : xEnd) - x;
      if (x < end + 3 || (w > room && !l.pri)) return;
      c.globalAlpha = l.a; c.fillStyle = l.col; c.fillText(l.lab, x, yc + .5); end = x + w;
    });
    c.globalAlpha = 1;
  }
  const SNDC2 = { voice: '#d98e66', air: '#94acbd', contact: '#cdb766', foley: '#a8977e', water: '#6aa3c4', machine: '#a283c4', ambience: '#5f6b78', upload: '#9fd49a' };
  function drawSounds(c, r, y, cy, X, xEnd, snds) {
    const lh = 8, ends = [-1e9, -1e9];
    c.font = '9px "JetBrains Mono", monospace'; c.textBaseline = 'middle';
    for (const { s, t } of snds) {
      const t1 = t + s.dur; if (t1 <= r.t0 || t >= r.t1) continue;
      const e = soundEdit(s), hk = 's:' + s.id, hit = TL.q && TL.hitKeys.has(hk);
      const selS = A.sel && A.sel.type === 'sound' && A.sel.id === s.id;
      const mine = A.sel && A.sel.type === 'actor' && s.actor && s.actor === keyOf(A.sel.id);
      let dimmed = (TL.q && !hit) || (A.sel && A.sel.type === 'actor' && !mine) || (TL.legend && TL.legend !== (s.kind === 'step' ? 'steps' : s.cat));
      c.globalAlpha = e && e.mute ? .2 : dimmed ? .2 : 1;
      const x0 = Math.max(GUT, X(t)), x1 = Math.min(xEnd, Math.max(X(t) + 3, X(t1)));
      if (s.kind === 'bed') { c.fillStyle = 'rgba(111,125,140,.5)'; c.fillRect(x0, y + 2 * lh + 1, x1 - x0, 1.5); continue; }
      if (s.kind === 'step') { c.fillStyle = '#7d735f'; c.fillRect(X(t) - .5, y + 2 * lh - 2, 1.5, 4); TL.items.push({ r: [X(t) - 3, cy + 2 * lh - 3, 6, 7], kind: 'sound', id: s.id, tip: `${s.comment}\n${fmtT(t)}` }); continue; }
      let L = ends.findIndex(v => v < X(t) - 1); if (L < 0) L = ends[0] <= ends[1] ? 0 : 1;
      ends[L] = x1;
      const yy = y + L * lh;
      c.fillStyle = SNDC2[s.cat] || '#999'; c.fillRect(x0, yy, Math.max(2, x1 - x0), lh - 1.5);
      if (x1 - x0 > 26) { const lab = s.model === '?' ? s.cat : s.model.replace(/_/g, ' '); if (c.measureText(lab).width + 6 < x1 - x0) { c.fillStyle = 'rgba(12,13,17,.85)'; c.fillText(lab, x0 + 3, yy + lh / 2 - .5); } }
      if (e) { c.fillStyle = '#f0c75e'; c.fillRect(x0, yy - 1, 2.5, lh + .5); }
      if (selS || hit) { c.strokeStyle = selS ? '#ffffff' : '#79b8d6'; c.lineWidth = 1.3; c.strokeRect(x0 - .5, yy - .5, Math.max(2, x1 - x0) + 1, lh - .5); }
      TL.items.push({ r: [x0, cy + L * lh, Math.max(6, x1 - x0), lh], kind: 'sound', id: s.id, tip: `${s.comment || s.model}\n${s.model} · ${actorMeta(s.actor || '').name || 'no one in particular'} · ${fmtT(t)}${e ? '\n(you changed it)' : ''}` });
    }
    c.globalAlpha = 1;
    if (ED()) for (const c2 of Store.all()) if (c2.kind === 'newsound' && c2.t >= r.t0 && c2.t < r.t1) { const x0 = X(c2.t); c.fillStyle = SNDC2.upload; c.fillRect(x0, y + lh, 30, lh - 1.5); TL.items.push({ r: [x0, cy + lh, 30, lh], kind: 'newsound', id: c2.id, t: c2.t, tip: 'Your sound: ' + (c2.name || '') }); }
  }
  function drawChanges(c, r, y, cy, X, xEnd) {
    const yc = y + 8, inRow = CHPOS.filter(p => p.t >= r.t0 - 1e-9 && p.t < r.t1 - 1e-9);
    c.font = '12px "Hanken Grotesk", sans-serif'; c.textBaseline = 'middle';
    inRow.forEach((p, i) => {
      const ch = p.ch, [col, shape] = CHSTYLE[ch.kind] || ['#9fd49a', 'dot'], px = X(p.t);
      const hk = 'c:' + ch.id, hit = TL.q && TL.hitKeys.has(hk);
      c.globalAlpha = TL.q && !hit ? .25 : 1;
      c.fillStyle = col; c.beginPath();
      if (shape === 'diamond') { c.moveTo(px, yc - 5); c.lineTo(px + 4, yc); c.lineTo(px, yc + 5); c.lineTo(px - 4, yc); }
      else if (shape === 'square') c.rect(px - 4, yc - 4, 8, 8);
      else if (shape === 'bar') c.rect(px - 1.5, yc - 5, 3, 10);
      else { c.moveTo(px - 5, yc - 5); c.lineTo(px + 5, yc - 5); c.lineTo(px + 5, yc + 2); c.lineTo(px, yc + 2); c.lineTo(px - 3, yc + 5); c.lineTo(px - 3, yc + 2); c.lineTo(px - 5, yc + 2); c.closePath(); }
      c.fill();
      let tipTxt = describe(ch).slice(1).filter(Boolean).join('\n');
      if (ch.reply) tipTxt += `\n\nAnswer: ${ch.reply.status}${ch.reply.text ? ' · ' + ch.reply.text : ''}`;
      if (ch.kind === 'note') {                           // notes are read where they belong
        const next = inRow[i + 1] ? X(inRow[i + 1].t) - 8 : xEnd - 4, room = next - (px + 9);
        if (room > 30) { c.fillStyle = hit ? '#cfe6f2' : '#b9dcb5'; fitText(c, ch.text.replace(/\s+/g, ' ').trim(), px + 9, yc + .5, room); }
      }
      if (ch.reply) { c.fillStyle = ch.reply.status === 'skipped' ? '#e0685c' : ch.reply.status === 'adapted' ? '#f0c75e' : '#79b8d6'; c.beginPath(); c.arc(px + 5, yc - 6, 2.6, 0, 7); c.fill(); }
      TL.items.push({ r: [px - 6, cy, 12, 17], kind: 'change', id: ch.id, t: p.t, tip: tipTxt });
    });
    c.globalAlpha = 1;
  }
  function drawShotbar() {
    const dpr = tlDpr(), W0 = shotbar.width / dpr, H0 = shotbar.height / dpr, c = sbctx;
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W0, H0);
    const x = t => t / DUR * W0;
    for (const s of TIMELINE.shots) { const a = x(s.from / FPSs), b = x(s.to / FPSs); c.fillStyle = s.n === curShot ? '#4a4235' : s.n % 2 ? '#262b35' : '#20242d'; c.fillRect(a, 3, Math.max(1, b - a - 1), H0 - 6); }
    for (const p of CHPOS) { c.fillStyle = (CHSTYLE[p.ch.kind] || ['#9fd49a'])[0]; c.fillRect(x(p.t) - .5, H0 - 5, 1.5, 3); }
    if (TL.q) for (const hh of TL.hits) { const t = typeof hh.t === 'function' ? hh.t() : hh.t; c.fillStyle = '#79b8d6'; c.fillRect(x(t) - .5, 3, 1.5, 4); }
    const top = scroller.scrollTop, vh = scroller.clientHeight, vis = TL.rows.filter(r => r.y + r.h > top && r.y < top + vh);
    if (vis.length) { const a = x(vis[0].t0), b = x(vis[vis.length - 1].t1); c.fillStyle = 'rgba(214,160,100,.14)'; c.fillRect(a, 1, Math.max(3, b - a), H0 - 2); c.strokeStyle = '#d6a064'; c.lineWidth = 1.5; c.strokeRect(a + .75, 1.25, Math.max(3, b - a - 1.5), H0 - 2.5); }
    c.fillStyle = '#d6a064'; c.fillRect(x(A.t) - 1, 0, 2, H0);
  }

  // ---- keeping the playhead in view, calmly ----
  function ensureVisible(t, how = 'nearest', instant = false) {
    const r = rowOfT(t); if (!r) return;
    const top = scroller.scrollTop, vh = scroller.clientHeight, max = Math.max(0, TL.total - vh);
    let to = null;
    if (how === 'center') to = r.y + r.h / 2 - vh / 2;
    else if (how === 'page') { if (r.y + r.h > top + vh - 4 || r.y < top) to = r.y - Math.min(30, vh * .12); }   // turn the page: the row goes to the top
    else if (r.y < top + 2) to = r.y - 8;
    else if (r.y + r.h > top + vh - 2) to = r.y + r.h - vh + 8;
    if (to == null) return;
    to = Math.max(0, Math.min(max, Math.round(to)));
    if (Math.abs(to - top) < 1) return;
    if (instant || REDUCED) scroller.scrollTop = to; else scroller.scrollTo({ top: to, behavior: 'smooth' });
  }
  function updateBackPill() {
    const r = rowOfT(A.t); if (!r) return;
    const top = scroller.scrollTop, vh = scroller.clientHeight;
    const dir = r.y + r.h < top + 8 ? -1 : r.y > top + vh - 8 ? 1 : 0;
    backPill.hidden = !dir;
    if (dir) backPill.innerHTML = `<b>${dir < 0 ? '↑' : '↓'}</b>Back to the playhead`;
  }
  backPill.onclick = () => { TL.follow = true; ensureVisible(A.t, 'center'); };
  const userScroll = () => { if (A.playing) TL.follow = false; tip.hidden = true; };
  scroller.addEventListener('wheel', e => {
    if (e.ctrlKey || e.metaKey) { e.preventDefault(); zoomRows(e.deltaY > 0 ? 1.1 : 1 / 1.1, e); return; }
    userScroll();
  }, { passive: false });
  scroller.addEventListener('touchstart', userScroll, { passive: true });
  scroller.addEventListener('pointerdown', e => { if (e.target === scroller) userScroll(); });
  scroller.addEventListener('scroll', () => { tip.hidden = true; drawTL(); });
  function zoomRows(f, e, abs) {
    let anchorT = A.t, offset = null;
    const rc = tlc.getBoundingClientRect(), top = scroller.scrollTop;
    if (e) { const r = rowAtY(e.clientY - rc.top + top); if (r) { anchorT = tOfX(r, e.clientX - rc.left); offset = r.y - top; } }
    if (offset == null) { const r = rowOfT(anchorT); offset = r ? r.y - top : 0; }
    TL.len = abs != null ? abs : TL.len * f;
    layoutRows(); saveTL();
    const r1 = rowOfT(anchorT); if (r1) scroller.scrollTop = Math.max(0, r1.y - offset);
    drawTL();
  }
  $('#tlLen').addEventListener('input', e => { zoomRows(1, null, lenFromSlider(+e.target.value)); if (!A.playing) ensureVisible(A.t, 'nearest', true); });
  $('#tlByShot').onclick = () => { if (TL.by === 'shot') return; TL.by = 'shot'; zoomRows(1, null, Math.min(TL.len, maxLen())); ensureVisible(A.t, 'center', true); };
  $('#tlByTime').onclick = () => { if (TL.by === 'time') return; TL.by = 'time'; zoomRows(1, null, TL.len >= maxLen() - .01 && TL.len < 9 ? 10 : TL.len); ensureVisible(A.t, 'center', true); };
  $('#tlThumbs').onclick = () => { TL.thumbs = !TL.thumbs; const t = A.t; layoutRows(); saveTL(); ensureVisible(t, 'center', true); drawTL(); };
  let wholePrev = null;
  function toggleWholeFilm() {
    if (TL.by === 'time' && TL.len >= DUR - .01) { const w = wholePrev || { by: 'shot', len: +(LONGEST + .08).toFixed(2) }; TL.by = w.by; zoomRows(1, null, w.len); wholePrev = null; }
    else { wholePrev = { by: TL.by, len: TL.len }; TL.by = 'time'; zoomRows(1, null, DUR); }
    ensureVisible(A.t, 'center', true);
  }

  // ---- the legend: hover a colour to see only those sounds ----
  (() => {
    const lg = $('#tlLegend'), cats = [['voice', 'voices'], ['air', 'air'], ['contact', 'hits'], ['foley', 'foley'], ['water', 'water'], ['machine', 'machines'], ['ambience', 'ambience']];
    for (const [k, lab] of cats) {
      const el = h('span', { style: { '--c': SNDC2[k] }, title: 'Sounds: ' + lab + ' (hover to see only these)' }, h('i'), h('b', { style: { fontWeight: 400 } }, lab));
      el.addEventListener('pointerenter', () => { TL.legend = k; drawTL(); });
      el.addEventListener('pointerleave', () => { TL.legend = null; drawTL(); });
      lg.append(el);
    }
  })();

  // ---- the shot bar: the whole film at a glance ----
  shotbar.addEventListener('pointerdown', e => {
    cap(shotbar, e); if (A.playing) togglePlay();
    const go = ev => { const rc = shotbar.getBoundingClientRect(); setT((ev.clientX - rc.left) / rc.width * DUR); ensureVisible(A.t, 'center', true); };
    go(e);
    const mv = ev => go(ev), up = () => { shotbar.removeEventListener('pointermove', mv); shotbar.removeEventListener('pointerup', up); };
    shotbar.addEventListener('pointermove', mv); shotbar.addEventListener('pointerup', up);
  });
  shotbar.addEventListener('mousemove', e => { const rc = shotbar.getBoundingClientRect(), f = fr((e.clientX - rc.left) / rc.width * DUR), s = tlShot(shotOfFrame(f)); shotbar.title = `${s.n} · ${s.name} (${fmtT(f / FPSs)})`; });

  // ---- pointer: scrub, pick, drag moments and sounds ----
  function tlHit(x, y) { for (let i = TL.items.length - 1; i >= 0; i--) { const it = TL.items[i], q = it.r; if (x >= q[0] - 2 && x <= q[0] + q[2] + 2 && y >= q[1] && y <= q[1] + q[3]) return it; } return null; }
  const tlPt = e => { const rc = tlc.getBoundingClientRect(); return [e.clientX - rc.left, e.clientY - rc.top + scroller.scrollTop]; };
  function tlPress(it, x, y) {
    if (A.playing) togglePlay();
    TL.follow = true;
    if (!it) { const r = rowAtY(y); if (r && x >= GUT) { A.tdrag = { kind: 'scrub' }; setT(tOfX(r, x)); } return; }
    if (it.kind === 'gutter') { select({ type: 'act', id: String(it.shot) }); setT(it.t); return; }
    if (it.kind === 'row') { A.tdrag = { kind: 'scrub' }; setT(tOfX(it.row, x)); return; }
    if (it.kind === 'event') {
      select({ type: 'event', id: it.shot + ':' + it.name });
      const v = momentVal(it.shot, it.name);
      setT(momentT0(it.shot, it.name) + (Array.isArray(v) && v.length > 2 ? v[it.i] - v[0] : 0));
      A.tdrag = { kind: 'event', it, x0: x, orig: JSON.parse(JSON.stringify(v)), moved: false, blocked: !canEdit(false) };
      return;
    }
    if (it.kind === 'sound') {
      select({ type: 'sound', id: it.id }); const s = SD.sounds.find(q => q.id === it.id); setT(soundTime(s));
      if (s.kind !== 'step') { A.tdrag = { kind: 'sound', it, x0: x, shift0: (soundEdit(s) || {}).shift || 0, moved: false, blocked: !canEdit(false) }; if (!A.tdrag.blocked) Store.begin('sound:' + s.id); }
      return;
    }
    if (it.kind === 'change') { const ch = Store.get(it.id); if (ch) { selectChangeTarget(ch); setT(it.t); } return; }
    if (it.kind === 'newsound') { setT(it.t); return; }
  }
  tlc.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    const [x, y] = tlPt(e), it = tlHit(x, y);
    tip.hidden = true;
    if (e.pointerType === 'touch') { A.tdrag = { kind: 'touch', cx: e.clientX, cy: e.clientY, it, x, y, id: e.pointerId }; return; }   // wait: a swipe up or down scrolls
    cap(tlc, e); tlPress(it, x, y);
  });
  tlc.addEventListener('pointermove', e => {
    const [x, y] = tlPt(e);
    if (!A.tdrag) {
      const it = tlHit(x, y);
      if (it && it.tip) { const rc = $('#tl').getBoundingClientRect(), cr = tlc.getBoundingClientRect(); tip.hidden = false; tip.textContent = it.tip; tip.style.left = Math.min(cr.left - rc.left + x + 14, rc.width - 350) + 'px'; tip.style.top = Math.max(0, cr.top - rc.top + y - scroller.scrollTop - 64) + 'px'; }
      else tip.hidden = true;
      tlc.style.cursor = it && (it.kind === 'event' || it.kind === 'sound') ? 'ew-resize' : it && (it.kind === 'gutter' || it.kind === 'change') ? 'pointer' : 'default';
      return;
    }
    const d = A.tdrag;
    if (d.kind === 'touch') {
      const dx = e.clientX - d.cx, dy = e.clientY - d.cy;
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) { cap(tlc, e); A.tdrag = null; tlPress(d.it && d.it.kind !== 'gutter' ? d.it : null, d.x, d.y); if (A.tdrag && A.tdrag.kind === 'scrub') { const r = rowAtY(y); if (r) setT(tOfX(r, x)); } }
      return;
    }
    if (d.kind === 'scrub') { const r = rowAtY(y); if (r) setT(tOfX(r, x)); return; }
    const P = pps(), dt = Math.round((x - d.x0) / P * FPSs) / FPSs;
    if (d.blocked) { if (!d.warned && Math.abs(x - d.x0) > 3) { d.warned = true; canEdit(true); } return; }
    if (d.kind === 'event') {
      if (!d.moved && Math.abs(x - d.x0) < 3) return; d.moved = true;
      const m = tlShot(d.it.shot).moments[d.it.name], o = d.orig;
      if (!Array.isArray(o)) m.t = +(o + dt).toFixed(4);
      else if (o.length === 2) m.t = o.map(v => +(v + dt).toFixed(4));
      else {                                              // one of several occurrences: only that one, kept in order
        const i = d.it.i, lo = i > 0 ? o[i - 1] + 1 / FPSs : -Infinity, hi = i < o.length - 1 ? o[i + 1] - 1 / FPSs : Infinity;
        m.t = o.map((v, j) => j === i ? +Math.max(lo, Math.min(hi, v + dt)).toFixed(4) : v);
      }
      delete _MOMENTS[tlShot(d.it.shot).name];
      const v = m.t; setT(momentT0(d.it.shot, d.it.name) + (Array.isArray(v) && v.length > 2 ? v[d.it.i] - v[0] : 0));
    } else if (d.kind === 'sound') {
      if (!d.moved && Math.abs(x - d.x0) < 3) return; d.moved = true;
      const s = SD.sounds.find(q => q.id === d.it.id), e2 = soundEdit(s) || { id: 'sound:' + s.id, kind: 'sound', sid: s.id };
      Store.put(Object.assign({}, e2, { shift: Math.round(d.shift0 + dt * 1000) }), { undo: false }); drawTL();
    }
  });
  const tlUp = e => {
    const d = A.tdrag; A.tdrag = null;
    if (!d) return;
    if (d.kind === 'touch') { if (e.type === 'pointerup') tlPress(d.it, d.x, d.y); A.tdrag = null; return; }
    if (d.blocked) return;
    if (d.kind === 'event' && d.moved) {
      const s = d.it.shot, name = d.it.name, to = momentVal(s, name), from = SD.timeline.shots[s - 1].moments[name].t;
      if (JSON.stringify(to) === JSON.stringify(from)) Store.del(`timing:${s}:${name}`);
      else Store.put({ id: `timing:${s}:${name}`, kind: 'timing', shot: s, moment: name, from, to });
    }
    if (d.kind === 'sound') Store.commit('sound:' + d.it.id);
  };
  tlc.addEventListener('pointerup', tlUp);
  tlc.addEventListener('pointercancel', tlUp);
  tlc.addEventListener('pointerleave', () => { if (!A.tdrag) tip.hidden = true; });
  function zoomTo(shot) { ensureVisible((shotT0(shot) + shotT1(shot)) / 2, 'center'); }
  function rowStep(dir) {
    const r = rowOfT(A.t); if (!r) return;
    const q = TL.rows[r.i + dir]; if (!q) return;
    setT(Math.min(q.t1 - 1 / FPSs, q.t0 + (A.t - r.t0)));
    ensureVisible(A.t, 'nearest');
  }

  // ---- resizing the panel ----
  const appEl = $('#app');
  function setTLH(v, save = true) {
    const max = Math.max(150, innerHeight - 44 - 170);
    TL.h = Math.round(Math.max(130, Math.min(max, v)));
    appEl.style.setProperty('--tlH', TL.h + 'px');
    if (save) saveTL();
    resize();
  }
  (() => {
    const rz = $('#tlResize');
    rz.addEventListener('pointerdown', e => {
      cap(rz, e); rz.classList.add('drag');
      const y0 = e.clientY, h0 = TL.h;
      const mv = ev => setTLH(h0 + (y0 - ev.clientY), false);
      const up = () => { rz.classList.remove('drag'); rz.removeEventListener('pointermove', mv); rz.removeEventListener('pointerup', up); saveTL(); };
      rz.addEventListener('pointermove', mv); rz.addEventListener('pointerup', up);
    });
    rz.addEventListener('dblclick', () => setTLH(TL.h < innerHeight * .45 ? innerHeight * .6 : 250));
    rz.addEventListener('keydown', e => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); setTLH(TL.h + (e.key === 'ArrowUp' ? 30 : -30)); } });
  })();

  // ---- find: Ctrl+F for the film ----
  const findEl = $('#tlFind'), findN = $('#tlFindN');
  let INDEX = null;
  function buildIndex() {
    const out = [];
    for (const s of TIMELINE.shots) {
      out.push({ key: 'shot:' + s.n, text: `${s.n} ${s.name} ${s.summary} shot`, t: s.from / FPSs, sel: { type: 'act', id: String(s.n) } });
      for (const k in s.moments) { const m = s.moments[k]; out.push({ key: 'm:' + s.n + ':' + k, text: `${k} ${k.replace(/^T_/, '')} ${m.what} moment`, t: () => momentT0(s.n, k), sel: { type: 'event', id: s.n + ':' + k } }); }
    }
    for (const so of SD.sounds) { if (so.kind === 'bed') continue; out.push({ key: 's:' + so.id, text: `${so.comment} ${so.model} ${so.model.replace(/_/g, ' ')} ${so.cat} ${so.actor ? actorMeta(so.actor).name : ''} sound`, t: () => soundTime(so), sel: { type: 'sound', id: so.id } }); }
    for (const a of Object.values(SD.actors)) for (const sN in a.shots) { const [f0, f1] = a.shots[sN]; out.push({ key: 'a:' + a.key, text: `${a.name} ${a.key} ${a.fn} ${a.cat}`, t: ((f0 + f1) >> 1) / FPSs, sel: { type: 'actor', id: aidOf(a.key, +sN) } }); }
    return out;
  }
  function runFind() {
    const q = findEl.value.trim().toLowerCase(); TL.q = q.length >= 2 ? q : '';
    TL.hits = []; TL.hitKeys = new Set(); TL.hit = -1;
    if (TL.q) {
      if (!INDEX) INDEX = buildIndex();
      const words = TL.q.split(/\s+/), notes = Store.all().filter(c => c.kind === 'note' && c.text).map(c => ({ key: 'c:' + c.id, text: c.text, t: () => changeTime(c) || 0, change: c }));
      for (const it of INDEX.concat(notes)) { const tx = it.text.toLowerCase(); if (words.every(w => tx.includes(w))) { TL.hits.push(it); TL.hitKeys.add(it.key); } }
      const tv = it => typeof it.t === 'function' ? it.t() : it.t;
      TL.hits.sort((a, b) => tv(a) - tv(b));
    }
    findN.textContent = !TL.q ? '' : TL.hits.length ? `${TL.hits.length} found` : 'none';
    drawTL();
  }
  function findStep(dir) {
    if (!TL.hits.length) return;
    TL.hit = (TL.hit + dir + TL.hits.length) % TL.hits.length;
    const it = TL.hits[TL.hit], t = typeof it.t === 'function' ? it.t() : it.t;
    if (A.playing) togglePlay();
    setT(t);
    if (it.change) selectChangeTarget(it.change); else select(it.sel);
    ensureVisible(A.t, 'center');
    findN.textContent = `${TL.hit + 1} of ${TL.hits.length}`;
  }
  findEl.addEventListener('input', runFind);
  findEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); findStep(e.shiftKey ? -1 : 1); }
    else if (e.key === 'Escape') { findEl.value = ''; runFind(); findEl.blur(); }
  });

  // ------------------------------------------------------------------ selection
  function targetOf(sel) {
    if (!sel) return null;
    return { type: sel.type, id: sel.id };
  }
  function select(sel, jump = false) {
    const ae = document.activeElement;
    if (ae && ae.tagName === 'TEXTAREA' && document.getElementById('insp').contains(ae)) ae.blur();   // a note being typed keeps its own target
    A.sel = sel; A.cut = null; A.spec = null;
    if (sel && sel.type === 'actor' && jump) {
      const sh = actorShots(sel.id); const cur = sh.includes(curShot);
      if (!cur && sh.length) { const [f0, f1] = actorMeta(keyOf(sel.id)).shots[sh[0]]; setT(((f0 + f1) >> 1) / FPSs); zoomTo(sh[0]); }
    }
    render(); renderInsp(); drawTL();                     // draw first, so the inspector sees this frame
    touchMode();
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
  const noteOn = tg => tg.type === 'film' ? 'the whole film' : tg.type === 'act' ? 'shot ' + tg.id : tg.type === 'event' ? tg.id.split(':')[1].replace(/^T_/, '').toLowerCase() : tg.type === 'action' ? 'their part in ' + tg.id.split(':')[1].replace(/^T_/, '').toLowerCase() : tg.type === 'actor' ? actorMeta(keyOf(tg.id)).name.toLowerCase().replace(/^the /, 'the ') : tg.type === 'sound' ? 'this sound' : tg.id;
  function noteBox(target, placeholder) {
    const id = 'note:' + tid(target), ex = Store.get(id);
    const where = () => target.type === 'actor' ? { shot: ex && ex.shot || curShot, frame: ex && ex.frame != null ? ex.frame : curFrame } : {};   // a character's note remembers where you were
    const ta = h('textarea', { rows: 3, placeholder: placeholder || 'What should be different in the next version?', class: ex && ex.text ? 'has' : null });
    ta.value = ex ? ex.text : '';
    let tmo = null;
    ta.addEventListener('input', () => {
      ta.classList.toggle('has', !!ta.value.trim());
      clearTimeout(tmo);
      tmo = setTimeout(() => { if (ta.value.trim()) Store.put(Object.assign({ id, kind: 'note', target, text: ta.value }, where(), ex && ex.reply ? { reply: ex.reply } : {}), { undo: false }); else Store.del(id, { undo: false }); }, 350);
    });
    const rp = ex && ex.reply ? h('div', { class: 'rvReply ' + ex.reply.status }, h('b', null, ex.reply.status), ex.reply.text || '') : null;
    return h('div', { class: 'sec' }, h('h3', null, 'Note on ' + noteOn(target)), ta, rp);
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
    insp.classList.toggle('readonly', showingOriginal());
    if (showingOriginal()) p.prepend(h('div', { class: 'roBanner' }, h('b', null, 'Original'), ' You are looking at the checkpoint as it is, so nothing here can be changed. ', h('button', { class: 'btn tiny', onclick: () => { A.edits = true; A.peek = false; A.thumbVer++; applyTiming(); restartAudio(); render(); renderInsp(); drawTL(); } }, 'Back to yours')));
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
        h('div', { class: 'muted' }, 'Watch, point, say. Click anything in the picture, or a moment, sound or note in the rows below. Drag joints to re-pose; each change becomes a keyframe on this frame. Write a note on whatever you selected. Hold Compare (or E) to see the original. Hand off turns everything into instructions for an agent or any chat LLM.')),
      h('div', { class: 'sec' }, h('h3', null, 'Keys'),
        h('div', { class: 'muted', style: { fontFamily: 'var(--f-mono)', fontSize: '11px', lineHeight: '1.7' } }, 'Space play · ←/→ frame · Shift+←/→ moment · ↑/↓ row · [ ] beat · Home/End start/end · hold E compare · S split · / find · N note · V select · D draw · O onion · L loop · C cast · R review · F whole film · Ctrl+Z undo · Esc deselect')),
      noteBox({ type: 'film', id: 'film' }, 'A note on the whole film'));
  }
  function inspAct(n) {
    const s = tlShot(n), o = origShot(n), meta = Object.values(SD.actors).filter(a => a.shots[n]);
    const cast = meta.filter(a => !['set', 'fx', 'camera'].includes(a.cat));
    const sets = meta.filter(a => ['set', 'fx', 'camera'].includes(a.cat));
    const chip = a => h('button', { class: 'chip', style: { '--c': CATC[a.cat] }, onclick: () => select({ type: 'actor', id: aidOf(a.key, n) }) }, h('i'), a.name);
    const moments = Object.entries(s.moments).map(([k, m]) => h('div', { class: 'li', title: k, style: { cursor: 'pointer' }, onclick: e => { if (e.target.closest('button')) return; setT(momentT0(n, k)); select({ type: 'event', id: n + ':' + k }); } }, h('span', { class: 't' }, (Array.isArray(m.t) ? m.t[0] : m.t).toFixed(2)), h('div', { class: 'n' }, h('b', null, nice(k)), Array.isArray(m.t) && m.t.length > 2 ? ' ×' + m.t.length : '', ' ', h('small', null, m.what)), h('div', { class: 'acts' }, h('button', { 'aria-label': 'Open', onclick: () => { setT(momentT0(n, k)); select({ type: 'event', id: n + ':' + k }); } }, ic('jump')))));
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
      if (!canEdit()) return;
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
      head(`Moment ${name} · shot ${n} ${s.name}`, 'var(--key)', nice(name), m.what),
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
      h('div', { class: 'sec' }, h('h3', null, 'In these moments'), list(acts.map(([e]) => { const [n, nm] = e.split(':'); return h('div', { class: 'li' }, h('span', { class: 't' }, 'S' + n), h('div', { class: 'n' }, h('b', null, nice(nm)), ' ', h('small', null, tlShot(+n).moments[nm].what)), h('div', { class: 'acts' }, h('button', { 'aria-label': 'Open', onclick: () => { setT(momentT0(+n, nm)); select({ type: 'event', id: e, action: key }); } }, ic('jump')))); }), 'None')),
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
    for (const [lbl, f, st] of root) grid.append(scrub(lbl, () => { const o = ovAt(aid, curShot, curFrame) || {}; return f === 'rot' ? (o.rot || 0) * 180 / Math.PI : f === 'sc' ? (o.sc || 1) : (o[f] || 0); }, d => { const kk = liveKey(aid); if (f === 'sc') kk.sc = Math.max(.1, (kk.sc || 1) + d); else kk[f] = (kk[f] || 0) + (f === 'rot' ? d * Math.PI / 180 * 50 : d); render(); }, st, k && (f === 'sc' ? k.sc && k.sc !== 1 : k[f]), null, f === 'rot' ? 1 / 50 : 1));
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
  // a number you can drag sideways, or click and type
  function scrub(label, get, onDelta, step, changed, gid, perUnit = 1) {
    const v = get();
    const el = h('div', { class: 'scrub' + (changed ? ' changed' : ''), tabindex: 0, role: 'slider', 'aria-label': label, title: 'Drag sideways, or click and type', 'aria-valuenow': typeof v === 'number' ? v.toFixed(3) : '' }, h('span', { class: 'v' }, typeof v === 'number' ? fmtV(v) : '–'));
    const type = () => {
      if (typeof get() !== 'number') return;
      let over = false;
      const inp = h('input', { type: 'text', inputmode: 'decimal', value: fmtV(get()), 'aria-label': label, class: 'scrubIn' });
      el.replaceChildren(inp); inp.focus(); inp.select();
      const done = ok => {
        if (over) return; over = true;
        const nv = parseFloat(inp.value.replace(',', '.'));
        if (ok && isFinite(nv) && canEdit()) { if (gid) Store.begin(gid); onDelta((nv - get()) * perUnit); commitLive(); if (gid) Store.commit(gid); }
        renderInsp();
      };
      inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); done(true); } else if (e.key === 'Escape') { e.preventDefault(); done(false); } });
      inp.addEventListener('blur', () => done(true));
    };
    el.addEventListener('pointerdown', e => {
      if (e.target.tagName === 'INPUT') return;
      cap(el, e); let lx = e.clientX, moved = 0; A.busy = true; if (gid) Store.begin(gid);
      const mv = ev => { const dx = ev.clientX - lx; lx = ev.clientX; moved += Math.abs(dx); if (moved < 3) return; onDelta(dx * step * (ev.shiftKey ? .2 : 1)); const nv = get(); el.firstChild.textContent = typeof nv === 'number' ? fmtV(nv) : '–'; };
      const up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); A.busy = false; if (moved < 3) { if (gid) Store.commit(gid); type(); return; } commitLive(); if (gid) Store.commit(gid); renderInsp(); };
      el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up);
    });
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); type(); return; }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); if (gid) Store.begin(gid); onDelta((e.key === 'ArrowRight' ? 1 : -1) * step * 5); commitLive(); if (gid) Store.commit(gid); renderInsp(); }
    });
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
    const upd = (patch, o) => { if (!canEdit()) return; const cur = soundEdit(s) || { id: 'sound:' + s.id, kind: 'sound', sid: s.id }; const nx = Object.assign({}, cur, patch); const empty = !nx.gain && !nx.pan && !nx.shift && !nx.mute && (!nx.mask || Snd.maskEmpty(nx.mask)) && !nx.replace; if (empty) Store.del(nx.id, o); else Store.put(nx, o); };
    const G = 'sound:' + s.id, NU = { undo: false };
    const uploadsHere = Store.all().filter(c => c.kind === 'ref' && c.target.type === 'sound' && c.target.id === id && (c.mime || '').startsWith('audio'));
    const brush = A.brush || (A.brush = { mode: null, r: 2 });
    const bt = (m, lbl, title) => h('button', { class: 'tog', 'aria-pressed': brush.mode === m, title, onclick: () => { brush.mode = brush.mode === m ? null : m; renderInsp(); } }, lbl);
    const mom = s.moment ? `${s.moment[1]} in shot ${s.moment[0]}` : 'a plain time';
    return h('div', { class: 'ip' },
      head('Sound · ' + s.cat + (s.kind === 'step' ? ' · footstep' : s.kind === 'bed' ? ' · ambience' : ''), SNDC[s.cat], s.comment || s.model, `${fmtT(soundTime(s))} · ${s.dur.toFixed(2)} s · ${s.actor ? actorMeta(s.actor).name : 'no one in particular'}`),
      h('div', { class: 'sec' },
        h('h3', null, 'Spectrum', h('span', { class: 'grow' }),
          h('button', { class: 'btn tiny', onclick: () => Snd.load().then(() => Snd.preview(Snd.clip.get(s.id))) }, ic('play'), 'Original'),
          h('button', { class: 'btn tiny', onclick: () => { const cur = soundEdit(s) || {}; const b = cur.replace && Snd.uploads.get(cur.replace) ? Snd.uploads.get(cur.replace) : cur.mask && !Snd.maskEmpty(cur.mask) ? Snd.editedBuf(s.id, cur.mask) : Snd.clip.get(s.id); Snd.load().then(() => Snd.preview(b || Snd.clip.get(s.id), cur.gain || 0)); } }, ic('play'), 'Edited')),
        h('div', { class: 'spec' + (brush.mode ? ' armed' : ''), title: brush.mode ? '' : 'Pick Cut, Boost, Add or Erase to paint on the sound' }, h('canvas', { id: 'spc' }), h('span', { class: 'axis', style: { top: '4px' } }, '20k'), h('span', { class: 'axis', style: { top: '50%' } }, '900'), h('span', { class: 'axis', style: { bottom: '4px' } }, '40 Hz')),
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
    if (!A.brush || !A.brush.mode) { toast('Pick Cut, Boost, Add or Erase first, then paint on the sound.'); return; }
    if (!canEdit()) return;
    const cv = e.target, s = SD.sounds.find(q => q.id === A.sel.id); if (!s) return;
    cap(cv, e);
    const cur = soundEdit(s) || { id: 'sound:' + s.id, kind: 'sound', sid: s.id };
    const ed = JSON.parse(JSON.stringify(cur)); if (!ed.mask) ed.mask = Snd.newMask();
    const m = ed.mask, br = A.brush;
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
  // ---- review: everything you changed, in film order, as something you can read ----
  const RVQ = []; let rvT = 0;
  const changeFrame = c => { const t = changeTime(c); return t == null ? null : Math.min(NFR - 1, fr(t + 1e-6)); };
  function pumpRv() {
    if (rvT) return;
    rvT = setTimeout(() => {
      rvT = 0; const job = RVQ.shift(); if (!job) return;
      if (job.box.isConnected) drawRvThumb(job);
      if (RVQ.length) pumpRv();
    }, 12);
  }
  function drawRvThumb({ c, f, cv, box }) {
    const W0 = cv.width, H0 = cv.height, t = f / FPSs;
    const mk = () => { const x = document.createElement('canvas'); x.width = W0; x.height = H0; const g = x.getContext('2d', { willReadFrequently: true }); patch(g); return [x, g]; };
    const [mine, gm] = mk();
    offFrame(f, () => { const e = A.edits; A.edits = true; applyTiming(); try { INST.frame(gm, t); } finally { A.edits = e; applyTiming(); } });
    let before = null;
    if (c.kind === 'key' || c.kind === 'timing' || window.PATCH) { const [bc, gb] = mk(); offFrame(f, () => renderOriginal(gb, t)); before = bc; }
    const g = cv.getContext('2d');
    g.drawImage(mine, 0, 0);
    if (c.kind === 'draw') {
      const k = W0 / 1920; g.lineCap = g.lineJoin = 'round';
      for (const st of c.strokes || []) { g.strokeStyle = st.c; g.lineWidth = (st.w || 5) * k; g.beginPath(); st.p.forEach((q, i) => i ? g.lineTo(q[0] * k, q[1] * k) : g.moveTo(q[0] * k, q[1] * k)); g.stroke(); }
    }
    if (before) {                                         // outline what differs from the original
      const a = gm.getImageData(0, 0, W0, H0).data, b = before.getContext('2d').getImageData(0, 0, W0, H0).data;
      let x0 = W0, y0 = H0, x1 = -1, y1 = -1;
      for (let i = 0, px = 0; i < a.length; i += 4, px++) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 30) { const x = px % W0, y = (px / W0) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 >= 0) { g.setLineDash([6, 4]); g.strokeStyle = '#f0c75e'; g.lineWidth = 2; g.strokeRect(Math.max(1, x0 - 4), Math.max(1, y0 - 4), Math.min(W0 - 2, x1 - x0 + 8), Math.min(H0 - 2, y1 - y0 + 8)); g.setLineDash([]); }
      const after = document.createElement('canvas'); after.width = W0; after.height = H0; after.getContext('2d').drawImage(cv, 0, 0);
      const show = img => { g.drawImage(img, 0, 0); };
      box.addEventListener('pointerdown', e => { e.preventDefault(); show(before); box.querySelector('.rvHint').dataset.was = box.querySelector('.rvHint').textContent; box.querySelector('.rvHint').textContent = 'original'; });
      const back = () => { show(after); const hn = box.querySelector('.rvHint'); if (hn.dataset.was) hn.textContent = hn.dataset.was; };
      box.addEventListener('pointerup', back); box.addEventListener('pointerleave', back);
    }
  }
  const nice = k => k.replace(/^T_/, '').toLowerCase();
  const isExample = c => c.example && (c.updated || 0) - c.example < 1500;   // an example you changed is yours
  function rvCard(c) {
    const [icn, t1, t2] = describe(c), f = changeFrame(c), s = shotOfChange(c), tg = c.target;
    let th;
    const so = c.kind === 'sound' || (tg && tg.type === 'sound') ? SD.sounds.find(q => q.id === (c.sid || (tg && tg.id))) : null;
    if (so) {
      const e = soundEdit(so);
      const yours = () => Snd.load().then(() => { const b = e.replace && Snd.uploads.get(e.replace) ? Snd.uploads.get(e.replace) : e.mask && !Snd.maskEmpty(e.mask) ? Snd.editedBuf(so.id, e.mask) : Snd.clip.get(so.id); Snd.preview(b || Snd.clip.get(so.id), e.gain || 0); });
      th = h('div', { class: 'rvThumb noimg rvSound' }, h('div', { class: 'rvPlay' },
        h('button', { class: 'btn tiny', onclick: () => Snd.load().then(() => Snd.preview(Snd.clip.get(so.id))) }, ic('play'), 'Original'),
        e ? h('button', { class: 'btn tiny', onclick: yours }, ic('play'), 'Yours') : null));
    } else if (f == null) th = h('div', { class: 'rvThumb noimg' }, 'the whole film');
    else {
      const cv = h('canvas', { width: 352, height: 198 });
      th = h('div', { class: 'rvThumb', title: c.kind === 'key' || c.kind === 'timing' || window.PATCH ? 'Hold to see the original' : 'Frame ' + f }, cv, h('span', { class: 'rvHint' }, `f ${f} · ${fmtT(f / FPSs)}`));
      RVQ.push({ c, f, cv, box: th }); pumpRv();
    }
    const addr = [];
    if (c.kind === 'key') addr.push(actorName(c.aid));
    if (c.kind === 'timing') addr.push(nice(c.moment));
    if (tg && (tg.type === 'event' || tg.type === 'action')) addr.push(nice(tg.id.split(':')[1]));
    if (tg && tg.type === 'action') addr.push(actorMeta(tg.id.split(':')[2]).name);
    if (tg && tg.type === 'actor') addr.push(actorName(tg.id));
    if (c.kind === 'sound' || (tg && tg.type === 'sound')) { const so = SD.sounds.find(q => q.id === (c.sid || (tg && tg.id))); if (so) addr.push('sound: ' + so.model.replace(/_/g, ' ') + ' at ' + fmtT(soundTime(so))); }
    if (f != null && c.kind !== 'sound') addr.push('frame ' + f);
    const isNote = c.kind === 'note';
    let text = isNote ? c.text.trim() : t2 ? `${t1}: ${t2}` : t1;
    if (c.kind === 'timing') { const fa = [].concat(c.from), ta = [].concat(c.to), i = Math.max(0, fa.findIndex((v, k) => Math.abs(v - ta[k]) > 1e-6)), d = Math.round((ta[i] - fa[i]) * FPSs); text = `${nice(c.moment)}${fa.length > 2 ? ` (the ${['first', 'second', 'third', 'fourth', 'fifth', 'sixth'][i] || (i + 1) + 'th'} time)` : ''} happens ${Math.abs(d)} frame${Math.abs(d) === 1 ? '' : 's'} ${d > 0 ? 'later' : 'earlier'} (${(+fa[i]).toFixed(2)} → ${(+ta[i]).toFixed(2)} s into the shot)`; }
    const body = h('div', { class: 'rvBody' },
      h('div', { class: 'rvAddr' }, h('i', { html: icn, style: { display: 'inline-grid', color: 'var(--muted)' } }), addr.map(x => h('span', null, x)), isExample(c) ? h('span', { style: { color: 'var(--rain)' } }, 'example') : null),
      h('div', { class: 'rvText' + (isNote ? '' : ' what') }, text),
      c.reply ? h('div', { class: 'rvReply ' + c.reply.status }, h('b', null, c.reply.status), c.reply.text || '') : null);
    const acts = h('div', { class: 'rvActs' },
      h('button', { title: 'Go to it', 'aria-label': 'Go to it', onclick: () => { closeDrawers(); selectChangeTarget(c); const t = changeTime(c); if (t != null) setT(t); ensureVisible(A.t, 'center'); } }, ic('jump')),
      h('button', { title: 'Delete', 'aria-label': 'Delete', onclick: () => Store.del(c.id) }, ic('del')));
    return h('div', { class: 'rv' }, th, body, acts);
  }
  function exampleReview() {
    const splash = SD.sounds.find(q => q.shot === 14 && q.model === 'splash') || SD.sounds.find(q => q.model === 'splash');
    const hook = tlShot(9).moments.T_HOOK, sniff = tlShot(7).moments.T_SNIFF;
    const ex = [
      { id: 'note:act:3', kind: 'note', target: { type: 'act', id: '3' }, text: 'The juggling goes on a little too long. Two pops are enough before the letters go in.' },
      { id: 'note:event:7:T_JUMP', kind: 'note', target: { type: 'event', id: '7:T_JUMP' }, text: 'Before she jumps down, the cat looks back at the man for a beat, as if to say thanks.' },
      sniff ? { id: 'note:actor:cat', kind: 'note', target: { type: 'actor', id: 'cat' }, shot: 7, frame: fr(shotT0(7) + (Array.isArray(sniff.t) ? sniff.t[0] : sniff.t)), text: 'When she sniffs the sausage: ears forward, and one slower, bigger sniff.' } : null,
      hook ? { id: 'timing:9:T_HOOK', kind: 'timing', shot: 9, moment: 'T_HOOK', from: hook.t, to: +(hook.t + 2 / FPSs).toFixed(4) } : null,
      hook ? { id: 'note:event:9:T_HOOK', kind: 'note', target: { type: 'event', id: '9:T_HOOK' }, text: 'Hook the rail two frames later, so the hop reads as a real effort.' } : null,
      splash ? { id: 'sound:' + splash.id, kind: 'sound', sid: splash.id, gain: -6 } : null,
      splash ? { id: 'note:sound:' + splash.id, kind: 'note', target: { type: 'sound', id: splash.id }, text: 'The splash drowns the music. Smaller, and a touch later than the wheel.' } : null,
    ].filter(Boolean);
    const now = Date.now();
    for (const c of ex) if (!Store.get(c.id)) Store.put(Object.assign(c, { example: now }), { undo: false });
    toast('Example review loaded. Remove it from Review any time.');
  }
  function renderChanges() {
    const all = Store.all().filter(c => !(c.kind === 'note' && (c.target.type === 'film' || !c.text)));
    const fn = Store.get('note:film:film'), fta = $('#filmNote');
    if (document.activeElement !== fta) fta.value = fn ? fn.text : '';
    const body = $('#chBody'); body.innerHTML = ''; RVQ.length = 0;
    const answered = all.filter(c => c.reply).length, examples = all.filter(isExample).length;
    $('#chSummary').textContent = all.length ? `${all.length} change${all.length === 1 ? '' : 's'} and notes, in film order.${answered ? ` ${answered} answered.` : ''} Hold a picture with a dashed outline to see the original.` : '';
    if (!all.length) {
      body.append(h('div', { class: 'emptyReview' },
        h('p', null, 'Nothing yet. Click anything in the picture or the rows below, then pose it, move a moment, draw, or write a note. Each change shows up here with its picture, in the order of the film.'),
        h('div', null, h('button', { class: 'btn', onclick: exampleReview }, 'Load an example review'))));
      return;
    }
    const by = new Map();
    for (const c of all) { const sN = shotOfChange(c) || 0; if (!by.has(sN)) by.set(sN, []); by.get(sN).push(c); }
    for (const sN of [...by.keys()].sort((a, b) => a - b)) {
      const cards = by.get(sN).sort((a, b) => (changeTime(a) || 0) - (changeTime(b) || 0)).map(rvCard);
      body.append(h('div', { class: 'rvShot' }, h('h3', null, sN ? `${sN} · ${tlShot(sN).name}` : 'Across the film', h('small', null, sN ? `${fmtT(shotT0(sN))} – ${fmtT(shotT1(sN))}` : '')), cards));
    }
    const conf = h('span', { hidden: true }, ' Delete everything? ', h('button', { class: 'btn tiny danger', onclick: () => { Store.clearAll(); applyTiming(); render(); } }, 'Yes, delete all'), ' ', h('button', { class: 'btn tiny ghost', onclick: () => { conf.hidden = true; } }, 'No'));
    body.append(h('div', { class: 'row', style: { maxWidth: '900px', marginTop: '6px' } },
      examples ? h('button', { class: 'btn tiny ghost', onclick: () => { for (const c of Store.all()) if (isExample(c)) Store.del(c.id, { undo: false }); } }, 'Remove the examples') : null,
      h('span', { class: 'grow' }),
      h('button', { class: 'btn tiny ghost danger', onclick: () => { conf.hidden = false; } }, 'Clear all changes'), conf));
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
  let REFS = {};                                        // [c1], [c2]… in the brief, so answers can point back at changes
  function briefText(o = {}) {
    const all = Store.all().filter(c => !(c.kind === 'note' && !c.text)), L = [];
    REFS = {};
    const R = c => { if (!c.ref) Store.put(Object.assign({}, c), { undo: false, keepTime: true }); const r = (Store.get(c.id) || c).ref; REFS[r] = c.id; return '[' + r + '] '; };
    const ck = SD.checkpoint;
    if (!o.chat) {
      L.push(`# Changes to The Umbrella Walk`);
      L.push(`Made in the studio against checkpoint ${ck.commit || 'dev'}${ck.dirty ? ' (with local edits)' : ''}, built ${ck.built}. Repository: ${ck.repo}`);
      L.push(`Apply them in the repository (read AGENTS.md first). Times are film seconds; frames are at 24 fps. Moment names and timings live in timeline.json; sounds are placed in tools/sfx_track.py. Each change has a reference like [c3]: when you report back, say for each one whether it is done, adapted (and why) or skipped (and why).`);
    }
    L.push(`Poses are offsets from what the checkpoint draws on that frame: distances in metres (x right, y up), angles in radians added to the rig's own values (legs.N.th/kn, arms.X.sh/el, farms.X.sh/el, lean, nod, sway, umb.ang…), other names are the drawing function's own options. A single keyframe is a local accent that fades in and out over 8 frames; two or more keyframes on the same actor hold and blend between them. Implement each as real animation in the shot's code (usually kf() keyframes), keeping to the rules in AGENTS.md.`);
    const fn = all.find(c => c.id === 'note:film:film');
    if (fn) { L.push('', '## The whole film', '', R(fn) + fn.text.trim()); }
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
          if (tg.type === 'act') L.push(`- ${R(c)}Note on the shot: ${c.text.trim()}`);
          else if (tg.type === 'event') { const [n, nm] = tg.id.split(':'); L.push(`- ${R(c)}Note on moment ${nm} (${tlShot(+n).moments[nm].what}, ${JSON.stringify(momentVal(+n, nm))} s into the shot): ${c.text.trim()}`); }
          else if (tg.type === 'action') { const [n, nm, who] = tg.id.split(':'); L.push(`- ${R(c)}Note on what ${actorMeta(who).name} (${who}) does at ${nm}: ${c.text.trim()}`); }
          else if (tg.type === 'actor') L.push(`- ${R(c)}Note on ${actorName(tg.id)} (${keyOf(tg.id)})${c.shot ? `, written while looking at shot ${c.shot}, frame ${c.frame}` : ''}: ${c.text.trim()}`);
          else if (tg.type === 'sound') { const so = SD.sounds.find(q => q.id === tg.id) || {}; L.push(`- ${R(c)}Note on the sound “${so.comment || so.model}” (tools/sfx_track.py line ${so.line}: \`${so.code}\`): ${c.text.trim()}`); }
        } else if (c.kind === 'key') {
          const sh = tlShot(c.shot), at = `on frame ${c.frame} (${((c.frame - sh.from) / FPSs).toFixed(2)} s into the shot)`;
          if (c.key === 'camera') L.push(`- ${R(c)}Camera ${at}: ${[c.dx || c.dy ? `look ${fmtV(c.dx || 0)} m right, ${fmtV(c.dy || 0)} m up (camera cx, cy)` : '', c.sc && c.sc !== 1 ? `zoom ×${c.sc.toFixed(2)} (pxPerMetre)` : '', c.rot ? `roll ${(c.rot * 180 / Math.PI).toFixed(0)}°` : ''].filter(Boolean).join(', ')}.`);
          else L.push(`- ${R(c)}Pose: ${actorName(c.aid)} (${keyOf(c.aid)}, drawn by ${c.fn || actorMeta(keyOf(c.aid)).fn}()) ${at}: ${describeKey(c)}.`);
        } else if (c.kind === 'timing') {
          L.push(`- ${R(c)}Timing: move moment ${c.moment} (${tlShot(c.shot).moments[c.moment].what}) from ${JSON.stringify(c.from)} to ${JSON.stringify(c.to)} s into the shot, in timeline.json. Check that the drawing still reads, and re-run probe_motion.py / sfx_track.py.`);
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
          L.push(`- ${R(c)}Sound “${so.comment || so.model}” at ${fmtT(so.t)} (${so.model}, tools/sfx_track.py line ${so.line}: \`${so.code}\`): ${b.join('; ')}.`);
        } else if (c.kind === 'draw') {
          L.push(`- ${R(c)}Drawing over frame ${c.frame} (the saved file has this frame with the drawing on it), about ${describe(c)[2].split('about ')[1]}.`); attach.push(c);
        } else if (c.kind === 'ref') {
          L.push(`- ${R(c)}Reference ${(c.mime || '').startsWith('audio') ? 'sound' : 'image'} “${c.name}” for ${describe(c)[1].split(' for ')[1]} (attached).`); attach.push(c);
        } else if (c.kind === 'newsound') {
          const r = Store.get(c.ref); L.push(`- ${R(c)}Add a sound like the attached ${r ? r.name : 'recording'} at ${fmtT(c.t)} (frame ${fr(c.t)}), for ${describe({ kind: 'note', target: c.target })[1].replace('Note on ', '')}.`);
        }
      }
    }
    if (!all.length) L.push('', '(No changes yet.)');
    if (!o.chat && window.PATCH) {
      const pt = patchText();
      if (pt) L.push('', '## Code edits already tried in the studio', '', 'An LLM wrote these edits from this brief and the director watched them in the studio. Apply them first (git apply), then do whatever the brief still asks for.', '', '```diff', pt.trimEnd(), '```');
    }
    return L.join('\n');
  }
  function renderBrief() {
    $('#briefText').textContent = briefText();
    const pn = $('#patchNote');
    if (pn) { pn.hidden = !window.PATCH; if (window.PATCH) pn.querySelector('span').textContent = `You are trying ${window.PATCH.replies.flatMap(r => r.blocks).length} edits from ${window.PATCH.replies.length} answer${window.PATCH.replies.length === 1 ? '' : 's'}. A new answer is added to them, or replaces them if it was written for the checkpoint.`; }
  }
  async function copyText(txt, msgEl, okMsg) {
    try { await navigator.clipboard.writeText(txt); msgEl.textContent = okMsg; return true; }
    catch (e) { msgEl.textContent = 'Could not copy here. Open “Read the brief” below and copy it by hand.'; return false; }
  }
  $('#bCopy').onclick = () => {
    const txt = briefText(); saveRefs();
    const att = Store.all().filter(c => c.kind === 'draw' || c.kind === 'ref').length;
    copyText(txt, $('#briefMsg'), 'Copied. Paste it to your agent.' + (att ? ` Your ${att} drawing${att === 1 ? '' : 's'} and attachment${att === 1 ? '' : 's'} are only in the saved file, so save that too.` : ''));
  };
  async function frameWithDrawing(c) {
    const cv = document.createElement('canvas'); cv.width = 1280; cv.height = 720; const g = cv.getContext('2d'); patch(g);
    const sv = [curShot, curFrame]; curShot = c.shot; curFrame = c.frame; INST.S.sel = null; INST.frame(g, c.frame / FPSs); curShot = sv[0]; curFrame = sv[1];
    g.resetTransform(); const k = 1280 / 1920;            // (a patched setTransform would scale twice)
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


  // ---- hand-off to any chat LLM: the prompt carries the code; the answer comes back as edits ----
  const saveRefs = () => { };                                // references now live on the changes themselves
  const refMap = () => Object.fromEntries(Store.all().filter(c => c.ref).map(c => [c.ref, c.id]));
  function currentFiles() {
    const files = FilmPatch.split(document.getElementById('film-src').textContent);
    return window.PATCH ? FilmPatch.applyFiles(files, window.PATCH.replies.flatMap(r => r.blocks)) : files;
  }
  const shotFile = n => n <= 5 ? 'src/s1.js' : n <= 10 ? 'src/s2.js' : 'src/s3.js';
  function shotBlock(files, n) {
    const file = shotFile(n), src = files[file]; if (!src) return null;
    const lines = src.split('\n'), i = lines.findIndex(l => l.startsWith(`shot('${tlShot(n).name}'`));
    if (i < 0) return null;
    let a = i; for (let k = i - 1; k >= 0 && !lines[k].startsWith('shot('); k--) if (/^\/\/ -{5,}/.test(lines[k])) { a = k; break; }
    let b = i + 1; while (b < lines.length && !/^\/\/ -{5,}/.test(lines[b]) && !lines[b].startsWith('shot(')) b++;
    return { file, from: a + 1, to: b, code: lines.slice(a, b).join('\n').trimEnd() };
  }
  function fnBlock(files, fn) {
    for (const f in files) {
      const lines = files[f].split('\n'), i = lines.findIndex(l => l.startsWith('function ' + fn + '('));
      if (i < 0) continue;
      let b = i + 1; while (b < lines.length && lines[b] !== '}') b++;
      return { file: f, from: i + 1, to: b + 1, code: lines.slice(i, b + 1).join('\n') };
    }
    return null;
  }
  function chatPrompt() {
    const brief = briefText({ chat: true }); saveRefs();
    const files = currentFiles(), shots = new Set(), fns = new Set();
    for (const c of Store.all()) {
      const sN = shotOfChange(c); if (sN) shots.add(sN);
      const tg = c.target;
      if (c.kind === 'note' && tg && (tg.type === 'actor' || tg.type === 'action')) {
        const m = actorMeta(tg.type === 'actor' ? keyOf(tg.id) : tg.id.split(':')[2]);
        if (m.fn && !/^(hero|person)/.test(m.fn)) fns.add(m.fn);
        if (tg.type === 'actor' && !sN) for (const x of actorShots(tg.id).slice(0, 3)) shots.add(x);
      }
    }
    const parts = []; let used = 0;
    const add = (b, what) => { if (b && used + b.code.length < 110000) { parts.push(`### ${b.file}, lines ${b.from}–${b.to}: ${what}\n\`\`\`js\n${b.code}\n\`\`\``); used += b.code.length; } };
    for (const n of [...shots].sort((x, y) => x - y)) add(shotBlock(files, n), `shot ${n} “${tlShot(n).name}”`);
    for (const fn of fns) add(fnBlock(files, fn), fn + '()');
    const fmtM = v => Array.isArray(v) ? '[' + v.join(', ') + ']' : String(v);
    const momentsTxt = [...shots].sort((x, y) => x - y).map(n => `- Shot ${n} “${tlShot(n).name}” (${((tlShot(n).to - tlShot(n).from) / FPSs).toFixed(2)} s long): ` + Object.entries(tlShot(n).moments).map(([k, m]) => `${k} ${fmtM(m.t)} (${m.what})`).join('; ')).join('\n');
    const nearTxt = [];
    for (const c of Store.all()) {
      const sid = c.kind === 'sound' ? c.sid : c.target && c.target.type === 'sound' ? c.target.id : null, so = sid && SD.sounds.find(q => q.id === sid);
      if (!so || nearTxt.some(t => t.includes(`line ${so.line}:`))) continue;
      const t0 = soundTime(so), near = SD.sounds.filter(q => q !== so && q.kind === 'event' && Math.abs(soundTime(q) - t0) < .8).sort((a, b) => soundTime(a) - soundTime(b));
      nearTxt.push(`- Around “${so.comment || so.model}” (${fmtT(t0)}, tools/sfx_track.py line ${so.line}): ` + (near.length ? near.map(q => `${fmtT(soundTime(q))} “${q.comment || q.model}” (${q.model}, line ${q.line}: \`${q.code}\`)`).join('; ') : 'nothing else within 0.8 s'));
    }
    const ck = SD.checkpoint.commit || 'dev';
    return [
      '# The Umbrella Walk: notes for the next version', '',
      `You are the animator on "The Umbrella Walk", a 76-second cartoon drawn entirely in JavaScript on an HTML canvas (1920×1080, 24 fps, 19 shots). The director reviewed checkpoint ${ck} in the studio and left the changes below. The studio runs your code edits the moment they are pasted back, next to the original, so answer only in the format at the end.`, '',
      '## How the code works',
      '- World units are metres and y points up. camera(ctx, cx, cy, pxPerMetre) frames a shot.',
      "- A shot is shot('Name', ...CUT(n), (ctx, t, T) => { ... }): t is seconds into the shot, T is film time.",
      "- Named moments: const { T_HOOK, T_GO } = MOMENTS('Wet concrete'). Their times live in timeline.json and the studio applies timing changes itself, so never write a moved time into the code.",
      '- kf(t, [[time, value, ease], ...]) gives keyframed values (numbers or [x, y]); seg(t, a, b) maps a span to 0..1; easings E.io, E.o, E.i.',
      '- rng(seed) is the only randomness allowed, never Math.random(): every frame must draw the same way every time.',
      '- The global HS carries continuity from shot to shot (dirt on the umbrella tip, the smear on his trousers, a sausage on the tip).',
      '- The hero is drawn by heroSide / heroFront / heroBack; aimTip(), heroArmIK() and legsByDist() place his arms, umbrella and legs.', '',
      '## The rules this film follows',
      '1. Cause and consequence you can see: nothing happens without a visible reason, and whatever is touched stays changed.',
      "2. The fix beats the failure: the hero's solution is smarter than what would have happened anyway, nobody loses momentum, and one move often does two jobs.",
      '3. Readable on a phone: key props and actions are big and held long enough.',
      '4. Drawing sanity: umbrella in his left hand and coffee in his right, never merged into one fist, the coffee level; nothing passes through a body; nothing floats; nothing pops between frames; everyone has the right number of hands.',
      '5. He travels left to right in every shot.', '',
      'These are all of the rules (they are the same as in the repository’s AGENTS.md).', '',
      '## What the director asked for', '', brief.trim(), '',
      '## When things happen', 'Named moments, in seconds from the start of each shot (lists are several times, or a start and an end):', momentsTxt, nearTxt.length ? '\nSounds near the sounds mentioned above:\n' + nearTxt.join('\n') : '', '',
      '## Code you may edit', '', parts.length ? parts.join('\n\n') : '(No code was needed for these changes.)', '',
      '## How to answer',
      '1. One line for every change above: STATUS [c1] done|adapted|skipped: what you did, or why not.',
      '   Timing moves and sound levels are applied by the studio and by a script: answer "done" for them unless the drawing itself must change too.',
      '   Poses and drawings are sketches of the intent: make them real animation (usually kf() keyframes in the shot), keeping the rules.',
      '2. Then every code edit as a SEARCH/REPLACE block, with the file path on the line before it:', '',
      'src/s2.js', '<<<<<<< SEARCH', 'lines copied exactly from the code above, enough of them to be unique', '=======', 'the new lines', '>>>>>>> REPLACE', '',
      'Only edit code shown above. Keep each block small. Put any explanation in the STATUS lines.',
    ].join('\n');
  }
  $('#bCopyChat').onclick = () => { const txt = chatPrompt(); copyText(txt, $('#chatMsg'), `Copied (${Math.round(txt.length / 1000)}k characters). Paste it into any chat LLM, then paste its answer below.`); };

  // the answer: STATUS lines go onto your changes; SEARCH/REPLACE edits are played in the film
  const replyTa = $('#replyText'), replyMsg = $('#replyMsg');
  let PARSED = null;
  function checkReply() {
    const txt = replyTa.value; PARSED = null;
    const bp = $('#bPreview');
    const say = (m, ok) => { replyMsg.textContent = m; replyMsg.className = 'small ' + (ok ? 'ok' : 'bad'); bp.disabled = !ok; if (!ok) bp.textContent = 'Play these edits'; replyMsg.scrollIntoView({ block: 'nearest' }); };
    if (!txt.trim()) { replyMsg.textContent = ''; bp.disabled = true; bp.textContent = 'Play these edits'; return; }
    const r = FilmPatch.parse(txt);
    if (r.open) return say('The last SEARCH/REPLACE block is not finished (it needs ======= and >>>>>>> REPLACE).', false);
    if (!r.blocks.length && !r.status.length) return say('No STATUS lines and no SEARCH/REPLACE blocks found in this answer.', false);
    let mode = 'add';
    try { FilmPatch.applyFiles(currentFiles(), r.blocks); }
    catch (e) {                                          // written for the checkpoint's code rather than for the edits already playing?
      let ok = false;
      if (window.PATCH) { try { FilmPatch.applyFiles(FilmPatch.split(document.getElementById('film-src').textContent), r.blocks); mode = 'replace'; ok = true; } catch (e2) { } }
      if (!ok) return say(e.message + '. Ask the LLM to copy the SEARCH lines exactly from the code in the prompt.', false);
    }
    const refs = refMap(), known = r.status.filter(q => refs[q.ref]), unknown = r.status.filter(q => !refs[q.ref]).map(q => q.ref);
    const files = [...new Set(r.blocks.map(b => b.file))];
    PARSED = Object.assign(r, { refs, mode });
    bp.textContent = r.blocks.length ? (mode === 'replace' ? 'Play these instead' : 'Play these edits') : 'Save the answers';
    say(`${r.blocks.length ? `${r.blocks.length} edit${r.blocks.length === 1 ? '' : 's'} in ${files.join(', ')}, all found in the code` : 'No code edits'} · ${known.length} answer${known.length === 1 ? '' : 's'} to your changes${unknown.length ? ` · ${unknown.length} point${unknown.length === 1 ? 's' : ''} to changes that don't exist (${unknown.join(', ')})` : ''}.${mode === 'replace' ? ' These were written for the checkpoint, so they replace the edits you are trying now.' : ''}`, true);
  }
  replyTa.addEventListener('input', () => { clearTimeout(A.rpT); A.rpT = setTimeout(checkReply, 200); });
  $('#bPreview').onclick = () => {
    if (!PARSED) return;
    for (const q of PARSED.status) { const id = PARSED.refs[q.ref], c = id && Store.get(id); if (c) Store.put(Object.assign({}, c, { reply: { status: q.status, text: q.text, at: Date.now() } }), { undo: false, keepTime: true }); }
    if (!PARSED.blocks.length) { toast('Answers saved. They are in Review, next to your changes.'); replyTa.value = ''; checkReply(); return; }
    const pt = window.PATCH && PARSED.mode !== 'replace' ? JSON.parse(JSON.stringify(window.PATCH)) : { checkpoint: SD.checkpoint.commit || 'dev', replies: [] };
    pt.replies.push({ at: Date.now(), blocks: PARSED.blocks, status: PARSED.status });
    try { localStorage.setItem('uws.patch', JSON.stringify(pt)); sessionStorage.setItem('uws.view', JSON.stringify({ t: A.t, sel: A.sel })); }
    catch (e) { replyMsg.textContent = 'This browser keeps no local storage here, so the edits cannot be played. Give them to your agent instead.'; return; }
    replyMsg.textContent = 'Loading the film with these edits…'; replyMsg.className = 'small ok';
    setTimeout(() => location.reload(), 800);                // let the answers reach this device's store first
  };
  let SAMPLE = null;
  const trySample = () => { if (SAMPLE || !(window.claude && window.claude.use)) return; window.claude.use('sample').then(sm => { if (sm) { SAMPLE = sm; $('#bAskClaude').hidden = false; } }).catch(() => { }); };
  trySample(); setTimeout(trySample, 1500); setTimeout(trySample, 6000);   // the page's Claude arrives a moment after load, if at all
  $('#bAskClaude').onclick = async () => {
    if (!SAMPLE) return;
    if (A.askCtl) { A.askCtl.abort(); A.askCtl = null; $('#bAskClaude').textContent = 'Ask Claude here'; return; }
    const ctl = A.askCtl = new AbortController(); $('#bAskClaude').textContent = 'Stop';
    $('#chatMsg').textContent = 'Claude is reading the code. This can take a minute.';
    try {
      const r = await SAMPLE(chatPrompt(), { modelTier: 'complex', cache: false, signal: ctl.signal, onText: ({ text }) => { replyTa.value = text; } });
      replyTa.value = r.text; checkReply(); $('#chatMsg').textContent = r.truncated ? 'The answer was cut short; the edits that arrived are checked below.' : 'Claude answered. Play the edits to see them.';
    } catch (e) {
      $('#chatMsg').textContent = e.code === 'cancelled' ? 'Stopped.' : e.code === 'not_granted' ? 'Claude is not available on this page.' : e.code === 'rate_limited' ? 'Too many requests just now. Try again in a minute.' : 'Claude could not answer: ' + (e.message || e.code || e);
      if (e.text) { replyTa.value = e.text; checkReply(); }
    } finally { A.askCtl = null; $('#bAskClaude').textContent = 'Ask Claude here'; }
  };

  // ---- trying an LLM's edits: the bar above the picture, and the patch to keep ----
  function lineOps(a, b) {
    const n = a.length, m = b.length;
    if (n * m > 4e6) return [...a.map(x => ['-', x]), ...b.map(x => ['+', x])];
    const W = m + 1, T = new Uint32Array((n + 1) * W);
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) T[i * W + j] = a[i] === b[j] ? T[(i + 1) * W + j + 1] + 1 : Math.max(T[(i + 1) * W + j], T[i * W + j + 1]);
    const ops = []; let i = 0, j = 0;
    while (i < n && j < m) { if (a[i] === b[j]) { ops.push([' ', a[i]]); i++; j++; } else if (T[(i + 1) * W + j] >= T[i * W + j + 1]) ops.push(['-', a[i++]]); else ops.push(['+', b[j++]]); }
    while (i < n) ops.push(['-', a[i++]]); while (j < m) ops.push(['+', b[j++]]);
    return ops;
  }
  function unifiedDiff(path, a, b) {
    if (a === b) return '';
    const A1 = a.replace(/\n$/, '').split('\n'), B1 = b.replace(/\n$/, '').split('\n');
    let p0 = 0; while (p0 < A1.length && p0 < B1.length && A1[p0] === B1[p0]) p0++;
    let q0 = 0; while (q0 < A1.length - p0 && q0 < B1.length - p0 && A1[A1.length - 1 - q0] === B1[B1.length - 1 - q0]) q0++;
    const ops = [...A1.slice(0, p0).map(x => [' ', x]), ...lineOps(A1.slice(p0, A1.length - q0), B1.slice(p0, B1.length - q0)), ...A1.slice(A1.length - q0).map(x => [' ', x])];
    let la = 1, lb = 1;
    const meta = ops.map(o => { const r = { o, la, lb }; if (o[0] !== '+') la++; if (o[0] !== '-') lb++; return r; });
    const ch = meta.map((q, i) => q.o[0] !== ' ' ? i : -1).filter(i => i >= 0), C = 3, out = [`diff --git a/${path} b/${path}`, `--- a/${path}`, `+++ b/${path}`];
    for (let ci = 0; ci < ch.length;) {
      const start = Math.max(0, ch[ci] - C); let end = Math.min(meta.length - 1, ch[ci] + C);
      while (ci + 1 < ch.length && ch[ci + 1] - C <= end + 1) { ci++; end = Math.min(meta.length - 1, ch[ci] + C); }
      ci++;
      const seg = meta.slice(start, end + 1), na = seg.filter(q => q.o[0] !== '+').length, nb = seg.filter(q => q.o[0] !== '-').length;
      out.push(`@@ -${na ? seg[0].la : seg[0].la - 1},${na} +${nb ? seg[0].lb : seg[0].lb - 1},${nb} @@`);
      for (const q of seg) out.push(q.o[0] + q.o[1]);
    }
    return out.join('\n') + '\n';
  }
  // timeline.json exactly as the repo writes it: json.dumps(indent=1), then numbers and moments folded onto one line.
  // The original number literals (9 or 9.0) are read from the page's own data, so unchanged lines match byte for byte.
  const RAWT = (() => {
    const raw = document.getElementById('studio-data').textContent, a = raw.indexOf('"timeline":'), b = raw.indexOf(',"beats":', a), part = raw.slice(a, b > a ? b : undefined);
    const lits = [], re = /"\w+":\{"t":(\[[^\]]*\]|-?[\d.]+(?:[eE][-+]?\d+)?),"what"/g; let m;
    while ((m = re.exec(part))) lits.push(m[1]);
    const map = new Map(); let i = 0;
    for (const sh of SD.timeline.shots) for (const k in sh.moments) map.set(sh.n + ':' + k, lits[i++]);
    return i === lits.length ? map : new Map();
  })();
  function pyJSON(v, ind = '', key = '') {
    if (v && v.__raw) return v.__raw.startsWith('[') ? '[' + v.__raw.slice(1, -1).split(',').join(', ') + ']' : v.__raw;
    const I = ind + ' ';
    if (Array.isArray(v)) return v.length ? '[\n' + v.map(x => I + pyJSON(x, I, key)).join(',\n') + '\n' + ind + ']' : '[]';
    if (v && typeof v === 'object') { const ks = Object.keys(v); return ks.length ? '{\n' + ks.map(k => I + JSON.stringify(k) + ': ' + pyJSON(v[k], I, k)).join(',\n') + '\n' + ind + '}' : '{}'; }
    if (typeof v === 'number') return key === 't' && Number.isInteger(v) ? v.toFixed(1) : String(v);
    return JSON.stringify(v);
  }
  function timelineJSON(withEdits) {                     // the same layout tools/fit_music.py writes
    const d = JSON.parse(JSON.stringify(SD.timeline));
    for (const sh of d.shots) for (const k in sh.moments) { const r = RAWT.get(sh.n + ':' + k); if (r) sh.moments[k].t = { __raw: r }; }
    if (withEdits) for (const c of Store.all()) if (c.kind === 'timing') { const m = d.shots[c.shot - 1] && d.shots[c.shot - 1].moments[c.moment]; if (m) m.t = c.to; }
    return pyJSON(d)
      .replace(/\[\n\s+([-\d.,\s]+?)\n\s+\]/g, (m, g) => '[' + g.split(',').map(q => q.trim()).join(', ') + ']')
      .replace(/\{\n\s+"t": ([^\n]+?),\n\s+"what": ("[^"\n]*")\n\s+\}/g, (m, a, b) => '{"t": ' + a + ', "what": ' + b + '}') + '\n';
  }
  function patchText() {
    const orig = FilmPatch.split(document.getElementById('film-src').textContent), cur = currentFiles(), parts = [];
    const repoForm = (f, t) => f === 'src/core.js' ? t.replace(/^const TIMELINE = \{.*\};$/m, 'const TIMELINE = { fps: 24, shots: [] };') : t;
    for (const f of Object.keys(cur)) if (cur[f] !== orig[f]) parts.push(unifiedDiff(f, repoForm(f, orig[f]) + '\n', repoForm(f, cur[f]) + '\n'));
    if (Store.all().some(c => c.kind === 'timing')) parts.push(unifiedDiff('timeline.json', timelineJSON(false), timelineJSON(true)));
    return parts.join('');
  }
  $('#bDiscard2').onclick = () => { try { localStorage.removeItem('uws.patch'); sessionStorage.setItem('uws.view', JSON.stringify({ t: A.t, sel: A.sel })); } catch (e) { } location.reload(); };
  function renderPatchBar() {
    const bar = $('#patchBar'); bar.innerHTML = '';
    if (window.PATCH_ERROR) {
      bar.hidden = false; bar.className = 'patchBar err';
      const failed = window.PATCH_FAILED;
      bar.append(h('b', null, 'LLM edits not played'), h('span', null, window.PATCH_ERROR), h('span', { class: 'grow' }),
        h('button', { class: 'btn tiny', onclick: () => copyText(`Your last edits did not run in the studio.\n${window.PATCH_ERROR}\nPlease send corrected SEARCH/REPLACE blocks.`, { set textContent(v) { toast(v); } }, 'Copied: paste it back to the LLM.') }, 'Copy the error for the LLM'),
        h('button', { class: 'btn tiny ghost', onclick: () => { try { localStorage.removeItem('uws.patch'); } catch (e) { } window.PATCH_ERROR = null; bar.hidden = true; resize(); } }, failed ? 'Dismiss' : 'Discard those edits'));
      return;
    }
    if (!window.PATCH) { bar.hidden = true; return; }
    const blocks = window.PATCH.replies.flatMap(r => r.blocks), files = [...new Set(blocks.map(b => b.file))];
    bar.hidden = false; bar.className = 'patchBar';
    bar.append(...[h('b', null, 'Trying LLM edits'), h('span', null, `${blocks.length} edit${blocks.length === 1 ? '' : 's'} in ${files.join(', ')}. Hold Compare or use Split to see the checkpoint.`), h('span', { class: 'grow' }),
      h('button', { class: 'btn tiny', onclick: () => copyText(patchText(), { set textContent(v) { toast(v); } }, 'Copied a git patch: git apply it in the repo, or give it to your agent.') }, 'Copy as a git patch'),
      h('button', { class: 'btn tiny', onclick: async () => { const r = await Store.save(`umbrella-walk-${SD.checkpoint.commit || 'dev'}.patch`, patchText()); toast(r === 'saved' ? 'Patch saved.' : 'Not saved.'); } }, 'Save the patch'),
      window.PATCH.replies.length > 1 ? h('button', { class: 'btn tiny ghost', onclick: () => { const pt = JSON.parse(JSON.stringify(window.PATCH)); pt.replies.pop(); try { localStorage.setItem('uws.patch', JSON.stringify(pt)); sessionStorage.setItem('uws.view', JSON.stringify({ t: A.t, sel: A.sel })); } catch (e) { } location.reload(); } }, 'Undo the last answer') : null,
      h('button', { class: 'btn tiny ghost danger', onclick: () => { try { localStorage.removeItem('uws.patch'); sessionStorage.setItem('uws.view', JSON.stringify({ t: A.t, sel: A.sel })); } catch (e) { } location.reload(); } }, 'Discard')].filter(Boolean));
  }

  // ------------------------------------------------------------------ keys
  document.addEventListener('keydown', e => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'textarea' || tag === 'input' || tag === 'select') { if (e.key === 'Escape') e.target.blur(); return; }
    const k = e.key, mod = e.ctrlKey || e.metaKey;
    if (mod && (k === 'z' || k === 'Z')) { e.preventDefault(); if (e.shiftKey ? Store.redo() : Store.undo()) { applyTiming(); render(); renderInsp(); } return; }
    if (mod && k === 'y') { e.preventDefault(); if (Store.redo()) { applyTiming(); render(); renderInsp(); } return; }
    if (mod && (k === 'f' || k === 'F')) { e.preventDefault(); findEl.focus(); findEl.select(); return; }
    if (mod || e.altKey) return;
    if (k === ' ') { e.preventDefault(); togglePlay(); }
    else if (k === 'ArrowLeft') { e.preventDefault(); e.shiftKey ? stepMoment(-1) : setT(A.t - 1 / FPSs); }
    else if (k === 'ArrowRight') { e.preventDefault(); e.shiftKey ? stepMoment(1) : setT(A.t + 1 / FPSs); }
    else if (k === 'ArrowUp' || k === 'ArrowDown') { e.preventDefault(); if (A.playing) togglePlay(); rowStep(k === 'ArrowUp' ? -1 : 1); }
    else if (k === 'Home') { e.preventDefault(); setT(0); } else if (k === 'End') { e.preventDefault(); setT(NFR / FPSs); }
    else if (k === '[') stepBeat(-1); else if (k === ']') stepBeat(1);
    else if (k === 'v' || k === 'V') setTool('select'); else if (k === 'd' || k === 'D') setTool('draw');
    else if (k === 'e' || k === 'E' || k === '\\') { if (!e.repeat) peekStart(); }
    else if (k === 's' || k === 'S') $('#oSplit').click();
    else if (k === 'o' || k === 'O') $('#oOnion').click(); else if (k === 'l' || k === 'L') $('#oLoop').click();
    else if (k === 'c' || k === 'C') $('#bCast').click();
    else if (k === 'r' || k === 'R') $('#bChanges').click();
    else if (k === 'f' || k === 'F') toggleWholeFilm();
    else if (k === '/') { e.preventDefault(); findEl.focus(); findEl.select(); }
    else if (k === 'n' || k === 'N') { const ta = document.querySelector('#insp textarea'); if (ta) { e.preventDefault(); ta.focus(); ta.scrollIntoView({ block: 'nearest' }); } }
    else if (k === 'Escape') { if (![...document.querySelectorAll('.drawer')].every(d => d.hidden)) closeDrawers(); else select(null); }
  });
  document.addEventListener('keyup', e => { if (e.key === 'e' || e.key === 'E' || e.key === '\\') peekEnd(false); });
  window.addEventListener('blur', () => { if (A.peekAt) peekEnd(false); });

  // ------------------------------------------------------------------ boot
  let insT = null, picSig = '';
  Store.on(() => {
    indexKeys(); applyTiming();
    const sig = Store.all().filter(c => c.kind === 'key' || c.kind === 'timing').map(c => c.id + '@' + (c.updated || 0)).join('|');
    if (sig !== picSig) { picSig = sig; A.thumbVer++; }          // the filmstrips redraw only when a picture changed
    $('#nChanges').textContent = Store.all().filter(c => !(c.kind === 'note' && !c.text)).length;
    for (const c of Store.all()) if (c.kind === 'ref' && (c.mime || '').startsWith('audio') && !Snd.uploads.has(c.id) && c.blob && c.blob.data) Snd.decodeUpload(c.id, c.blob.data);
    requestRender(); drawTL();
    if (TL.q) { clearTimeout(A.fqT); A.fqT = setTimeout(runFind, 150); }
    clearTimeout(insT); insT = setTimeout(() => { if (!A.drag && !A.busy) renderInsp(); if (!$('#changesDrawer').hidden) renderChanges(); if (!$('#briefDrawer').hidden) renderBrief(); }, 120);
  });
  $('#ckpt').textContent = 'checkpoint ' + (SD.checkpoint.commit || 'dev') + (SD.checkpoint.dirty ? '+' : '');
  window.addEventListener('resize', () => { clearTimeout(A.rsT); A.rsT = setTimeout(resize, 80); });
  setTimeout(() => { const hnt = $('#stageHint'); if (hnt) hnt.style.opacity = 0; }, 9000);
  TL.h = TL.h || Math.round(Math.max(230, Math.min(400, innerHeight * .36)));
  appEl.style.setProperty('--tlH', TL.h + 'px');
  let VIEW = null;                                         // after trying an LLM's edits, come back to the same place
  try { VIEW = JSON.parse(sessionStorage.getItem('uws.view') || 'null'); sessionStorage.removeItem('uws.view'); } catch (e) { }
  const hash = (location.hash || '').slice(1);
  const startShot = /^s\d+$/.test(hash) ? +hash.slice(1) : 1;
  A.t = VIEW && VIEW.t != null ? VIEW.t : shotT0(startShot) + Math.min(1.5, (shotT1(startShot) - shotT0(startShot)) / 2);
  renderPatchBar();
  resize();
  select(VIEW && VIEW.sel ? VIEW.sel : { type: 'act', id: String(VIEW ? shotOfFrame(fr(A.t)) : startShot) });
  ensureVisible(A.t, 'center', true);
  Store.init().then(() => { indexKeys(); applyTiming(); render(); renderInsp(); drawTL(); });
  setTimeout(() => { if (!A.playing) Snd.load(); }, 2500);   // decode the sound early, so the first Play starts at once
  window.STUDIO = { A, TL, select, setT, render, Store, pickAt, briefText, chatPrompt, patchText, timelineJSON, ensureVisible, layoutRows, rowOfT };   // for tests and curious agents
})();
