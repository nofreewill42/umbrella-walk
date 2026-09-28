// ============================================================================
// Studio instrumentation: turns the film's drawing functions into actors.
//
// The film draws every frame with plain functions (heroSide, personSide, cat,
// tophat, taxi, stoneWall, camera...). This file wraps them. A top-level call
// on the frame's canvas is an *actor instance*: it gets a key (hero, cat,
// butcher, tophat, sashWindow#2...), can be hidden, moved, rotated, scaled,
// re-posed (joint angles, any numeric option), picked by pixel, cut out, and
// shows its skeleton. Nested calls (a hat drawn inside a person) belong to
// their parent. Nothing changes when no override is set.
// Used by the studio page and by tools/build_studio.py (the actor scan).
// ============================================================================
const INST = (() => {
  // ---- what each function is ----
  const CAT = {
    heroSide: 'character', heroFront: 'character', heroBack: 'character', personSide: 'character', personFront: 'character', seatedReader: 'character',
    pigeon: 'animal', bulldog: 'animal', cat: 'animal', gull: 'animal',
    tophat: 'prop', scooter: 'prop', letter: 'prop', geraniumPot: 'prop', sausageChain: 'prop', sailboat: 'prop', cone: 'prop', scoop: 'prop',
    handbag: 'prop', taxi: 'prop', van: 'prop', box: 'prop', easel: 'prop', canvasPainting: 'prop', canvasLondon: 'prop', iceCart: 'prop',
    dropping: 'prop', drawUmbrella: 'prop', drawCup: 'prop', umbrellaFaceOn: 'prop', cone_traffic: 'prop',
    skyFill: 'set', stoneWall: 'set', brickWall: 'set', sashWindow: 'set', door: 'set', railings: 'set', lamppost: 'set', phoneBox: 'set',
    pavement: 'set', kerb: 'set', road: 'set', tree: 'set', bench: 'set', planterTree: 'set', distantCity: 'set', parliament: 'set',
    puddle: 'set', streetBack: 'set', streetTree: 'set', windStreaks: 'fx',
  };
  const RIG = { heroSide: 1, heroFront: 1, heroBack: 1, personSide: 2, personFront: 2 };   // index of the pose object
  const OPTS = { pigeon: 4, bulldog: 4, cat: 4 };                                            // index of an options object
  // where an actor "stands" (world units), for rotating and scaling it
  const ANCHOR = {
    stoneWall: a => [(a[1] + a[2]) / 2, a[3]], brickWall: a => [(a[1] + a[2]) / 2, a[3]], railings: a => [(a[1] + a[2]) / 2, a[3]],
    pavement: a => [(a[1] + a[2]) / 2, a[3]], kerb: a => [(a[1] + a[2]) / 2, a[3]], road: a => [(a[1] + a[2]) / 2, a[3]],
    distantCity: a => [(a[1] + a[2]) / 2, a[3]], seatedReader: a => [a[2], a[3]], sausageChain: a => (a[1] && a[1][0]) || [0, 0],
    skyFill: () => [0, 0], streetBack: () => [0, 0], windStreaks: () => [0, 0],
  };
  const DEFAULTS = {
    heroSide: () => ({ legs: standLegs(), arms: walkArms(0, 0) }),
    personSide: () => ({ legs: standLegs(.05, .03), arms: { near: { sh: .05, el: .1 }, far: { sh: -.05, el: .1 } } }),
    heroFront: () => ({ farms: { R: { sh: .12, el: -.3 }, L: { sh: .07, el: .05 } } }),
    personFront: () => ({ farms: { l: { sh: .12, el: .05 }, r: { sh: .12, el: .05 } } }),
    heroBack: () => ({}),
  };
  const S = {
    main: null,        // the canvas context being recorded (the frame's)
    depth: 0, counts: new Map(), rec: [], ov: null, probe: null, capture: null, sel: null, skel: null, solo: null, scan: false,
  };
  const orig = {};
  const names = {};
  // the frame's own canvas, and the offscreen canvas some shots draw into before compositing (the pond)
  const isMain = ctx => ctx === S.main || (typeof OFF !== 'undefined' && OFF && ctx.canvas === OFF);

  // ---- small helpers ----
  const castName = sp => { for (const k in CAST) if (CAST[k] === sp) return k; return 'person'; };
  const baseName = (fn, a) => fn.startsWith('hero') && RIG[fn] ? 'hero' : RIG[fn] === 2 ? castName(a[1]) : fn === 'seatedReader' ? 'reader' : fn;
  function paramNames(f) {
    const src = f.toString(); let i = src.indexOf('('), d = 0, q = null, cur = '', out = [];
    for (i = i + 1; i < src.length; i++) {
      const c = src[i];
      if (q) { if (c === q && src[i - 1] !== '\\') q = null; cur += c; continue; }
      if (c === "'" || c === '"' || c === '`') { q = c; cur += c; continue; }
      if (c === '(' || c === '[' || c === '{') d++;
      if (c === ')' || c === ']' || c === '}') { if (d === 0) { out.push(cur); break; } d--; }
      if (c === ',' && d === 0) { out.push(cur); cur = ''; continue; }
      cur += c;
    }
    return out.map(s => s.split('=')[0].trim());
  }
  const clonePose = p => {
    const o = Object.assign({}, p);
    for (const k of ['legs', 'arms', 'farms', 'umb', 'flegs']) if (o[k] && typeof o[k] === 'object') o[k] = JSON.parse(JSON.stringify(o[k]));
    return o;
  };
  function setPath(obj, path, fn) {
    const ks = path.split('.'); let o = obj;
    for (let i = 0; i < ks.length - 1; i++) { if (o[ks[i]] == null || typeof o[ks[i]] !== 'object') o[ks[i]] = {}; o = o[ks[i]]; }
    const k = ks[ks.length - 1]; o[k] = fn(o[k]);
  }
  function getPath(obj, path) { let o = obj; for (const k of path.split('.')) { if (o == null) return undefined; o = o[k]; } return o; }
  function numbers(v, pre, out, depth = 0) {             // flatten numeric fields (for sliders and the activity scan)
    if (typeof v === 'number' && isFinite(v)) { out[pre] = v; return out; }
    if (depth > 3 || v == null || typeof v !== 'object' || v === CAST || v.canvas) return out;
    if (Array.isArray(v)) { if (v.length <= 8) v.forEach((x, i) => numbers(x, pre + '.' + i, out, depth + 1)); return out; }
    for (const k in v) if (k !== 'measure' && typeof v[k] !== 'function') numbers(v[k], pre ? pre + '.' + k : k, out, depth + 1);
    return out;
  }

  const named = (fn, a) => { const o = {}; (names[fn] || []).forEach((n, i) => { if (i > 0 && a[i] !== undefined && n !== 'sp') o[n] = a[i]; }); return o; };

  // ---- the override applied to one call ----
  function applyOverride(fn, a, ov, measure) {
    const ri = RIG[fn];
    if (ri) {
      const p = a[ri] = clonePose(a[ri] || {});
      const def = DEFAULTS[fn] ? DEFAULTS[fn]() : {};
      if (ov.dx) p.x = (p.x || 0) + ov.dx;
      if (ov.dy) { p.y = (p.y || 0) + ov.dy; if (p.hipY != null) p.hipY += ov.dy; }
      if (measure) return null;
      for (const path in (ov.d || {})) {
        const root = path.split('.')[0];
        if (p[root] == null && def[root] != null) p[root] = JSON.parse(JSON.stringify(def[root]));
        setPath(p, path, v => (typeof v === 'number' ? v : 0) + ov.d[path]);
      }
      for (const path in (ov.set || {})) setPath(p, path, () => ov.set[path]);
      return (ov.rot || (ov.sc && ov.sc !== 1)) ? [p.x || 0, p.y || 0] : null;
    }
    if (measure) return null;
    const pn = names[fn] || [];
    for (const path in (ov.d || {})) {
      const [head, ...rest] = path.split('.'); const i = pn.indexOf(head);
      if (i < 0) continue;
      if (!rest.length) { if (typeof a[i] === 'number' || a[i] === undefined) a[i] = (a[i] || 0) + ov.d[path]; }
      else { a[i] = Object.assign({}, a[i] || {}); setPath(a[i], rest.join('.'), v => (typeof v === 'number' ? v : 0) + ov.d[path]); }
    }
    for (const path in (ov.set || {})) {
      const [head, ...rest] = path.split('.'); const i = pn.indexOf(head);
      if (i < 0) continue;
      if (!rest.length) a[i] = ov.set[path]; else { a[i] = Object.assign({}, a[i] || {}); setPath(a[i], rest.join('.'), () => ov.set[path]); }
    }
    return anchorOf(fn, a);
  }
  function anchorOf(fn, a) {
    if (ANCHOR[fn]) return ANCHOR[fn](a);
    if (RIG[fn]) { const p = a[RIG[fn]] || {}; return [p.x || 0, p.y || 0]; }
    return [typeof a[1] === 'number' ? a[1] : 0, typeof a[2] === 'number' ? a[2] : 0];
  }

  // ---- skeletons (world units), from the rig's own measure pass ----
  function skeleton(fn, a) {
    const ri = RIG[fn]; if (!ri) return null;
    const p = a[ri] || {}; const f = p.f == null ? 1 : p.f;
    const J = [], B = [];
    const j = (id, w, parent, param, sign) => { J.push({ id, w, parent, param, sign }); if (parent) B.push([parent, id]); };
    if (fn === 'heroSide' || fn === 'personSide') {
      const m = fn === 'heroSide' ? orig.heroSide(S.main, Object.assign({}, p, { measure: 1 })) : orig.personSide(S.main, a[1], Object.assign({}, p, { measure: 1 }));
      if (!m || !m.L) return null;
      const hero = fn === 'heroSide', D = hero ? null : dims(a[1]);
      j('hip', m.Hp, null, 'root');
      m.L.forEach((l, i) => { j('knee' + i, l.K, 'hip', `legs.${i}.th`, f); j('ankle' + i, l.A, 'knee' + i, `legs.${i}.kn`, -f); });
      j('chest', m.Sh, 'hip', 'lean', -f);
      const arms = p.arms || (hero ? walkArms(0, 0) : { near: { sh: .05, el: .1 }, far: { sh: -.05, el: .1 } });
      const sides = hero ? [['R', 'coffee'], ['L', 'umbrella']] : [['near', 'near'], ['far', 'far']];
      for (const [k] of sides) {
        const ar = arms[k]; if (!ar) continue;
        const J0 = hero ? add(m.Sh, [-.005 * f, -.035]) : add(m.Sh, [0, -D.limbW * .5]);
        const El = add(J0, dn(ar.sh, f), hero ? HERO.upper : D.up), Wr = add(El, dn(ar.sh + ar.el, f), hero ? HERO.fore : D.fo);
        j('elbow' + k, El, 'chest', `arms.${k}.sh`, f); j('hand' + k, Wr, 'elbow' + k, `arms.${k}.el`, f);
      }
      j('head', add(m.Sh, [0, hero ? .27 : (D.neck + D.head * .45)]), 'chest', 'nod', -f * .8);
      if (hero && p.umb && p.umb.ang != null && m.handL) { j('tip', umbTip(m.handL, p.umb.ang), 'handL', 'umb.ang', 1); J[J.length - 1].abs = 1; }
    } else if (fn === 'heroFront' || fn === 'personFront') {
      const hero = fn === 'heroFront';
      const m = hero ? orig.heroFront(S.main, Object.assign({}, p, { measure: 1 })) : orig.personFront(S.main, a[1], Object.assign({}, p, { measure: 1 }));
      if (!m || !m.Sh) return null;
      const D = hero ? null : dims(a[1]);
      j('hip', m.hip || m.Hp, null, 'root'); j('chest', m.Sh, 'hip', 'sway', 1); J[J.length - 1].mode = 'dx';
      const arms = p.farms || (hero ? { R: { sh: .12, el: -.3 }, L: { sh: .07, el: .05 } } : { l: { sh: .12, el: .05 }, r: { sh: .12, el: .05 } });
      for (const [k, s] of hero ? [['R', -1], ['L', 1]] : [['l', -1], ['r', 1]]) {
        const ar = arms[k]; if (!ar) continue;
        const J0 = hero ? [m.Sh[0] + s * .165, m.Sh[1] - .03] : [m.Sh[0] + s * D.bw * .55, m.Sh[1] - D.limbW * .5];
        const El = add(J0, [s * Math.sin(ar.sh), -Math.cos(ar.sh)], hero ? HERO.upper * (ar.fu || 1) : D.up);
        const Wr = add(El, [s * Math.sin(ar.sh + ar.el), -Math.cos(ar.sh + ar.el)], hero ? HERO.fore * (ar.ff || 1) : D.fo);
        j('elbow' + k, El, 'chest', `farms.${k}.sh`, s); j('hand' + k, Wr, 'elbow' + k, `farms.${k}.el`, s);
      }
      j('head', m.head || add(m.Sh, [0, .25]), 'chest', 'tilt', -.8);
    } else {
      j('hip', [p.x || 0, (p.y || 0) + 1.0], null, 'root');
    }
    return { joints: J, bones: B, f };
  }

  // ---- the wrapper ----
  function wrap(fn) {
    const f = window[fn];
    if (typeof f !== 'function' || orig[fn]) return;
    orig[fn] = f; names[fn] = paramNames(f);
    window[fn] = function (...a) {
      const ctx = a[0];
      if (S.depth > 0 || !ctx || !ctx.canvas) return f.apply(this, a);
      const ri = RIG[fn], measure = ri && a[ri] && a[ri].measure;
      const main = isMain(ctx);
      let counts = main ? S.mainCounts : S.counts.get(ctx); if (!counts) S.counts.set(ctx, counts = {});
      const base = baseName(fn, a);
      if (measure) {                                   // IK passes follow a moved actor, so aims still land
        const n = (counts[base] || 0) + 1, key = n === 1 ? base : base + '#' + n;
        const ov = S.ov && S.ov(key);
        if (ov && (ov.dx || ov.dy)) applyOverride(fn, a, ov, true);
        return f.apply(this, a);
      }
      const n = counts[base] = (counts[base] || 0) + 1, key = n === 1 ? base : base + '#' + n;
      const onMain = main;
      const ov = S.ov && S.ov(key);
      if (ov && ov.hide) return;
      if (S.solo && onMain && S.solo !== key) { S.depth++; try { ctx.save(); ctx.globalAlpha *= .12; return f.apply(this, a); } finally { ctx.restore(); S.depth--; } }
      let anchor = null;
      if (ov) anchor = applyOverride(fn, a, ov, false);
      const rec = onMain ? { key, fn, cat: CAT[fn] || 'prop' } : null;
      if (rec && S.scan) rec.nums = numbers(ri ? a[ri] : named(fn, a), '', {});
      if (rec) S.rec.push(rec);
      const probe = onMain && S.probe, cap = onMain && S.capture === key;
      let before = null;
      if (probe) before = S.probe.read(ctx);
      if (cap) S.capture = { key, ctx, before: S.captureRead(ctx) };
      if (onMain && S.sel === key) {                    // the selected actor: remember its skeleton and transform
        try { S.skel = { key, fn, m: ctx.getTransform(), k: S.main.canvas.width / ctx.canvas.width, sk: skeleton(fn, a), anchor: anchorOf(fn, a), nums: numbers(ri ? a[ri] : named(fn, a), '', {}) }; } catch (e) { S.skel = null; }
      }
      S.depth++;
      const xf = ov && (ov.rot || (ov.sc && ov.sc !== 1) || (!ri && (ov.dx || ov.dy)));
      try {
        if (xf) {
          const [ax, ay] = anchor || anchorOf(fn, a);
          ctx.save(); ctx.translate(ax + (ri ? 0 : ov.dx || 0), ay + (ri ? 0 : ov.dy || 0)); ctx.rotate(ov.rot || 0); ctx.scale(ov.sc || 1, ov.sc || 1); ctx.translate(-ax, -ay);
        }
        return f.apply(this, a);
      } finally {
        if (xf) ctx.restore();
        S.depth--;
        if (probe) { const after = S.probe.read(ctx); if (after !== before) { S.probe.hit = key; S.probe.hitCtx = ctx; } }
        if (cap && S.capture && S.capture.key === key) S.capture.after = S.captureRead(ctx);
      }
    };
  }
  function wrapCamera() {
    const f = window.camera; if (orig.camera) return; orig.camera = f;
    window.camera = function (ctx, cx, cy, s, rot) {
      const ov = S.ov && S.ov('camera');
      if (ov) { cx -= ov.dx || 0; cy -= ov.dy || 0; s *= ov.sc || 1; rot = (rot || 0) + (ov.rot || 0); }
      if (isMain(ctx) && !S.camRec) { S.camRec = { cx, cy, s, rot: rot || 0 }; S.rec.push({ key: 'camera', fn: 'camera', cat: 'camera', nums: S.scan ? { cx, cy, s } : undefined }); }
      return f.call(this, ctx, cx, cy, s, rot);
    };
  }
  function install() {
    for (const fn in CAT) wrap(fn);
    wrapCamera();
  }
  // render one frame, recording the actors drawn on it
  function frame(ctx, t) {
    S.main = ctx; S.counts = new Map(); S.mainCounts = {}; S.rec = []; S.camRec = null; S.skel = null;
    if (S.probe) S.probe.hit = null;
    const sh = FILM.renderFrame(ctx, t);
    return { shot: sh, actors: S.rec, cam: S.camRec, skel: S.skel };
  }
  return { S, install, frame, orig, names, CAT, RIG, skeleton, numbers, getPath, paramNames };
})();
