// ===== shots 1-6 (v5: beat-aligned, one readable beat at a time) =====

// ---------- 1. Top hat ----------
const HAT = (m => ({ off: m.T_OFF, seat: m.T_SEAT, spin: m.T_SPIN, flick: m.T_FLICK, head: m.T_HEAD, tip: [-.5, 2.38] }))(MOMENTS('Top hat'));
const hatSpin = t => { const a = seg(t, HAT.spin, HAT.spin + .25), b = seg(t, HAT.flick - .1, HAT.flick); return t < HAT.spin ? 0 : 26 * ((t - HAT.spin) - .125 * (a < 1 ? a * a : 2 * a - 1)); };
function hatFlight(t, headTop) {
  const u = seg(t, HAT.off, HAT.seat), uu = .5 * u + .5 * u * u;
  const P0 = headTop, P1 = [.85, 2.6], P2 = [HAT.tip[0] + .02, 2.68], P3 = [HAT.tip[0], HAT.tip[1] - .15];
  const b = (a0, a1, a2, a3) => Math.pow(1 - uu, 3) * a0 + 3 * Math.pow(1 - uu, 2) * uu * a1 + 3 * (1 - uu) * uu * uu * a2 + uu * uu * uu * a3;
  return { p: [b(P0[0], P1[0], P2[0], P3[0]), b(P0[1], P1[1], P2[1], P3[1])], r: TAU * (1 - Math.pow(1 - u, 2.2)) };
}
shot('Top hat', ...CUT(1), (ctx, t) => {
  skyFill(ctx, '#bfc8cf', '#dde0e1');
  camera(ctx, 0, 1.7, 520);
  ctx.globalAlpha = .32; tree(ctx, -2.0, .4, .62, { leaf: '#93a2a0', trunk: '#8f9699', seed: 2 }); tree(ctx, 1.9, .3, .7, { leaf: '#9aa8a5', trunk: '#8f9699', seed: 5 }); tree(ctx, -.2, .7, .45, { leaf: '#a4afad', trunk: '#9aa0a3', seed: 7 }); ctx.globalAlpha = 1;
  fogBand(ctx, -5, 5, .6, 3.2, '#dfe2e3', .75, .15);
  railings(ctx, -4, 4, .25, 1.35, { c: '#3a3e45', gap: .16 });
  fogBand(ctx, -5, 5, .6, 2.0, '#d6dadc', .35, 0);
  // wind: leaves arrive first, then the gust takes the hat
  const r = rng(21);
  for (let i = 0; i < 14; i++) {
    const t0 = .05 + r() * 1.0, sp = 3.5 + r() * 2, y0 = .9 + r() * 1.7, u = t - t0;
    if (u < 0 || u > 1.6) continue;
    const lx = 2.6 - u * sp, ly = y0 + Math.sin(u * 7 + i) * .12 - u * .15;
    local(ctx, lx, ly, u * 8 + i); ell(ctx, 0, 0, .055, .027); fs(ctx, ['#b8793b', '#c49a3c', '#8f6a3a'][i % 3], 1.2); ctx.restore();
  }
  const gust = kf(t, [[0, 0], [.3, .35], [.55, 1], [1.5, .8], [2.3, .2], [4.2, .05]]);
  // the gust itself, made visible: swooshes race in from the right, one curls up under the brim just as the hat lifts
  windStreaks(ctx, t, [[.02, 1.35, 2.4, 1.1, 7], [.31, 2.0, 2.6, 1.0, 7, .18], [.24, 2.45, 2.5, .9, 7], [.36, 1.7, 2.5, 1.2, 7], [.62, 2.25, 2.5, .8, 6.5], [.85, 1.25, 2.5, .9, 6], [1.15, 2.0, 2.5, .7, 5.5]], -1);
  // ---- the gentleman ----
  const flinch = kf(t, [[HAT.head, 0], [HAT.head + .06, 1, E.o], [HAT.head + .3, 0, E.io]]);
  const dRest = personFront(ctx, CAST.dandy, { x: .9, measure: 1 });
  const headTop0 = [dRest.head[0], dRest.head[1] + CAST.dandy.h * .135 * .36];
  const hatAt = tt => hatFlight(tt, headTop0);
  const hNow = t < HAT.seat ? hatAt(t).p : [HAT.tip[0], HAT.tip[1] - .15];
  const look = { lookX: clamp((hNow[0] - .9) * 1.2, -1, 1), lookY: clamp((hNow[1] - 1.75) * 1.5, -.2, 1) };
  const dex = t < HAT.off ? { eyes: 'open', mouth: 'smile' }
    : t < HAT.head ? Object.assign({ eyes: 'wide', mouth: 'o', brow: t > HAT.seat ? 1.5 : 1.1 }, t < HAT.flick + .05 ? look : { lookX: lerp(-1, 0, seg(t, HAT.flick + .05, HAT.head - .05)), lookY: 1 })
    : t < HAT.head + .14 ? { eyes: 'closed', mouth: 'o', brow: 1.6 }
    : t < 3.72 ? { eyes: 'wide', mouth: 'o', brow: 1.5, lookY: 1, lookX: -.3 }
    : { eyes: 'happy', mouth: 'smile', brow: .5 };
  // he grabs after the hat too late; later he touches the brim to check it is really back
  const D = dims(CAST.dandy), Jl = [dRest.Sh[0] - D.bw * .55, dRest.Sh[1] - D.limbW * .5];
  const grab = kf(t, [[.58, 0], [.72, 1, E.o], [1.05, 1], [1.45, 0]]);
  const touch = kf(t, [[3.5, 0], [3.66, 1, E.io], [3.85, 1], [4.05, 0]]);
  const ikTouch = ik2(-((headTop0[0] - .12) - Jl[0]), headTop0[1] - .02 - Jl[1], D.up, D.fo);
  const armLd = { sh: lerp(lerp(.1, 2.5, grab), ikTouch[0], touch) + flinch * .25, el: lerp(lerp(.05, .25, grab), ikTouch[1], touch) + flinch * .5 };
  const armRd = { sh: .1 + flinch * .3, el: .05 + flinch * .5 };
  const dOut = personFront(ctx, CAST.dandy, { x: .9, y: -.035 * flinch, ex: dex, tilt: -.06 * flinch, farms: { l: armLd, r: armRd } });
  const headTop = [dOut.head[0], dOut.head[1] + CAST.dandy.h * .135 * .36];
  // ---- the hero ----
  const base = { x: -.85, y: 0, farms: { R: { sh: .12, el: -.3 }, L: { sh: .07, el: .05 } }, hairWind: -gust * .7, coatFlare: gust * .12, coatWind: -gust * .4, tieWind: -gust * .6, eyes: .36, mouth: .1 };
  const mb = heroFront(ctx, Object.assign({ measure: 1 }, base));
  // (a) he sees it and swings the umbrella up on the outside
  const raise = kf(t, [[.72, 0], [1.12, 1, E.io3]]);
  const armUp = { sh: lerp(.07, .5, raise), el: lerp(.05, 2.4, raise) };
  const angUp = raise < .5 ? lerp(-Math.PI / 2, 0, raise * 2) : lerp(0, Math.PI / 2 + .06, (raise - .5) * 2);
  // (b) tracking: the tip stays under the tumbling hat with small corrections and rises into the opening
  let tipT;
  if (t < HAT.seat) { const k = E.io(seg(t, 1.15, 1.5)), hl = hatAt(t - .04).p; tipT = [lerp(HAT.tip[0], hl[0], k) + .012 * Math.sin(t * 29) * seg(t, HAT.seat, 1.2), HAT.tip[1] - .05 + .05 * E.io(seg(t, 1.5, HAT.seat)) + .008 * Math.sin(t * 23) * seg(t, 1.55, 1.2)]; }
  else if (t < HAT.flick) { const give = Math.sin(Math.PI * seg(t, HAT.seat, HAT.seat + .24)) * .07, stir = Math.sin(Math.PI * seg(t, HAT.spin - .06, HAT.spin + .14)), sa = (t - HAT.spin) * 30; tipT = [HAT.tip[0] + stir * .025 * Math.cos(sa) + .006 * Math.sin(t * 13) * seg(t, 2.1, 2.3), HAT.tip[1] - give + stir * .012 * Math.sin(sa)]; }
  else tipT = mix(HAT.tip, [HAT.tip[0] + .1, HAT.tip[1] + .1], E.o(seg(t, HAT.flick, HAT.flick + .07)));
  const angTr = Math.PI / 2 + .06 - clamp((tipT[0] - HAT.tip[0]) * .5, -.2, .2);
  const wr = [tipT[0] - UL * Math.cos(angTr), tipT[1] + .01 - UL * Math.sin(angTr)];
  const ikL = frontArmIK(mb.Sh, wr, 1);
  // (c) after the flick it settles on his shoulder, tip up and away from the gentleman
  const ikS = frontArmIK(mb.Sh, add(mb.Sh, [.22, -.12]), 1), angS = Math.PI / 2 - .32;
  const w1 = E.io(seg(t, 1.0, 1.15)), w2 = E.io(seg(t, HAT.flick + .1, HAT.flick + .5));
  let armL = { sh: lerp(armUp.sh, ikL.sh, w1), el: lerp(armUp.el, ikL.el, w1) };
  let ua = lerp(angUp, angTr, w1);
  armL = { sh: lerp(armL.sh, ikS.sh, w2), el: lerp(armL.el, ikS.el, w2) };
  ua = lerp(ua, angS, w2);
  const tracking = t > .62 && t < HAT.seat;
  const { T_SIP } = MOMENTS('Top hat');
  const sipT = kf(t, [[T_SIP[0], 0], [T_SIP[1], 1, E.io], [T_SIP[2], 1]]);
  const hp = Object.assign({}, base, { farms: { R: base.farms.R, L: armL }, umb: { ang: ua }, blink: kf(t, [[3.02, 0], [3.07, 1], [3.15, 0]]), sipT,
    lookX: tracking ? .5 : t > HAT.seat && t < HAT.flick ? .6 : t >= HAT.flick && t < HAT.head + .2 ? .9 : 0, lookY: tracking || (t > HAT.seat && t < HAT.flick) ? .9 : 0, brow: t > .62 && t < .9 ? .8 : 0, smirk: t > HAT.seat && t < HAT.head + .3 ? .6 : 0 });
  const m = heroFront(ctx, Object.assign({ measure: 1 }, hp));
  heroFront(ctx, hp);
  const tipNow = [m.handL[0] + UL * Math.cos(ua), m.handL[1] - .01 + UL * Math.sin(ua)];
  // ---- the hat ----
  let hx, hy, hr = 0, sq = 1;
  if (t < HAT.off) { [hx, hy] = headTop; }
  else if (t < HAT.seat) { const q = hatAt(t); [hx, hy] = q.p; hr = q.r; }
  else if (t < HAT.flick + .03) { hx = tipNow[0] - .15 * Math.cos(ua); hy = tipNow[1] - .15 * Math.sin(ua); hr = ua - Math.PI / 2; sq = 1 + .1 * Math.sin((t - HAT.seat) * 30) * Math.exp(-(t - HAT.seat) * 7); }
  else if (t < HAT.head) {
    const u = seg(t, HAT.flick + .03, HAT.head), P0 = [HAT.tip[0] + .1, HAT.tip[1] + .1 - .15], P1 = headTop;
    hx = lerp(P0[0], P1[0], u); hy = lerp(P0[1], P1[1], u) + Math.sin(Math.PI * u) * .34; hr = -TAU * E.io(u);
  } else { [hx, hy] = headTop; sq = 1 + .14 * Math.sin((t - HAT.head) * 26) * Math.exp(-(t - HAT.head) * 9); }
  const under = clamp((hy - 1.95) * 2.2) * (Math.cos(hr) > .3 ? 1 : 0);
  const spinning = t > HAT.spin && t < HAT.flick + .03;
  const ph = hatSpin(Math.min(t, HAT.flick));
  if (spinning) hr += .05 * Math.sin(ph * .31);
  tophat(ctx, hx, hy, hr, sq, under, t > HAT.spin && t < HAT.head ? (t < HAT.flick ? ph : hatSpin(HAT.flick) + 18 * (t - HAT.flick)) : null);
  if (spinning) { const a = Math.min(1, seg(t, HAT.spin, HAT.spin + .2)) * (1 - seg(t, HAT.flick - .08, HAT.flick + .03)); ctx.save(); ctx.translate(hx, hy); ctx.rotate(hr); ctx.strokeStyle = `rgba(250,251,252,${.95 * a})`; ctx.lineWidth = px(5); ctx.lineCap = 'round'; for (let k = 0; k < 3; k++) { const a0 = ph * .45 + k * TAU / 3; ctx.beginPath(); ctx.ellipse(0, .0, .21, .055, 0, a0 % TAU, a0 % TAU + 1.1); ctx.stroke(); ctx.beginPath(); ctx.ellipse(0, .13, .15, .04, 0, (a0 + 1.6) % TAU, (a0 + 1.6) % TAU + .9); ctx.stroke(); } ctx.restore(); }
  if (t > 1.5 && t < HAT.flick + .03) {
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(hr); ctx.beginPath(); ctx.rect(-.16, -.16, .32, .158); ctx.rotate(-hr); ctx.translate(-hx, -hy); ctx.clip();
    drawUmbrella(ctx, m.handL[0], m.handL[1] - .01, ua, { cs: -1 }); ctx.restore();
  }
}, { notes: 'He reads the hat as it tumbles, keeps the tip under the opening with small corrections and lets it drop onto the tip from below: a kendama catch, not magic. The gentleman grabs too late, stares the whole time, flinches when the hat lands back on his head, checks the brim, and only then smiles.' });

