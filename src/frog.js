// ===== the frog: the hero as drawn in ink (art/frog/drawing.jpg), on the hero's skeleton =====
// hero.js still works out every joint (hips, knees, ankles, shoulders, elbows, hands) exactly as before, so every
// walk, catch and sip in the film is unchanged; this file only decides what is drawn there. The ink is the drawing's
// own pen lines (src/frog_ink.js, traced by tools/trace_character.py): head, belly, hands and feet are placed whole,
// and the neck, arms and legs are the drawing's two pen lines laid along the skeleton's limbs, like rubber hose.
const FROG = (() => {
  const D = FROG_INK, K = D.scale;                  // metres per pixel of the drawing
  const INKC = D.ink, PAPER = D.paper, PAPER_FAR = mixc(D.paper, '#8f949c', .2);
  const ALPHA = .6;                                 // the belly sits 60 % of the way from the hip joint to the shoulders
  const CUP = 1.3;                                  // his cup, a size up: it has to read in his big hand
  // ---- decode the traced polygons ('x,y,dx,dy,...' half pixels, ';' between polygons)
  const dec = s => !s ? [] : s.split(';').map(q => {
    const a = q.split(',').map(Number), o = new Float32Array(a.length); let x = 0, y = 0;
    for (let i = 0; i < a.length; i += 2) { x += a[i]; y += a[i + 1]; o[i] = x / 2; o[i + 1] = y / 2; }
    return o;
  });
  const path = polys => { const p = new Path2D(); for (const a of polys) { p.moveTo(a[0], a[1]); for (let i = 2; i < a.length; i += 2) p.lineTo(a[i], a[i + 1]); p.closePath(); } return p; };
  const PC = {};
  for (const k of ['body', 'hand', 'footL', 'footR']) PC[k] = { ink: path(dec(D[k].ink)), fill: path(dec(D[k].fill)) };
  const pupilPolys = dec(D.head.pupils);
  const near = (a, c) => Math.hypot(a[0] - c[0], a[1] - c[1]);
  const HEAD = {
    fill: path(dec(D.head.fill)), outline: path(dec(D.head.outline)), smile: path(dec(D.head.smile)),
    // each pupil on its own, so the eyes can look about
    pupils: D.head.pupilC.map((c, i) => path(pupilPolys.filter(a => D.head.pupilC.every((c2, j) => j === i || near(a, c) <= near(a, c2))))),
  };
  const TB = {};
  for (const k of ['neck', 'arm', 'legL', 'legR']) TB[k] = { L: D[k].L, ink: dec(D[k].ink), fill: dec(D[k].fill) };
  const Rb = D.body.r * K;

  // ---- drawing helpers
  function piece(ctx, pc, at, ang, sx, paper) {                 // a rigid part: anchor at `at`, turned, mirrored by sx
    ctx.save(); ctx.translate(at[0], at[1]); if (ang) ctx.rotate(ang); ctx.scale(sx * K, K);
    if (paper) { ctx.fillStyle = paper; ctx.fill(pc.fill); }
    ctx.fillStyle = INKC; ctx.fill(pc.ink, 'evenodd');
    ctx.restore();
  }
  // a limb: the drawing's two pen lines laid from P0 (root) to P2 along a quadratic curve bent by Q.
  // The lines stretch or squash along the limb; across it they keep the drawing's width. chir = -1 mirrors them.
  const NS = 48, tabX = new Float32Array(NS + 1), tabY = new Float32Array(NS + 1), tabNX = new Float32Array(NS + 1), tabNY = new Float32Array(NS + 1);
  function lay(P0, Q, P2) {
    const M = 40, xs = [], ys = [], cum = [0];
    for (let i = 0; i <= M; i++) {
      const t = i / M, a = (1 - t) * (1 - t), b = 2 * t * (1 - t), c = t * t;
      xs.push(a * P0[0] + b * Q[0] + c * P2[0]); ys.push(a * P0[1] + b * Q[1] + c * P2[1]);
      if (i) cum.push(cum[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]));
    }
    const Lc = cum[M] || 1e-6;
    let j = 0;
    for (let i = 0; i <= NS; i++) {                            // resample at even arc length, with smooth normals
      const s = Lc * i / NS;
      while (j < M - 1 && cum[j + 1] < s) j++;
      const u = clamp((s - cum[j]) / ((cum[j + 1] - cum[j]) || 1e-9));
      tabX[i] = lerp(xs[j], xs[j + 1], u); tabY[i] = lerp(ys[j], ys[j + 1], u);
      const t = (j + u) / M, dx = 2 * (1 - t) * (Q[0] - P0[0]) + 2 * t * (P2[0] - Q[0]), dy = 2 * (1 - t) * (Q[1] - P0[1]) + 2 * t * (P2[1] - Q[1]);
      let l = Math.hypot(dx, dy);
      let tx = dx, ty = dy;
      if (l < 1e-9) { tx = P2[0] - P0[0]; ty = P2[1] - P0[1]; l = Math.hypot(tx, ty) || 1; }
      tabNX[i] = -ty / l; tabNY[i] = tx / l;
    }
    return Lc;
  }
  function tube(ctx, tb, P0, Q, P2, chir, paper) {
    const Lc = lay(P0, Q, P2), su = Lc / tb.L, sv = K * chir;
    const at = (u, v, pth, first) => {
      let s = u * su, x, y, nx, ny;
      if (s <= 0) { x = tabX[0] + (tabX[1] - tabX[0]) / (Lc / NS) * s; y = tabY[0] + (tabY[1] - tabY[0]) / (Lc / NS) * s; nx = tabNX[0]; ny = tabNY[0]; }
      else if (s >= Lc) { const e = s - Lc; x = tabX[NS] + (tabX[NS] - tabX[NS - 1]) / (Lc / NS) * e; y = tabY[NS] + (tabY[NS] - tabY[NS - 1]) / (Lc / NS) * e; nx = tabNX[NS]; ny = tabNY[NS]; }
      else {
        const f = s / Lc * NS, i = Math.min(NS - 1, f | 0), w = f - i;
        x = tabX[i] + (tabX[i + 1] - tabX[i]) * w; y = tabY[i] + (tabY[i + 1] - tabY[i]) * w;
        nx = tabNX[i] + (tabNX[i + 1] - tabNX[i]) * w; ny = tabNY[i] + (tabNY[i + 1] - tabNY[i]) * w;
      }
      x += nx * v * sv; y += ny * v * sv;
      if (first) pth.moveTo(x, y); else pth.lineTo(x, y);
    };
    const build = polys => { const p = new Path2D(); for (const a of polys) { for (let i = 0; i < a.length; i += 2) at(a[i], a[i + 1], p, i === 0); p.closePath(); } return p; };
    if (paper) { ctx.fillStyle = paper; ctx.fill(build(tb.fill)); }
    ctx.fillStyle = INKC; ctx.fill(build(tb.ink), 'evenodd');
    return (u) => { const s = clamp(u) * NS, i = Math.min(NS - 1, s | 0), w = s - i; return [lerp(tabX[i], tabX[i + 1], w), lerp(tabY[i], tabY[i + 1], w)]; };
  }
  // two-bone IK from root to target; side = which way the joint bends (+1 left of root->target, -1 right).
  // Out of reach, the limb just goes straight and stretches: it is rubber hose.
  function bend(root, target, l1, l2, side) {
    const dx = target[0] - root[0], dy = target[1] - root[1], d = Math.hypot(dx, dy) || 1e-6, ux = dx / d, uy = dy / d;
    if (d >= l1 + l2 - 1e-6) return [root[0] + ux * d * l1 / (l1 + l2), root[1] + uy * d * l1 / (l1 + l2)];
    const a = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)) * side;
    const c = Math.cos(a), s = Math.sin(a);
    return [root[0] + (ux * c - uy * s) * l1, root[1] + (ux * s + uy * c) * l1];
  }
  const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);   // + when c is left of a->b
  const sgn = v => v < 0 ? -1 : 1;
  // the body frame: the belly between the hip joint and the shoulders, leaning with the torso
  function frame(Hp, Sh, f) {
    const up0 = [Sh[0] - Hp[0], Sh[1] - Hp[1]], l = Math.hypot(up0[0], up0[1]) || 1, up = [up0[0] / l, up0[1] / l];
    const C = [Hp[0] + up0[0] * ALPHA, Hp[1] + up0[1] * ALPHA];
    const xa = [up[1] * f, -up[0] * f];                                          // "forward" across the body
    const T = (bx, by) => [C[0] + (xa[0] * bx + up[0] * by) * K, C[1] + (xa[1] * bx + up[1] * by) * K];   // drawing px (body) -> world
    return { C, up, T, tilt: Math.atan2(-up[0], up[1]) };
  }
  const ARM = (D.arm.L + D.body.r) * K * .51;                  // upper arm = forearm, from the belly's centre
  const LEG = k => D[k].L * K * .52;                            // thigh = shin, a touch of bend when he stands
  // the hand: its grip (the middle of the fingers) on `G`, the wrist turned back up the forearm (dirW: wrist -> elbow)
  function handAt(G, dirW, chir) {
    const hd = D.hand.dir, a = Math.atan2(dirW[1], dirW[0]) - Math.atan2(hd[1], hd[0] * chir);
    const g = D.hand.grip, c = Math.cos(a), s = Math.sin(a);
    const lx = -g[0] * chir * K, ly = -g[1] * K;               // wrist relative to the grip, in the turned frame
    return { G, ang: a, chir, W: [G[0] + lx * c - ly * s, G[1] + lx * s + ly * c], at: [G[0] + (-g[0] * chir * K) * c - (-g[1] * K) * s, G[1] + (-g[0] * chir * K) * s + (-g[1] * K) * c] };
  }
  function drawHand(ctx, h, paper) { piece(ctx, PC.hand, h.at, h.ang, h.chir, paper); }
  // an arm from the belly to a hand; the elbow bends the way the skeleton's elbow does
  function arm(ctx, C, h, bendSide, chir, paper) {
    const E = bend(C, h.W, ARM, ARM, bendSide);
    const dE = Math.hypot(E[0] - C[0], E[1] - C[1]) || 1, root = [C[0] + (E[0] - C[0]) / dE * (Rb + .004), C[1] + (E[1] - C[1]) / dE * (Rb + .004)];
    tube(ctx, TB.arm, root, E, h.W, chir, paper);
  }
  // a leg from the belly to a foot: foot `ft` ('footL'/'footR') stands with its lowest toe where the boot's sole was
  function footAnchor(ft, A, fa, f) { const y = -.07 - D[ft].low * K, c = Math.cos(fa), s = Math.sin(fa); return [A[0] - f * y * s, A[1] + y * c]; }
  function leg(ctx, tk, root, Fa, kneeSide, chir, paper) {
    const Kn = bend(root, Fa, LEG(tk), LEG(tk), kneeSide);
    return tube(ctx, TB[tk], root, Kn, Fa, chir, paper);
  }
  function neckHead(ctx, fr, headAt, headAng, sx, o) {
    const r0 = fr.T(D.neck.root[0], D.neck.root[1]);
    const mid = [(r0[0] + headAt[0]) / 2, (r0[1] + headAt[1]) / 2];
    tube(ctx, TB.neck, r0, mid, headAt, 1, o.paper || PAPER);
    piece(ctx, PC.body, fr.C, fr.tilt, sx, PAPER);
    head(ctx, headAt, headAng, sx, o);
  }
  // the head: fill, outline and eyes, the smile, the pupils (they look about, and hide in a blink)
  function head(ctx, at, ang, sx, o = {}) {
    ctx.save(); ctx.translate(at[0], at[1]); if (ang) ctx.rotate(ang); ctx.scale(sx * K, K);
    ctx.fillStyle = PAPER; ctx.fill(HEAD.fill);
    ctx.fillStyle = INKC; ctx.fill(HEAD.outline, 'evenodd');
    if (!o.back) {
      ctx.fill(HEAD.smile, 'evenodd');
      const lx = (o.lookX || 0) * 26 * sx, ly = (o.lookY || 0) * 22;
      HEAD.pupils.forEach(pp => { ctx.save(); ctx.translate(lx, ly); ctx.fill(pp, 'evenodd'); ctx.restore(); });
    }
    ctx.restore();
  }
  const headPoint = (at, ang, sx, q) => { const c = Math.cos(ang), s = Math.sin(ang), x = q[0] * K * sx, y = q[1] * K; return [at[0] + x * c - y * s, at[1] + x * s + y * c]; };

  // =========================================================== side view
  // g: the skeleton heroSide measured: { f, Hp, Sh, L: legs {K, A, boot}, fa: [ankle angles], AR, AL, nearR, sipT, sipOn }
  function side(ctx, p, g) {
    const { f, Hp, L } = g, fr = frame(Hp, g.Sh, f), C = fr.C;
    const headAt = fr.T(D.neck.end[0], D.neck.end[1]), headAng = fr.tilt - (p.nod || 0) * f;
    const deferred = [];
    const paperOf = far => far ? PAPER_FAR : PAPER;
    const drawArm = (A, isR, far) => {
      const dirW = [A.El[0] - A.Wr[0], A.El[1] - A.Wr[1]];
      const side_ = sgn(cross(A.J, A.Wr, A.El));
      if (!isR && p.umb !== false && !(p.umb && p.umb.hidden)) {
        const u = p.umb || {}; const ang = u.ang != null ? u.ang : -Math.PI / 2 + (u.swing || 0);
        drawUmbrella(ctx, u.at ? u.at[0] : A.Hc[0], u.at ? u.at[1] : A.Hc[1], ang, { open: u.open || 0, cs: u.cs != null ? u.cs : f, gripU: u.gripU || 0 });
      }
      const h = handAt(A.Hc, dirW, f);
      arm(ctx, C, h, side_, f, paperOf(far));
      if (isR && p.cup !== false) {
        const cupHand = () => {
          const cp = p.cupAt || add(A.Hc, [.012 * f, .012]);
          drawCup(ctx, cp[0], cp[1], p.cupAng != null ? p.cupAng : (p.sip ? .45 * f : .45 * f * E.io(g.sipT)), CUP);
          drawHand(ctx, h, paperOf(far && !g.sipOn));
        };
        if (far && (g.sipOn || p.cupOver)) deferred.push(cupHand); else cupHand();
      } else drawHand(ctx, h, paperOf(far));
    };
    if (p.shadow !== false) { const gy = p.gy != null ? p.gy : (p.y || 0); const low = Math.min(...L[0].boot.map(q => q[1]), ...L[1].boot.map(q => q[1])); const hgt = Math.max(0, low - gy); shadow(ctx, Hp[0] + .03 * f, gy + .005, .3 / (1 + hgt * 1.5), .2 / (1 + hgt * 3)); }
    if (g.nearR) drawArm(g.AL, false, true); else drawArm(g.AR, true, true);
    // legs, far first; the smear stays on his left shin
    const legSk = (i, far, isLeft) => {
      const l = L[i], tk = isLeft ? 'legL' : 'legR', ft = 'footR';        // side on, both feet point where he goes
      const root = fr.T(isLeft ? -8 : 8, -D.body.r * .82);
      const Fa = footAnchor(ft, l.A, g.fa[i] || 0, f);
      const on = leg(ctx, tk, root, Fa, sgn(cross(Hp, l.A, l.K)), f, paperOf(far));
      piece(ctx, PC[ft], Fa, f * (g.fa[i] || 0), f, paperOf(far));
      if (isLeft && (p.leg != null ? p.leg : HS.leg) > 0) legSmears(ctx, on(.5), on(.92), p.leg != null ? p.leg : HS.leg);
    };
    legSk(1, true, f === -1); legSk(0, false, f === 1);
    // his head is far wider than his shoulders: a hand raised past his neck, or an umbrella held up over him,
    // goes behind it (beside it, in depth) instead of across his face
    const nearA = g.nearR ? g.AR : g.AL, u = p.umb || {};
    const up = Math.sin(u.ang != null ? u.ang : -Math.PI / 2);
    const upUmb = !g.nearR && p.umb !== false && !(p.umb && p.umb.hidden) && up > .3 && ((u.open || 0) > .05 || up > .8);
    const behind = nearA.Hc[1] > headAt[1] - .02 || upUmb;
    if (behind) { if (g.nearR) drawArm(g.AR, true, false); else drawArm(g.AL, false, false); }
    neckHead(ctx, fr, headAt, headAng, f, p);
    deferred.forEach(fn => fn());
    if (!behind) { if (g.nearR) drawArm(g.AR, true, false); else drawArm(g.AL, false, false); }
    return headPoint(headAt, headAng, f, [0, D.head.top * .45]);
  }
  // where the coffee hand goes for a sip: the cup's lid to the corner of his smile
  function sipSide(Hp, Sh, f) {
    const fr = frame(Hp, Sh, f), at = fr.T(D.neck.end[0], D.neck.end[1]);
    const m = headPoint(at, fr.tilt, f, D.head.mouth.side);
    return [m[0] - .045 * f, m[1] - .15];
  }

  // =========================================================== front view
  // g: { hip, Sh, LEG: [{H0, K, A, s}], AR, AL, hands: {R, L} centres, arms, sipT, headX, frontDefer }
  function front(ctx, p, g) {
    const fr = frame(g.hip, g.Sh, 1), C = fr.C;
    const headAt = add(fr.T(D.neck.end[0], D.neck.end[1]), [p.headX || 0, 0]), headAng = fr.tilt + (p.tilt || 0);
    // legs: screen-left leg is drawn as his left leg in the drawing, and its foot splays left
    g.LEG.forEach((l, i) => {
      const left = l.s < 0, tk = left ? 'legL' : 'legR', ft = left ? 'footL' : 'footR';
      const root = fr.T(D[tk].root[0], D[tk].root[1]);
      const Fa = footAnchor(ft, l.A, 0, 1);
      const on = leg(ctx, tk, root, Fa, sgn(cross(l.H0, l.A, l.K)), 1, PAPER);
      piece(ctx, PC[ft], Fa, 0, 1, PAPER);
      if (i === 1 && (p.leg != null ? p.leg : HS.leg) > 0) legSmears(ctx, on(.5), on(.92), p.leg != null ? p.leg : HS.leg);
    });
    let deferCup = null;
    const drawA = (A, isR) => {
      const chir = isR ? 1 : -1;                                // his screen-left hand is the drawing's hand; the other one mirrored
      const dirW = [A.El[0] - A.Wr[0], A.El[1] - A.Wr[1]];
      const hc = A.hc;
      if (!isR && p.umb !== false) {
        const u = p.umb || {};
        drawUmbrella(ctx, A.Wr[0], A.Wr[1] - .01, u.ang != null ? u.ang : -Math.PI / 2 + (u.swing || 0), { open: u.open || 0, cs: u.cs != null ? u.cs : -1, gripU: u.gripU || 0 });
      }
      const h = handAt(isR ? hc : [A.Wr[0], A.Wr[1] - .01], dirW, chir);
      arm(ctx, C, h, sgn(cross(A.J, A.Wr, A.El)), chir, PAPER);
      if (isR && p.cup !== false) {
        const cp = p.cupAt || [hc[0] + .01, hc[1] + .02];
        const cupHand = () => { drawCup(ctx, cp[0], cp[1], .12 * (g.sipT || 0), CUP); drawHand(ctx, h, PAPER); };
        if (p.cupFront || (g.sipT || 0) > .35) deferCup = cupHand; else cupHand();
      } else drawHand(ctx, h, PAPER);
    };
    const u = p.umb || {};
    const behind = g.AL.Wr[1] > headAt[1] + .12 || (p.umb !== false && (u.open || 0) > .05 && Math.sin(u.ang != null ? u.ang : -Math.PI / 2) > .3);
    if (behind) drawA(g.AL, false);
    neckHead(ctx, fr, headAt, headAng, 1, p);
    drawA(g.AR, true); if (!behind) drawA(g.AL, false);
    if (deferCup) deferCup();
    return headPoint(headAt, headAng, 1, [0, D.head.top * .45]);
  }
  function sipFront(hip, Sh, p) {
    const fr = frame(hip, Sh, 1), at = add(fr.T(D.neck.end[0], D.neck.end[1]), [p.headX || 0, 0]);
    const m = headPoint(at, fr.tilt + (p.tilt || 0), 1, D.head.mouth.front);
    return [m[0] - .02, m[1] - .19];
  }

  // =========================================================== back view (walking away)
  function back(ctx, p, g) {
    const fr = frame(g.hip, g.Sh, 1), C = fr.C;
    g.LEG.forEach(l => {
      const left = l.s < 0, tk = left ? 'legL' : 'legR', ft = left ? 'footL' : 'footR';
      const root = fr.T(D[tk].root[0], D[tk].root[1]);
      const Fa = footAnchor(ft, l.A, 0, 1);
      leg(ctx, tk, root, Fa, sgn(l.s), 1, PAPER);
      piece(ctx, PC[ft], Fa, 0, 1, PAPER);
    });
    if (!p.hideHands) {
      [g.AL, g.AR].forEach((A, i) => {
        const chir = i ? -1 : 1, dirW = [A.El[0] - A.Wr[0], A.El[1] - A.Wr[1]];
        const h = handAt(A.Wr, dirW, chir);
        arm(ctx, C, h, sgn(cross(A.J, A.Wr, A.El)), chir, PAPER); drawHand(ctx, h, PAPER);
      });
    } else {
      // his hands are in front of him, holding the umbrella and the cup: from behind only the tops of his arms show
      [-1, 1].forEach(s => { const r = fr.T(s * D.body.r * .55, D.body.r * .3), e = fr.T(s * D.body.r * .45, -D.body.r * .55); tube(ctx, TB.arm, r, add(fr.T(s * D.body.r * 1.35, 0), [0, 0]), e, s, PAPER); });
    }
    const headAt = fr.T(D.neck.end[0], D.neck.end[1]);
    neckHead(ctx, fr, headAt, fr.tilt, 1, { back: 1 });
    return headPoint(headAt, fr.tilt, 1, [0, D.head.top * .45]);
  }

  return { side, front, back, head, sipSide, sipFront, handAt, drawHand, tube, TB, PC, piece, K, D, INKC, PAPER, CUP, headPoint };
})();