// ---------- 2. Scooter ----------
// a kid scoots along, eyes on his phone, straight at a lamppost in the middle of the pavement.
// The man doesn't stop him: one tap on the handlebar and the kid curves round in front of the post at the same speed.
shot('Scooter', ...CUT(2), (ctx, t) => {
  skyFill(ctx, '#c7ced3', '#d9dcdc');
  camera(ctx, .2, 1.12, 390);
  const Z = z => ({ y: z * .55 - .05, s: 1 - z * .14 });
  stoneWall(ctx, -6, 8, .5, 5, '#d9d0c1', { seed: 4 });
  rect(ctx, -6, .5, 14, .25); ctx.fillStyle = '#c4baaa'; ctx.fill();
  [-3.2, -.9, 1.6, 3.9].forEach(wx => sashWindow(ctx, wx, 2.0, .85, 1.5, { wall: '#d9d0c1' }));
  railings(ctx, -6, 8, .5, 1.05, { c: '#24272c' });
  pavement(ctx, -6, 8, -.1, .5, '#bdb7ad', { rows: 2, slab: .95 });
  kerb(ctx, -6, 8, -.1, .16);
  road(ctx, -6, 8, -1.6, -.26, '#56595e');
  const postX = .45, postZ = .5;
  const { T_TAP, SW, T_POCKET } = MOMENTS('Scooter');
  const KX = tt => 2.65 - 1.7 * tt;                       // constant speed, start to finish
  const kx = KX(t), kz = lerp(.5, 0, E.io(seg(t, ...SW)));
  const turn = Math.sin(Math.PI * seg(t, SW[0], SW[1] + .05));
  const kLean = .12 * turn;                               // leans into the curve
  const hz = .92, hzP = Z(hz);
  const hx = -1.45 + 1.1 * t, hd = hx + 1.45;              // he never breaks stride
  const reach = kf(t, [[.72, 0], [.97, 1, E.o], [1.05, 1], [1.35, 0, E.io]]);
  const tapP = (() => { const P = Z(.5); return [KX(T_TAP) - .24 * P.s, P.y + .115 + .62 * P.s]; })();
  const drawHero = () => {
    const legs = legsByDist(hd), arms = armsByDist(hd);
    const base = heroSide(ctx, { x: hx, y: hzP.y, measure: 1, legs, lean: -.03 + reach * .08 });
    const tgt = t < T_TAP ? add(tapP, [.1 * (1 - seg(t, .8, T_TAP)), .08 * (1 - seg(t, .8, T_TAP))]) : add(tapP, [-.12 * seg(t, T_TAP, 1.2), .05 * seg(t, T_TAP, 1.2)]);
    const aim = aimTip(base, tgt, 1, [.35, -.3]);
    arms.L = { sh: lerp(arms.L.sh, aim.arm.sh, reach), el: lerp(arms.L.el, aim.arm.el, reach), wr: 0 };
    arms.R = blendArm(arms.R, CUP_LOW, reach);
    const mm = heroSide(ctx, { x: hx, y: hzP.y, measure: 1, legs, arms, lean: -.03 + reach * .08 });
    const ang0 = -Math.PI / 2 + .15 + Math.sin(TAU * hd / (2 * STRIDE())) * .1;
    const angT = Math.atan2(tgt[1] - mm.handL[1], tgt[0] - mm.handL[0]);
    heroSide(ctx, { x: hx, y: hzP.y, legs, arms, lean: -.03 + reach * .08, umb: { ang: lerp(ang0, angT, E.io(reach)) }, nod: kf(t, [[1.8, 0], [1.92, .16], [2.1, 0]]), brow: t > .6 && t < 1.1 ? .8 : 0, smirk: t > 1.7 ? .6 : 0 });
  };
  const drawKid = () => {
    const P = Z(kz), sc = P.s;
    const stand = { th: .08, kn: .12, fa: 0 }, push = Math.sin(t * 7);
    const kick = { th: -.3 - .25 * push, kn: .5 + .25 * push, fa: -.2 };
    ctx.save(); ctx.translate(kx, P.y); ctx.rotate(kLean); ctx.translate(-kx, -P.y);
    shadow(ctx, kx, P.y + .005, .35 * sc, .2);
    scooter(ctx, kx, P.y, -1, 0, sc);
    // eyes on the phone until the tap; a start, both hands to the bar; past the post a look back and a wave; then the phone goes in his pocket
    const lookBack = t > 1.8 && t < 2.4;
    const ex = t < T_TAP ? { eyes: 'open', mouth: 'smile', lookY: -1, lookX: .4 } : t < 1.5 ? { eyes: 'wide', mouth: 'o', brow: 1.4 } : t < 1.8 ? { eyes: 'open', mouth: 'o' } : t < 2.4 ? { eyes: 'happy', mouth: 'grin', brow: .6 } : { eyes: 'open', mouth: 'flat', brow: -.4 };
    const bar = { sh: .95, el: .15 }, phoneA = { sh: .35, el: 1.75 };
    const grabBar = E.o(seg(t, T_TAP, T_TAP + .12));
    const pocket = kf(t, [[1.45, 0], [1.58, 1, E.io], [1.66, 1], [1.78, 0, E.io]]);
    const phoneOn = t < T_POCKET;
    const wave = kf(t, [[1.8, 0], [1.9, 1, E.o], [2.3, 1], [2.42, 0]]);
    let near = { sh: lerp(phoneA.sh, bar.sh, grabBar), el: lerp(phoneA.el, bar.el, grabBar) };
    near = { sh: lerp(near.sh, -2.5, wave), el: lerp(near.el, -.3, wave) + Math.sin(t * 22) * .35 * wave };
    near = { sh: lerp(near.sh, -.25, pocket), el: lerp(near.el, .35, pocket) };
    ctx.save(); ctx.translate(kx, P.y); ctx.scale(sc, sc); ctx.translate(-kx, -P.y);
    personSide(ctx, CAST.scootKid, { x: kx, y: P.y + .115, shadow: false, f: -1, headF: lookBack ? 1 : -1, nod: lookBack ? -.1 : t < T_TAP ? .22 : 0, legs: [stand, kick], lean: .12, arms: { near, far: bar }, ex,
      hold: { near: (c, w) => { if (!phoneOn) return; local(c, w[0] - .01, w[1] + .04, t < T_TAP ? -.5 : 0); rrect(c, -.036, -.062, .072, .124, .016); fs(c, '#23262c', OLW * .8); rect(c, -.026, -.048, .052, .094); c.fillStyle = t < T_TAP ? '#a9dcff' : '#6f8fa8'; c.fill(); c.restore(); } } });
    ctx.restore(); ctx.restore();
    // speed lines trailing behind him
    const a = .55; ctx.strokeStyle = `rgba(90,90,90,${a})`; ctx.lineWidth = px(2.2); ctx.lineCap = 'round';
    for (let k = 0; k < 3; k++) { const y = P.y + .2 + k * .17, x0 = kx + .35 + (k % 2) * .08; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + .28 + k * .04, y + (kz - lerp(.05, .52, E.io(seg(t - .15, ...SW)))) * .4); ctx.stroke(); }
  };
  const lp = Z(postZ);
  const drawPost = () => lamppost(ctx, postX, lp.y, lp.s);
  [[postZ, drawPost], [kz, drawKid], [hz, drawHero]].sort((a, b) => b[0] - a[0]).forEach(i => i[1]());
  if (t > T_TAP - .02 && t < T_TAP + .1) { const a = 1 - seg(t, T_TAP - .02, T_TAP + .1); ctx.strokeStyle = `rgba(40,40,40,${a})`; ctx.lineWidth = px(2.6); for (let k = 0; k < 5; k++) { const an = k * 1.25 + .3; ctx.beginPath(); ctx.moveTo(tapP[0] + Math.cos(an) * .05, tapP[1] + Math.sin(an) * .05); ctx.lineTo(tapP[0] + Math.cos(an) * .11, tapP[1] + Math.sin(an) * .11); ctx.stroke(); } }
}, { notes: 'A kid scoots along with his eyes on his phone, heading straight for a lamppost. The man doesn’t stop him or break his own stride: one tap on the handlebar and the kid curves round in front of the post without losing any speed. Past it he pockets the phone, looks back and waves a thank-you.' });

// ---------- 3. Postman ----------
shot('Postman', ...CUT(3), (ctx, t) => {
  skyFill(ctx, '#c9cfd3', '#d8dadb');
  camera(ctx, .5, 1.12, 420);
  brickWall(ctx, -3, 4, .12, 3.5, '#b99d74', { seed: 8 });
  rect(ctx, -3, 0, 7, .12); ctx.fillStyle = '#cfc8bc'; ctx.fill();
  rect(ctx, .6, 0, 1.2, .14); fsb(ctx, '#d8d2c6');
  door(ctx, .75, .14, .9, 2.1, '#3b4a5f', { letterbox: 1, knob: 1 });
  sashWindow(ctx, -2.3, 1.2, .9, 1.4, { wall: '#b99d74' });
  pavement(ctx, -3, 4, -.35, .0, '#bcb6ac', { rows: 1 });
  const slot = [1.2, .14 + 2.1 * .44 + .028];
  // contact plan: each letter is popped back up every .6 s, then tapped into the slot
  const { T_SLIP, T_POPS, T_SLOTS } = MOMENTS('Postman'), P0 = [1.38, 1.0];
  // one-two-three: each letter is popped up once or twice to stagger them, then tapped into the slot
  const plan = [
    { c: [[T_POPS[0], [.95, .78]], [T_SLOTS[0], [1.02, slot[1]]]], flip: 1 },
    { c: [[T_POPS[1], [.82, .76]], [T_POPS[3], [.88, .8]], [T_SLOTS[1], [1.02, slot[1]]]], flip: -1 },
    { c: [[T_POPS[2], [1.1, .8]], [T_POPS[4], [1.05, .82]], [T_SLOTS[2], [1.02, slot[1]]]], flip: 1 },
  ];
  const arcH = (k, n) => k === n - 2 ? .32 : .52; // paper floats: each pop goes about half a metre up
  const letterPos = (L, i, tt) => {
    const c = L.c;
    if (tt < T_SLIP) return null;
    if (tt < c[0][0]) { const u = seg(tt, T_SLIP, c[0][0]); const p0 = add(P0, [i * .05 - .05, i * .03]); return { p: [lerp(p0[0], c[0][1][0], u) + Math.sin(u * 9 + i) * .04 * (1 - u), lerp(p0[1], c[0][1][1], E.i(u))], r: Math.sin(u * 8 + i) * .8 }; }
    for (let k = 0; k < c.length - 1; k++) if (tt < c[k + 1][0]) { const u = seg(tt, c[k][0], c[k + 1][0]); return { p: [lerp(c[k][1][0], c[k + 1][1][0], u) + Math.sin(u * 7 + k) * .015, lerp(c[k][1][1], c[k + 1][1][1], u) + 4 * arcH(k, c.length) * u * (1 - u)], r: L.flip * u * TAU * (k % 2 ? 1 : .5) }; }
    const last = c[c.length - 1];
    if (tt < last[0] + .16) { const u = seg(tt, last[0], last[0] + .16); return { p: mix(last[1], slot, E.o(u)), r: 0, into: u }; }
    return null;
  };
  const hits = []; plan.forEach((L, i) => L.c.forEach(h => hits.push([h[0], h[1], i])));
  hits.sort((a, b) => a[0] - b[0]);
  // the hero: walks up, juggles standing still, walks on
  const hx = kf(t, [[0, -1.35], [.55, -.12, E.o], [2.25, -.08], [3.0, .4, E.i]]);
  const spd = kf(t, [[0, 1], [.45, 1], [.55, .12], [2.25, .12], [2.4, 1]]);
  const d = hx + 1.35;
  // the tip: under each letter just before contact, a short upward flick at contact
  let tipT;
  if (t < hits[0][0] - .12) tipT = mix([.55, .4], add(hits[0][1], [0, -.1]), E.io(seg(t, .35, hits[0][0] - .12)));
  else if (t >= hits[hits.length - 1][0]) tipT = mix(hits[hits.length - 1][1], [slot[0] - .05, slot[1]], E.o(seg(t, hits[hits.length - 1][0], hits[hits.length - 1][0] + .1)));
  else {
    let k = 0; while (k < hits.length - 1 && t >= hits[k + 1][0] - .12) k++;
    const cur = hits[k], nxt = hits[Math.min(k + 1, hits.length - 1)];
    if (t < cur[0]) tipT = mix(add(cur[1], [0, -.14]), add(cur[1], [0, -.02]), E.i(seg(t, cur[0] - .12, cur[0])));
    else if (t < cur[0] + .07) tipT = mix(add(cur[1], [0, -.02]), add(cur[1], [0, .1]), E.o(seg(t, cur[0], cur[0] + .07)));
    else tipT = mix(add(cur[1], [0, .1]), add(nxt[1], [0, -.14]), E.io(seg(t, cur[0] + .07, nxt[0] - .12)));
  }
  const juggle = kf(t, [[.3, 0], [.5, 1, E.o], [2.2, 1], [2.4, 0]]);
  const base = heroSide(ctx, { x: hx, y: 0, measure: 1, legs: legsByDist(d, spd) });
  const aim = aimTip(base, tipT, 1, [.3, -.38]);
  const arms = armsByDist(d, spd); arms.L = { sh: lerp(arms.L.sh, aim.arm.sh, juggle), el: lerp(arms.L.el, aim.arm.el, juggle), wr: 0 };
  arms.R = { sh: lerp(arms.R.sh, -.25, juggle), el: lerp(arms.R.el, .75, juggle), wr: 0 };   // coffee kept low and back, clear of the umbrella hand
  const m = heroSide(ctx, { x: hx, y: 0, measure: 1, legs: legsByDist(d, spd), arms });
  const ang = lerp(-Math.PI / 2 + .15, Math.atan2(tipT[1] - m.handL[1], tipT[0] - m.handL[0]), E.io(juggle));
  // the postman: pushing letters at the stiff letterbox; they slip; he straightens and stares
  const up = kf(t, [[.55, 0], [.85, 1, E.io]]);
  const lookLetter = (() => { let best = null; plan.forEach((L, i) => { const q = letterPos(L, i, t); if (q && (!best || q.p[1] > best[1])) best = q.p; }); return best; })();
  const grabAir = kf(t, [[T_SLIP, 0], [.52, 1], [.62, 0]]);
  const pEx = t < T_SLIP ? { eyes: 'open', mouth: 'flat', lookY: -.5, brow: -.4 } : t < .85 ? { eyes: 'wide', mouth: 'o', brow: 1, lookY: -1 } : t < 2.3 ? { eyes: 'wide', mouth: 'o', brow: 1.4, lookY: lookLetter ? clamp((lookLetter[1] - 1.25) * 3, -1, 1) : 0, lookX: -.4 } : { eyes: 'happy', mouth: 'grin', brow: 1 };
  const capTip = kf(t, [[2.32, 0], [2.47, 1], [2.72, 1], [2.9, 0]]);
  // a dog barks through the letterbox: the flap bangs open, he jolts back and the letters fly out of his hand
  const bark = kf(t, [[T_SLIP - .08, 0], [T_SLIP - .03, 1, E.o], [T_SLIP + .3, 1], [T_SLIP + .42, 0]]);
  const jolt = kf(t, [[T_SLIP - .05, 0], [T_SLIP + .05, 1, E.o], [T_SLIP + .35, .45], [.9, 0, E.io]]);
  const pLean = lerp(.62, 0, up) - jolt * .5;
  const pLegs = [{ th: lerp(.35, .05, up), kn: lerp(.45, .03, up), fa: 0 }, { th: lerp(.2, -.05, up), kn: lerp(.35, .03, up), fa: 0 }];
  const Dp = dims(CAST.postman), pm = personSide(ctx, CAST.postman, { x: 1.95, f: -1, lean: pLean, legs: pLegs, measure: 1 });
  const JNp = add(pm.Sh, [0, -Dp.limbW * .5]), brim = add(pm.head, [-Dp.head * .55, Dp.head * .42]);
  const ikB = ik2((brim[0] - JNp[0]) * -1, brim[1] - JNp[1], Dp.up, Dp.fo);
  const restN = t < T_SLIP ? { sh: 1.2 + Math.sin(t * 20) * .05, el: .15 } : { sh: lerp(1.2, .9, grabAir) - up * .5, el: lerp(.15, .9, grabAir) };
  let nearP = up < 1 ? restN : { sh: .35, el: 1.9 };
  nearP = { sh: lerp(nearP.sh, 2.5, jolt), el: lerp(nearP.el, .5, jolt) };
  nearP = { sh: lerp(nearP.sh, ikB[0], capTip), el: lerp(nearP.el, ikB[1], capTip) };
  const farP = { sh: lerp(lerp(.9, .1, up), 2.2, jolt), el: lerp(lerp(.2, .3, up), .6, jolt) };
  const pEx2 = jolt > .3 && t < .85 ? { eyes: 'wide', mouth: 'o', brow: 1.7, lookY: -.3 } : pEx;
  personSide(ctx, CAST.postman, {
    x: 1.95, f: -1, lean: pLean, nod: lerp(.3, 0, up) - jolt * .2 + (t > 2.3 ? .1 * capTip : 0),
    legs: pLegs,
    arms: { near: nearP, far: farP }, ex: pEx2,
    hold: { near: (c, w) => { if (t < T_SLIP) { [0, 1, 2].forEach(k => letter(c, w[0] - .05 + k * .015, w[1] + .02 + k * .01, .3, 1.15)); } } },
    mid: (c, o) => { c.beginPath(); c.moveTo(o.Sh[0] + .06, o.Sh[1] - .02); c.lineTo(o.Hp[0] - .04, o.Hp[1] + .02); st(c, OLW * 3, '#5e4128'); rrect(c, o.Hp[0] - .12, o.Hp[1] - .12, .28, .26, .03); fs(c, '#7d5a3a'); P(c, [[o.Hp[0] - .12, o.Hp[1] + .14], [o.Hp[0] + .16, o.Hp[1] + .14], [o.Hp[0] + .16, o.Hp[1] + .06], [o.Hp[0] - .12, o.Hp[1] + .06]]); fs(c, '#6a4b30'); },
  });
  if (bark > .01) {
    // the flap thrown open, a bark coming out of the slot
    rrect(ctx, slot[0] - .1, slot[1] - .01, .2, .03 + .05 * bark, .005); fs(ctx, '#d8b653', 1.4);
    ctx.save(); ctx.globalAlpha = bark; ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = px(3); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    [-.35, 0, .35].forEach(a => { const d0 = .14, d1 = .34 + .06 * Math.sin(t * 40); ctx.beginPath(); for (let k = 0; k <= 4; k++) { const dd = lerp(d0, d1, k / 4), j = (k % 2 ? .025 : -.025); ctx.lineTo(slot[0] + Math.cos(a) * dd - Math.sin(a) * j, slot[1] + .03 + Math.sin(a) * dd + Math.cos(a) * j); } ctx.stroke(); });
    txt(ctx, 'WOOF!', slot[0] + .05, slot[1] + .33, .16, '#2a2a2a', '900 {S}px "DejaVu Sans", Arial, sans-serif', 'center', .12);
    ctx.restore();
  }
  heroSide(ctx, { x: hx, y: 0, legs: legsByDist(d, spd), arms, umb: { ang }, nod: t > .6 && t < 2.2 ? -.06 : 0, smirk: t > 2.1 ? .6 : 0 });
  // letters in front (big enough to read on a phone)
  plan.forEach((L, i) => {
    const q = letterPos(L, i, t); if (!q) return;
    ctx.save();
    if (q.into != null) { rect(ctx, -3, -1, slot[0] - .02 + 3, 5); ctx.clip(); }
    letter(ctx, q.p[0], q.p[1], q.r, 1.25);
    ctx.restore();
  });
  const flap = Math.max(...plan.map(L => { const ti = L.c[L.c.length - 1][0] + .12; return kf(t, [[ti - .06, 0], [ti, 1, E.o], [ti + .16, 0, E.back]]); }));
  if (flap > .01) { rrect(ctx, slot[0] - .1, slot[1] - .01, .2, .03 + flap * .035, .005); fs(ctx, '#d8b653', 1.4); }
  hits.forEach(([ht, hp]) => { if (t > ht && t < ht + .08) { const a = 1 - (t - ht) / .08; ctx.strokeStyle = `rgba(40,40,40,${a})`; ctx.lineWidth = px(2); for (let k = 0; k < 3; k++) { const an = -.6 + k * .6 + Math.PI / 2; ctx.beginPath(); ctx.moveTo(hp[0] + Math.cos(an) * .06, hp[1] - .05 + Math.sin(an) * .06); ctx.lineTo(hp[0] + Math.cos(an) * .1, hp[1] - .05 + Math.sin(an) * .1); ctx.stroke(); } } });
}, { notes: 'A dog barks through the letterbox, the postman jolts back and three letters fly out of his hand. The hero pops them up with quick flicks of the tip to stagger them and taps them into the slot, one, two, three. The postman straightens up, stares, and tips his cap.' });

// ---------- 4. Pigeon: aimed at his head, sent into the planter ----------
shot('Pigeon', ...CUT(4), (ctx, t) => {
  skyFill(ctx, '#c6cdd2', '#d6d9da');
  const cx = lerp(-.25, .75, E.sine(seg(t, 0, 3.5)));
  camera(ctx, cx, 1.47, 330);
  stoneWall(ctx, -4, 5, .1, 4, '#d3cabb', { seed: 12 });
  rect(ctx, -3.2, .35, 5.6, 2.3); fsb(ctx, '#2f4a3f');
  const g = ctx.createLinearGradient(-3, .5, 2, 2.5); g.addColorStop(0, '#5f7582'); g.addColorStop(.45, '#8ea3ae'); g.addColorStop(.5, '#b4c4cc'); g.addColorStop(.56, '#8ea3ae'); g.addColorStop(1, '#6d828e');
  rect(ctx, -3.05, .5, 5.3, 2.0); ctx.fillStyle = g; ctx.fill();
  const rb = rng(31); for (let x = -2.9; x < 2.1; x += .07) { const hh = .2 + rb() * .12; rect(ctx, x, .62, .055, hh); ctx.fillStyle = ['#8a5a4a', '#5a6a7a', '#a88a5a', '#6a7a5a'][Math.floor(rb() * 4)]; ctx.globalAlpha = .5; ctx.fill(); ctx.globalAlpha = 1; }
  ctx.fillStyle = 'rgba(255,255,255,.22)'; P(ctx, [[-1.6, 2.5], [-1.2, 2.5], [-2.2, .5], [-2.6, .5]]); ctx.fill(); P(ctx, [[.9, 2.5], [1.05, 2.5], [.1, .5], [-.05, .5]]); ctx.fill();
  rect(ctx, -3.2, 2.65, 5.6, .45); fsb(ctx, '#2f4a3f');
  txt(ctx, 'SECOND-HAND BOOKS', -.4, 2.87, .2, '#e8dcb8', '700 {S}px Georgia, "DejaVu Serif", serif');
  pavement(ctx, -4, 5, -.4, .1, '#beb8ae', { rows: 1, slab: 1.0 });
  const { T_REL, T_HIT, T_LAND } = MOMENTS('Pigeon');
  const PL = [1.9, .1], soil = [1.84, PL[1] + .57];
  planterTree(ctx, PL[0], PL[1], { onSoil: (c, q) => { if (t > T_LAND) { const u = E.o(seg(t, T_LAND, T_LAND + .1)); ell(c, q[0] - .06, q[1] + .015, .14 * u + .01, .04 * u + .004); fs(c, '#efece2', OLW * .7); ell(c, q[0] - .06, q[1] + .018, .055 * u, .016 * u); c.fillStyle = 'rgba(100,104,72,.8)'; c.fill(); } } });
  if (t > T_LAND && t < T_LAND + .35) { const u = seg(t, T_LAND, T_LAND + .35), r = rng(3); ctx.fillStyle = `rgba(80,58,40,${1 - u})`; for (let k = 0; k < 12; k++) { const a = Math.PI * (.1 + .8 * r()); circ(ctx, soil[0] - .06 + Math.cos(a) * u * .26, soil[1] + Math.sin(a) * u * .24 - u * u * .25, .018); ctx.fill(); } }
  // ---- hero ----
  const hy = -.15, HX = tt => -1.05 + 1.0 * tt;
  const pose = tt => {
    const hx = HX(tt), hd = hx + 1.05;
    const legs = legsByDist(hd * .95), arms = armsByDist(hd * .95);
    const base = heroSide(ctx, { x: hx, y: hy, measure: 1, legs });
    const up = kf(tt, [[1.08, 0], [1.3, 1, E.o], [1.75, 1], [2.15, 0]]);
    const ik = heroArmIK(base.Sh, add(base.Sh, [.42, .05]), 1);   // hand well out in front, so the shaft rises clear of his face
    arms.L = { sh: lerp(arms.L.sh, ik.sh, up), el: lerp(arms.L.el, ik.el, up), wr: 0 };
    // umbrella up over his head, tip just above his hair in the dropping's path; a gentle tap forward
    const ang = kf(tt, [[1.08, -Math.PI / 2 + .15], [1.3, 1.86, E.o], [T_HIT - .04, 1.84], [T_HIT + .1, 1.62, E.o], [1.75, 1.35], [2.15, -Math.PI / 2 + .15, E.io]]);
    return { x: hx, y: hy, legs, arms, ang, nod: kf(tt, [[1.0, 0], [1.1, -.3], [T_HIT + .05, -.3], [1.7, .05], [2.25, .2], [2.6, 0]]), base };
  };
  const tipAt = tt => { const q = pose(tt); const m = heroSide(ctx, { x: q.x, y: q.y, measure: 1, legs: q.legs, arms: q.arms }); return umbTip(m.handL, q.ang); };
  const hitP = tipAt(T_HIT);
  const q = pose(t);
  if (t >= T_HIT) HS.tip = 1;
  heroSide(ctx, { x: q.x, y: q.y, legs: q.legs, arms: q.arms, umb: { ang: q.ang }, nod: q.nod, brow: t > 1.05 && t < 1.6 ? .9 : t > 2.2 && t < 2.7 ? -.6 : 0, mouth: t > 2.2 && t < 2.7 ? -.5 : 0 });
  // ---- the pigeon: over from behind, releases with a lead so it would land on his head ----
  // after letting go it glides on and lands on top of the planter tree, right above where its dropping ends up
  const flyP = tt => [-.95 + 3.6 * (tt - T_REL), 2.9 + .04 * Math.sin(9 * tt)];
  const LANDP = [PL[0] + .03, PL[1] + 2.45], T_PERCH = 1.8;
  const pig = tt => tt < 1.15 ? flyP(tt) : (() => { const u = E.o(seg(tt, 1.15, T_PERCH)), a = flyP(1.15); return [lerp(a[0], LANDP[0], u), lerp(a[1], LANDP[1], u) + Math.sin(Math.PI * u) * .12]; })();
  const pp = pig(t);
  if (t < T_PERCH) pigeon(ctx, pp[0], pp[1] - .14, 1, { flap: t * lerp(6.5, 9, seg(t, 1.4, T_PERCH)), sc: 1.35 });
  else {
    // it watches its dropping land in the soil, then turns and glares at him
    const watch = t < 2.3, glare = t >= 2.3;
    pigeon(ctx, LANDP[0], LANDP[1], 1, { sc: lerp(1.35, 1.75, E.io(seg(t, T_PERCH, T_PERCH + .25))), peck: watch ? .55 * E.o(seg(t, T_PERCH, 1.95)) : .15, look: glare ? -1 : 1, glare: glare ? 1 : 0, headTilt: glare ? -.25 : 0 });
  }
  // where it would have landed: his head at the time it arrives
  const headAt = tt => { const qq = pose(tt), m = heroSide(ctx, { x: qq.x, y: qq.y, measure: 1, legs: qq.legs, arms: qq.arms }); return add(m.Sh, [.057, .3]); };
  if (t > T_REL && t < T_LAND) {
    const R = add(pig(T_REL), [.02, -.1]);
    let dp, trail = [];
    const pre = tt => { const u = seg(tt, T_REL, T_HIT); const target = headAt(T_HIT + .12); return [lerp(R[0], target[0], u), lerp(R[1], hitP[1], u * u * .7 + u * .3)]; };
    const post = tt => { const tau = tt - T_HIT, T = T_LAND - T_HIT, vy0 = (soil[1] - hitP[1] + 4.9 * T * T) / T; return [lerp(hitP[0], soil[0] - .06, tau / T), hitP[1] + vy0 * tau - 4.9 * tau * tau]; };
    const at = tt => tt < T_HIT ? pre(tt) : post(tt);
    dp = at(t);
    [.03, .06, .09, .12, .15].forEach((dt, k) => { if (t - dt > T_REL) { const q2 = at(t - dt); ctx.fillStyle = `rgba(245,243,236,${.6 - k * .11})`; circ(ctx, q2[0], q2[1], .032 - k * .005); ctx.fill(); } });
    if (t < T_HIT) dp[0] = pre(t)[0];
    dropping(ctx, dp[0], dp[1], 0, 2.5);
  }
  if (t > T_HIT && t < T_HIT + .08) { ctx.strokeStyle = '#333'; ctx.lineWidth = px(2.2); for (let k = 0; k < 5; k++) { const an = k * TAU / 5; ctx.beginPath(); ctx.moveTo(hitP[0] + Math.cos(an) * .06, hitP[1] + Math.sin(an) * .06); ctx.lineTo(hitP[0] + Math.cos(an) * .11, hitP[1] + Math.sin(an) * .11); ctx.stroke(); } }
}, { notes: 'The pigeon comes over from behind and lets go with a lead: you see the dropping falling for his head. He glances up, lifts the umbrella over his hair, and taps it on in a neat arc into the planter by the bookshop. The pigeon lands on top of the planter tree, watches its dropping land in the soil, and glares at him. Some of it stays on the tip, and he pulls a face at it.' });

// ---------- 5. Flowerpot + bench: the pigeon had the pot right there, and chose the man instead ----------
shot('Flowerpot', ...CUT(5), (ctx, t) => {
  skyFill(ctx, '#bfc7cd', '#d4d7d8');
  const cx = lerp(.1, .45, E.sine(seg(t, 0, 6)));
  camera(ctx, cx, 1.58, 320);
  HS.tip = 1;
  stoneWall(ctx, -5, 6, 0, 5, '#d6cdbd', { seed: 14, bh: .36, bw: .8 });
  sashWindow(ctx, -.7, 2.52, 1.4, 1.6, { wall: '#d6cdbd', sill: false });
  rect(ctx, -.85, 2.36, 1.7, .09); fsb(ctx, '#e3ddd2'); rect(ctx, -.8, 2.3, 1.6, .06); ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fill();
  sashWindow(ctx, -3.6, 2.52, 1.4, 1.6, { wall: '#d6cdbd', sill: false }); rect(ctx, -3.75, 2.36, 1.7, .09); fsb(ctx, '#e3ddd2');
  sashWindow(ctx, 2.4, 2.52, 1.4, 1.6, { wall: '#d6cdbd', sill: false }); rect(ctx, 2.25, 2.36, 1.7, .09); fsb(ctx, '#e3ddd2');
  railings(ctx, -5, 6, 0, .95, { c: '#23262b' });
  pavement(ctx, -5, 6, -.5, .02, '#bdb7ad', { rows: 1 });
  const r = rng(44); for (let i = 0; i < 12; i++) { const t0 = .05 + r() * .6, u = t - t0; if (u < 0 || u > 1.5) continue; local(ctx, -3 + u * 5.5, 2.2 + r() * 1.2 + Math.sin(u * 6 + i) * .15, u * 7); ell(ctx, 0, 0, .065, .032); fs(ctx, '#b8793b', 1.2); ctx.restore(); }
  // the gust that shoves the pot along the sill
  windStreaks(ctx, t, [[.05, 2.55, -2.8, 1.1, 7.5], [.2, 2.75, -2.8, 1.2, 7.5, .16], [.3, 2.4, -2.9, 1.0, 7.5], [.45, 3.0, -2.8, .9, 7], [.62, 2.6, -2.8, 1.0, 7], [.85, 2.9, -2.8, .8, 6.5]], 1);
  // the man reads on the bench right under the end of the sill
  const BX = .82;
  bench(ctx, BX, .02, { wood: '#7b5b3f' });
  const peek = kf(t, [[4.25, 0], [4.45, 1, E.io], [4.95, 1], [5.15, .1]]);
  const rEx = peek > .5 ? { eyes: 'open', mouth: 'flat', brow: 1.1, lookY: 1, lookX: .1 } : { eyes: 'open', mouth: 'flat', lookY: -.6 };
  const rd = seatedReader(ctx, CAST.reader, BX, .02, { peek, ex: rEx, turn: 0 });
  const readerHead = rd.head;
  // ---- the pot: a gust slides it off the corner, right above the man; the tip catches it ----
  const corner = [.85, 2.45];
  const slide = kf(t, [[.3, 0], [.62, 1, E.i]]);
  const tipA = kf(t, [[.62, 0], [.98, -.7, E.i], [1.1, -.78], [1.62, 0, E.io], [1.72, .05], [1.84, -.02], [1.94, 0]]);
  const drop = kf(t, [[.92, 0], [1.08, .09, E.i], [1.16, .08], [1.5, 0, E.io]]);
  const back = kf(t, [[1.5, 0], [1.9, 1, E.io]]);
  let potRot = 0, potPos = [lerp(.55, .8, slide), 2.45];
  if (t > .62 && t < 1.62) { const c = Math.cos(tipA), s2 = Math.sin(tipA); potPos = [corner[0] + (-.05) * c + drop * .3, corner[1] + (-.05) * s2 - drop]; potRot = tipA; }
  else if (t >= 1.62) { potRot = tipA; potPos = [lerp(.8, .5, back), 2.45]; }
  // ---- the pigeon: flies in, lands on the sill beside the pot, looks at the pot... then at the man ----
  const { T_LAND, T_REL, T_HIT, T_SPLAT } = MOMENTS('Flowerpot');
  const PERCH = [.78, 2.45];
  const pigFly = tt => { const u = seg(tt, 1.95, T_LAND); return [lerp(3.4, PERCH[0], E.o(u)), lerp(3.0, PERCH[1], E.o(u)) + Math.sin(Math.PI * u) * .1]; };
  // ---- hero ----
  const hx = kf(t, [[0, -2.0], [.95, .02, E.o], [4.7, .05], [6.0, 1.0, E.i]]);
  const spd = kf(t, [[0, 1], [.8, 1], [.95, .15], [4.65, .15], [4.85, 1]]);
  const d = hx + 2.0;
  const pose = tt => {
    const hx2 = kf(tt, [[0, -2.0], [.95, .02, E.o], [4.7, .05], [6.0, 1.0, E.i]]), sp2 = kf(tt, [[0, 1], [.8, 1], [.95, .15], [4.65, .15], [4.85, 1]]), d2 = hx2 + 2.0;
    const legs = legsByDist(d2, sp2), arms = armsByDist(d2, sp2);
    const base = heroSide(ctx, { x: hx2, y: -.1, measure: 1, legs });
    // (a) the pot
    const reach = kf(tt, [[.72, 0], [1.02, 1, E.o]]);
    const cT = Math.cos(tipA), sT = Math.sin(tipA);
    const potTip = tt < 1.62 ? [potPos[0] + .1 * cT, potPos[1] + .1 * sT - .01] : [potPos[0] + .1, potPos[1] - .01];
    const uAng = 1.2, ikP = heroArmIK(base.Sh, [potTip[0] - UL * Math.cos(uAng), potTip[1] - UL * Math.sin(uAng)], 1);
    let arm = { sh: lerp(arms.L.sh, ikP.sh, reach), el: lerp(arms.L.el, ikP.el, reach), wr: 0 };
    let ang = lerp(-Math.PI / 2 + .15, uAng, E.io(reach));
    // then up onto his shoulder (never swept across the man's paper)
    const sik = heroArmIK(base.Sh, add(base.Sh, [.24, -.2]), 1), ws1 = E.io(seg(tt, 1.9, 2.3));
    arm = { sh: lerp(arm.sh, sik.sh, ws1), el: lerp(arm.el, sik.el, ws1), wr: 0 };
    ang = lerp(ang, Math.PI / 2 - .3, ws1);
    // (b) over the man's head, then straight back up at the pigeon
    const guard = [readerHead[0] - .02, readerHead[1] + .36];
    const tipB = tt < T_HIT - .08 ? add(guard, [-.05, -.03]) : tt < T_HIT ? mix(add(guard, [-.05, -.03]), guard, E.i(seg(tt, T_HIT - .08, T_HIT))) : mix(guard, add(guard, [-.05, .32]), E.o(seg(tt, T_HIT, T_HIT + .1)));
    const aim = aimTip(base, tipB, 1, [.3, -.25]);
    const kB = kf(tt, [[3.08, 0], [3.4, 1, E.io]]);
    arm = { sh: lerp(arm.sh, aim.arm.sh, kB), el: lerp(arm.el, aim.arm.el, kB), wr: 0 };
    const mB = heroSide(ctx, { x: hx2, y: -.1, measure: 1, legs, arms: Object.assign({}, arms, { L: arm }) });
    ang = lerp(ang, Math.atan2(tipB[1] - mB.handL[1], tipB[0] - mB.handL[0]), E.io(kB));
    // (c) onto his shoulder, clear of the man
    const ws = E.io(seg(tt, T_HIT + .15, 4.3));
    arm = { sh: lerp(arm.sh, sik.sh, ws), el: lerp(arm.el, sik.el, ws), wr: 0 };
    ang = lerp(ang, Math.PI / 2 - .3, ws);
    arms.L = arm;
    arms.R = blendArm(arms.R, CUP_LOW, kf(tt, [[.7, 0], [.9, 1, E.io], [4.6, 1], [4.85, 0, E.io]]));   // coffee low while the umbrella is up
    const m = heroSide(ctx, { x: hx2, y: -.1, measure: 1, legs, arms });
    return { x: hx2, y: -.1, legs, arms, ang, m };
  };
  const qH = pose(T_HIT), hitP = umbTip(qH.m.handL, qH.ang);
  const q = pose(t);
  HS.tip = t < 1.0 ? 1 : t < T_HIT ? 0 : 1;
  const watchPig = t > 2.2 && t < 3.1;
  heroSide(ctx, { x: q.x, y: q.y, legs: q.legs, arms: q.arms, umb: { ang: q.ang }, hairWind: t < 1.6 ? -.25 : 0, nod: t > .7 && t < 1.9 ? -.25 : watchPig ? -.35 : t > 3.1 && t < 3.7 ? -.2 : 0, brow: (t > .8 && t < 1.2) || (t > 2.9 && t < 3.3) ? 1 : 0, smirk: t > 3.8 && t < 4.8 ? .6 : 0 });
  // the dirty tip leaves its dropping on the pot where it touches it
  geraniumPot(ctx, potPos[0], potPos[1], potRot, { smear: E.o(seg(t, 1.0, 1.08)) });
  // pigeon
  if (t > 1.95) {
    if (t < T_LAND) { const p = pigFly(t); pigeon(ctx, p[0], p[1], -1, { flap: t * lerp(6, 10, seg(t, 2.2, T_LAND)), sc: 1.6 }); }
    else if (t < T_SPLAT) {
      // looks at the pot (it knows what pots are for now)... then down at the man... lifts its tail
      const atPot = t < 2.95, atMan = t >= 2.95;
      const lean = kf(t, [[2.95, 0], [3.08, 1, E.o]]), lift = kf(t, [[3.02, 0], [3.12, 1], [3.2, 0]]);
      // at the pot: faces it and peers in; at the man: turns round and leans out over the edge
      pigeon(ctx, PERCH[0] + lean * .04, PERCH[1], atMan ? 1 : -1, { sc: 1.6, peck: atPot ? .7 * E.o(seg(t, T_LAND, 2.7)) : .8, rot: atMan ? -.35 * lean - lift * .12 : 0 });
    } else {
      // hit: a stunned beat on the sill with its own dropping on its head, then off in a flurry
      const u0 = t - T_SPLAT, stun = u0 < .22, u = Math.max(0, u0 - .22), wob = stun ? Math.sin(u0 * 40) * .12 : Math.sin(u * 30) * .4 * Math.exp(-u * 4);
      if (stun) { const sq = 1 - .15 * Math.exp(-u0 * 20); ctx.save(); ctx.translate(PERCH[0], PERCH[1]); ctx.scale(1 + (1 - sq), sq); ctx.translate(-PERCH[0], -PERCH[1]); pigeon(ctx, PERCH[0], PERCH[1], 1, { sc: 1.6, splat: 1.4, rot: wob, glare: 1 }); ctx.restore(); }
      else pigeon(ctx, PERCH[0] + u * 1.2, PERCH[1] + u * u * 1.6 + (u > .05 ? .1 : 0), 1, { flap: t * 12, rot: wob, splat: 1.4, sc: 1.6 });
      if (u0 < .22) { const a = 1 - u0 / .22, c0 = [PERCH[0] + .02, PERCH[1] + .22]; ctx.fillStyle = `rgba(246,244,236,${a})`; for (let k = 0; k < 9; k++) { const an = k * TAU / 9 + .3, d = .08 + u0 * 1.2; circ(ctx, c0[0] + Math.cos(an) * d, c0[1] + Math.sin(an) * d * .8, .018); ctx.fill(); } ctx.strokeStyle = `rgba(40,40,40,${a})`; ctx.lineWidth = px(2.6); for (let k = 0; k < 6; k++) { const an = k * TAU / 6; ctx.beginPath(); ctx.moveTo(c0[0] + Math.cos(an) * .16, c0[1] + Math.sin(an) * .16); ctx.lineTo(c0[0] + Math.cos(an) * .24, c0[1] + Math.sin(an) * .24); ctx.stroke(); } }
      if (u > 0 && u < .6) for (let k = 0; k < 6; k++) { local(ctx, PERCH[0] + (k - 2.5) * .07 + u * .1, PERCH[1] + .12 - u * .45 * (1 + k * .25), u * 6 + k); ctx.beginPath(); ctx.moveTo(-.035, 0); ctx.quadraticCurveTo(0, .016, .035, 0); ctx.quadraticCurveTo(0, -.012, -.035, 0); fs(ctx, k % 2 ? '#aab2bf' : '#8a93a3', OLW * .5); ctx.restore(); }
    }
  }
  // the dropping: straight down at the man, then straight back up
  if (t > T_REL && t < T_SPLAT) {
    const R = [PERCH[0] - .08, PERCH[1] + .06];
    const at = tt => tt < T_HIT ? (() => { const u = seg(tt, T_REL, T_HIT); return [lerp(R[0], hitP[0], u), lerp(R[1], hitP[1], u * u)]; })() : (() => { const u = seg(tt, T_HIT, T_SPLAT); return [lerp(hitP[0], PERCH[0] + .02, u), lerp(hitP[1], PERCH[1] + .16, E.o(u))]; })();
    const dp = at(t);
    [.03, .06, .09, .12, .15].forEach((dt, k) => { if (t - dt > T_REL) { const q2 = at(t - dt); ctx.fillStyle = `rgba(245,243,236,${.6 - k * .11})`; circ(ctx, q2[0], q2[1], .034 - k * .005); ctx.fill(); } });
    dropping(ctx, dp[0], dp[1], 0, 2.5);
  }
  if (t > T_HIT && t < T_HIT + .08) { ctx.strokeStyle = '#333'; ctx.lineWidth = px(2.2); for (let k = 0; k < 5; k++) { const an = k * TAU / 5; ctx.beginPath(); ctx.moveTo(hitP[0] + Math.cos(an) * .06, hitP[1] + Math.sin(an) * .06); ctx.lineTo(hitP[0] + Math.cos(an) * .11, hitP[1] + Math.sin(an) * .11); ctx.stroke(); } }
}, { notes: 'A gust slides the geranium off the end of the sill, straight above a man reading on a bench; the tip catches it and pushes it home. Then the same pigeon lands on the sill right next to that pot, looks at the pot, looks down at the man, and drops one on him anyway. This time it isn’t aimed at the hero and there was a pot right there, so he flicks it straight back up onto the pigeon.' });
