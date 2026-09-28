// ===== shots 12-20 =====

// ---------- 12. Painter ----------
function specs(ctx, x, y, r, sc = 1) {
  local(ctx, x, y, r, sc);
  ctx.lineWidth = px(3.2 * sc); ctx.strokeStyle = '#2b2622';
  ctx.fillStyle = 'rgba(205,225,238,.55)'; circ(ctx, -.025, 0, .02); ctx.fill(); circ(ctx, .025, 0, .02); ctx.fill();
  ctx.beginPath(); ctx.arc(-.025, 0, .02, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(.025, 0, .02, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-.006, .004); ctx.lineTo(.006, .004); ctx.moveTo(-.045, .004); ctx.lineTo(-.075, .014); ctx.moveTo(.045, .004); ctx.lineTo(.075, .014); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.9)'; circ(ctx, -.032, .007, .005); ctx.fill(); circ(ctx, .018, .007, .005); ctx.fill();
  ctx.restore();
}
function sparkle(ctx, p, r, a = 1) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#fffbe6';
  P(ctx, [[p[0] - r, p[1]], [p[0] - r * .18, p[1] + r * .18], [p[0], p[1] + r], [p[0] + r * .18, p[1] + r * .18], [p[0] + r, p[1]], [p[0] + r * .18, p[1] - r * .18], [p[0], p[1] - r], [p[0] - r * .18, p[1] - r * .18]]); ctx.fill();
  ctx.restore();
}
shot('Painter', ...CUT(11), (ctx, t) => {
  HS.leg = 1; // the trouser smear from the butcher's shop, until the taxi water washes it
  
  skyFill(ctx, '#c3cbd1', '#dde0df');
  camera(ctx, .1, 1.15, 430);
  // the real view
  distantCity(ctx, -4, -.5, 1.02, '#bcc3c8', 3, 1.3);
  parliament(ctx, .9, 1.02, .2, LDN.bldg, { tower: '#b9a27a', face: LDN.white });
  rect(ctx, -4, .8, 9, .24); ctx.fillStyle = '#a7b6be'; ctx.fill();
  fogBand(ctx, -4, 5, .8, 2.6, '#dfe2e1', .28, 0);
  stoneWall(ctx, -4, 5, .12, .98, '#cbc3b3', { bh: .43, bw: 1.2, seed: 5 });
  rect(ctx, -4, .98, 9, .08); fsb(ctx, '#ddd6c8');
  pavement(ctx, -4, 5, -.45, .12, '#c0bab0', { rows: 1, slab: 1.2 });
  const G0 = [-.8, .045];
  const T_REACH = 1.2, T_FLICK = 1.5, T_ON = 1.92;
  const S_SKY = [2.72, 3.05], S_RIV = [3.1, 3.32], S_BLD = [3.38, 3.7], S_TWR = [3.76, 4.0], S_CLK = [4.05, 4.14];
  // --- painter pose (needed early for the glasses' landing spot)
  const startle = kf(t, [[T_ON, 0], [T_ON + .07, 1, E.o], [2.15, .7], [2.3, 0]]);
  const squint = t < T_ON ? 1 : 0;
  const admire = kf(t, [[4.15, 0], [4.35, 1, E.io]]);
  const lean = squint ? .46 : .08 - startle * .22 - admire * .12;
  const hipY = .52 + startle * .045;
  const Sh = [-.35 + Math.sin(lean) * .516, hipY + Math.cos(lean) * .516], J = [Sh[0], Sh[1] - .043];
  const eyeAt = [Sh[0] + .06, Sh[1] + .168];
  // --- hero (upstage): walks in behind the painter, sees the glasses, flicks them onto his nose, walks on behind the easel
  const hz = .16, hx = kf(t, [[0, -2.6], [1.0, -1.28, E.o]]);
  const hspd = kf(t, [[0, 1], [.85, 1], [1.0, .1]]);
  const hd = hx + 2.6;
  const bow = kf(t, [[1.05, 0], [1.35, 1, E.io], [1.56, 1], [1.8, 0, E.io]]);
  const hLean = -.03 + bow * .3;
  const legsH = legsByDist(hd, hspd).map(l => ({ th: l.th + bow * .12, kn: l.kn + bow * .25, fa: l.fa }));
  const base = heroSide(ctx, { x: hx, y: hz, measure: 1, legs: legsH, lean: hLean });
  const tipT = t < T_REACH ? mix(add(G0, [-.3, .45]), add(G0, [-.07, .02]), E.io(seg(t, 1.05, T_REACH))) : t < T_FLICK ? mix(add(G0, [-.07, .02]), add(G0, [.0, .012]), E.io(seg(t, T_REACH, T_FLICK))) : mix(add(G0, [.0, .012]), add(G0, [.14, .5]), E.o(seg(t, T_FLICK, T_FLICK + .1)));
  const aim = aimTip(base, tipT, 1, [.3, -.45]);
  const arms = armsByDist(hd, hspd);
  arms.L = { sh: lerp(arms.L.sh, aim.arm.sh, bow), el: lerp(arms.L.el, aim.arm.el, bow), wr: 0 };
  const low = kf(t, [[.9, 0], [1.05, 1, E.io], [2.0, 1], [2.3, 0, E.io]]); arms.R = blendArm(arms.R, CUP_HIGH, low);   // coffee held up in front while the umbrella hand works low
  const m = heroSide(ctx, { x: hx, y: hz, measure: 1, legs: legsH, lean: hLean, arms });
  const ang = lerp(-Math.PI / 2 + Math.sin(TAU * hd / (2 * STRIDE())) * .1, Math.atan2(tipT[1] - m.handL[1], tipT[0] - m.handL[0]), E.io(bow));
  const sipT = kf(t, [[3.2, 0], [3.45, 1, E.io], [3.75, 1], [3.95, 0, E.io]]);
  const lookDown = t > .95 && t < 1.6;
  heroSide(ctx, { x: hx, y: hz, legs: legsH, lean: hLean, arms, umb: { ang }, sipT, nod: lookDown ? .35 : t > 4.2 && t < 4.4 ? .2 : 0, smirk: t > 2.1 ? .6 : 0 });
  // the glasses lying on the pavement behind the stool (a glint now and then), until flicked
  if (t < T_FLICK) { const gl = G0; specs(ctx, gl[0], gl[1], 0, 2.2); const ph = (t % .7) / .7; sparkle(ctx, [gl[0] + .04, gl[1] + .04], .12 * Math.sin(Math.PI * clamp(ph * 3)), 1); }
  // easel + canvas
  easel(ctx, .8, 0);
  const cx0 = .37, cy0 = .8, cw = .84, ch = .64;
  const Cv = (u, v) => [cx0 + u * cw, cy0 + v * ch];
  const pr = { sky: E.io(seg(t, ...S_SKY)), river: E.io(seg(t, ...S_RIV)), bldg: seg(t, ...S_BLD), tower: seg(t, ...S_TWR), clock: E.o(seg(t, ...S_CLK)) };
  canvasLondon(ctx, cx0, cy0, cw, ch, pr);
  // stool
  P(ctx, [[-.55, 0], [-.2, .48], [-.17, .48], [-.52, 0]]); ctx.fillStyle = '#6d5a48'; ctx.fill(); P(ctx, [[-.2, 0], [-.55, .48], [-.52, .48], [-.17, 0]]); ctx.fill(); rect(ctx, -.6, .46, .45, .05); fs(ctx, '#8a6d52', 1.4);
  // --- brush path
  const farA = { sh: .5, el: 1.5 };
  const fEl = add(J, dn(farA.sh), .2924), fWr = add(fEl, dn(farA.sh + farA.el), .2752);
  const blob = { grass: [-.1, .0], tree: [-.075, .035], trunk: [-.04, -.03], sky: [-.03, .05], river: [.015, .052], bldg: [.06, .045], gold: [.1, .022], dark: [.045, -.028], white: [.005, -.035] };
  const PAL = Object.assign({}, PARK, LDN);
  const B = k => add(fWr, blob[k]);
  const zig = (sg, u0, u1, v0, v1, n) => { const u = seg(t, ...sg); return Cv(lerp(u0, u1, u), lerp(v0, v1, .5 + .5 * Math.sin(u * n * TAU))); };
  const chin = [Sh[0] + .07, Sh[1] + .1];
  let tip, load = 'tree';
  if (t < T_ON) tip = add(Cv(.25, .47), [Math.sin(t * 17) * .015, Math.cos(t * 13) * .012]);
  else if (t < 2.3) tip = mix(Cv(.25, .47), add(Cv(.1, .7), [-.14, .06]), E.o(seg(t, T_ON, T_ON + .12)));
  else if (t < 2.55) tip = mix(add(Cv(.1, .7), [-.14, .06]), add(chin, [0, Math.sin(t * 16) * .006 * (t > 2.4 ? 1 : 0)]), E.io(seg(t, 2.3, 2.4)));
  else if (t < S_SKY[0]) { load = t > 2.64 ? 'sky' : 'tree'; tip = t < 2.64 ? mix(chin, B('sky'), E.io(seg(t, 2.55, 2.64))) : mix(B('sky'), Cv(.03, .85), E.io(seg(t, 2.64, S_SKY[0]))); }
  else if (t < S_SKY[1]) { load = 'sky'; tip = zig(S_SKY, .03, .97, .45, .93, 3); }
  else if (t < S_RIV[0]) { load = t > 3.075 ? 'river' : 'sky'; tip = t < 3.075 ? mix(Cv(.97, .7), B('river'), E.io(seg(t, S_SKY[1], 3.075))) : mix(B('river'), Cv(.03, .15), E.io(seg(t, 3.075, S_RIV[0]))); }
  else if (t < S_RIV[1]) { load = 'river'; tip = zig(S_RIV, .03, .97, .06, .26, 2.5); }
  else if (t < S_BLD[0]) { load = t > 3.35 ? 'bldg' : 'river'; tip = t < 3.35 ? mix(Cv(.97, .15), B('bldg'), E.io(seg(t, S_RIV[1], 3.35))) : mix(B('bldg'), Cv(.03, .4), E.io(seg(t, 3.35, S_BLD[0]))); }
  else if (t < S_BLD[1]) { load = 'bldg'; tip = zig(S_BLD, .03, .72, .33, .5, 4); }
  else if (t < S_TWR[0]) { load = t > 3.73 ? 'gold' : 'bldg'; tip = t < 3.73 ? mix(Cv(.72, .45), B('gold'), E.io(seg(t, S_BLD[1], 3.73))) : mix(B('gold'), Cv(.76, .31), E.io(seg(t, 3.73, S_TWR[0]))); }
  else if (t < S_TWR[1]) { load = 'gold'; const u = seg(t, ...S_TWR); tip = Cv(.745 + .03 * Math.sin(u * 5 * TAU), lerp(.31, .97, u)); }
  else if (t < S_CLK[0]) { load = t > 4.025 ? 'white' : 'gold'; tip = t < 4.025 ? mix(Cv(.76, .95), B('white'), E.io(seg(t, S_TWR[1], 4.025))) : mix(B('white'), Cv(.76, .735), E.io(seg(t, 4.025, S_CLK[0]))); }
  else { load = 'white'; tip = add(Cv(.76, .735), [0, Math.sin(t * 40) * .004]); }
  if (t > S_CLK[1]) tip = mix(Cv(.76, .735), add(Cv(.9, .5), [.08, -.12]), E.o(seg(t, S_CLK[1], S_CLK[1] + .15)));
  const handT = add(tip, [-.085, -.055]);
  const ikp = ik2(handT[0] - J[0], handT[1] - J[1], .2924, .2752);
  const glance = (t > 3.32 && t < 3.4) || (t > 3.7 && t < 3.78) ? 1 : 0;
  const pEx = t < T_ON ? { eyes: 'closed', mouth: 'flat', brow: -.9 }
    : t < 2.3 ? { eyes: 'wide', mouth: 'o', brow: 1.4, lookY: 1 }
    : t < 2.55 ? { eyes: 'open', mouth: 'flat', brow: -.4, lookY: t < 2.42 ? -.4 : .8 }
    : t < 2.7 ? { eyes: 'happy', mouth: 'grin', brow: .6 }
    : t < 4.15 ? { eyes: 'open', mouth: 'smile', brow: .3, lookY: glance ? 1 : -.2 }
    : { eyes: 'happy', mouth: 'grin', brow: .5 };
  const nod = t < T_ON ? .22 : t < 2.3 ? -.42 : t < 2.55 ? (t < 2.42 ? .05 : -.3) : t < 2.7 ? lerp(-.2, 0, seg(t, 2.55, 2.7)) : t < 4.15 ? (glance ? -.3 : .05) : -.1;
  personSide(ctx, CAST.painter, { x: -.35, hipY, f: 1, legs: [{ th: 1.45, kn: 1.5, fa: 0 }, { th: 1.35, kn: 1.4, fa: 0 }], lean, arms: { near: { sh: ikp[0], el: ikp[1] }, far: farA }, ex: pEx, nod,
    post: (c, out) => {
      // squint lines without glasses; big glasses on his nose once they land
      if (t < T_ON) { const e = add(out.head, [.05, .015]); c.strokeStyle = INK; c.lineWidth = px(1.6); c.beginPath(); c.moveTo(e[0] + .03, e[1] + .02); c.lineTo(e[0] + .05, e[1] + .035); c.moveTo(e[0] + .03, e[1] - .005); c.lineTo(e[0] + .055, e[1] - .01); c.stroke(); }
      else { const hc = out.head, a = -(nod) ; local(c, hc[0], hc[1], a); const e = [.05, .014]; c.fillStyle = 'rgba(205,225,238,.55)'; circ(c, e[0] + .012, e[1], .034); c.fill(); c.lineWidth = px(3.4); c.strokeStyle = '#2b2622'; c.beginPath(); c.arc(e[0] + .012, e[1], .034, 0, TAU); c.stroke(); c.beginPath(); c.moveTo(e[0] - .022, e[1] + .006); c.lineTo(-.05, e[1] + .012); c.stroke(); c.fillStyle = 'rgba(255,255,255,.9)'; circ(c, e[0] + .002, e[1] + .012, .007); c.fill(); c.restore(); }
    },
    hold: {
      near: (c, w) => { seg2(c, w, add(w, [.08, .05]), 3, '#8a6a4a'); circ(c, w[0] + .085, w[1] + .055, .012); c.fillStyle = PAL[load]; c.fill(); c.lineWidth = px(1); c.strokeStyle = INK; c.stroke(); },
      far: (c, w) => {
        ell(c, w[0], w[1] + .01, .155, .085, .15); fs(c, '#c9a77a', 1.6); ell(c, w[0] - .115, w[1] + .02, .014, .018, .2); c.fillStyle = '#6d5a48'; c.fill();
        Object.keys(blob).forEach(k => { const q = add(w, blob[k]); ell(c, q[0], q[1], .017, .012, .3); c.fillStyle = PAL[k]; c.fill(); c.lineWidth = px(.8); c.strokeStyle = 'rgba(40,30,20,.5)'; c.stroke(); });
      }
    } });
  // glasses in flight: up over his head and onto his nose, spinning
  if (t >= T_FLICK && t < T_ON) { const u = seg(t, T_FLICK, T_ON); const x = lerp(G0[0], eyeAt[0], u), y = lerp(G0[1], eyeAt[1], u) + Math.sin(Math.PI * u) * .7; specs(ctx, x, y, -TAU * 2 * E.o(u), lerp(2.2, 1.4, u)); }
  if (t > T_ON && t < T_ON + .3) { const hc = [Sh[0] + .02, Sh[1] + .16], a = E.o(seg(t, T_ON, T_ON + .08)); ctx.strokeStyle = INK; ctx.lineWidth = px(2.6); ctx.lineCap = 'round'; [[-.9, .15], [-.35, .17], [.25, .16]].forEach(([an, r]) => { const d = [Math.sin(an), Math.cos(an)]; ctx.beginPath(); ctx.moveTo(hc[0] + d[0] * r * a, hc[1] + d[1] * r * a); ctx.lineTo(hc[0] + d[0] * (r + .06) * a, hc[1] + d[1] * (r + .06) * a); ctx.stroke(); }); }
}, { notes: 'His glasses have fallen behind his stool, so he squints and paints a park he half-remembers. The man, walking up behind him, spots them, flicks them up with the umbrella tip and onto his nose. The painter sees Westminster, startles, looks at his canvas, smiles and paints London over the park from a palette holding every colour on it, while the man stays to watch, sipping.' });

// ---------- 13. Van ----------
shot('Van', ...CUT(12), (ctx, t) => {
  HS.leg = 1; // the trouser smear from the butcher's shop, until the taxi water washes it
  
  skyFill(ctx, '#cdd2d5', '#dddfdf');
  camera(ctx, .15, 1.2, 330);
  ctx.fillStyle = '#d0d3d3'; ctx.fillRect(-6, .3, 12, 4);
  for (let i = 0; i < 11; i++) { rect(ctx, -5.5 + i * 1.1, 1.5, .5, .8); ctx.fillStyle = '#c3c8ca'; ctx.fill(); rect(ctx, -5.5 + i * 1.1, 2.7, .5, .8); ctx.fill(); }
  rect(ctx, -3.2, .3, 1.1, 2.0); ctx.fillStyle = '#9aa3a8'; ctx.fill(); rect(ctx, -3.1, .3, .9, 1.9); ctx.fillStyle = '#6f7a82'; ctx.fill();
  fogBand(ctx, -6, 6, .3, 4, '#e2e3e2', .4, .2);
  road(ctx, -6, 6, .1, .45, '#8a8d90', false);
  const T_CLIMB = [.92, 1.08], T_ENG = 1.15, T_TAP = 1.62, T_HOOK = 1.98, T_SHUT = 2.24, T_GO = 2.55;
  const drive = t > T_GO ? -2.9 * Math.pow(t - T_GO, 2) : 0;
  const vanX = -.1 + drive;
  const engine = t > T_ENG;
  const vib = engine ? .008 * Math.sin(t * 95) * (t < T_GO + .3 ? 1 : .5) : 0;
  const climb = kf(t, [[T_CLIMB[0], 0], [T_CLIMB[0] + .06, -.04, E.o], [T_CLIMB[1] + .05, 0]]);
  const T_REL = T_HOOK + .1;
  const doorAt = tt => kf(tt, [[T_HOOK + .01, 1], [T_SHUT, 0, E.io]]);
  const doorK = doorAt(t);
  const slam = t > T_SHUT ? Math.sin((t - T_SHUT) * 32) * .025 * Math.exp(-(t - T_SHUT) * 8) : 0;
  // the top box creeps out over the edge as the engine shakes the van; the tap puts it back
  const creep = t < T_ENG ? 0 : t < T_TAP ? E.i(seg(t, T_ENG + .05, T_TAP)) : 1 - E.o(seg(t, T_TAP, T_TAP + .1));
  // the driver climbs into the cab from the far side
  // exhaust: a dark burst on start-up, then puffs
  if (engine) {
    const r = rng(5);
    for (let k = 0; k < 10; k++) { const born = T_ENG + (k === 0 ? 0 : .15 + k * .22), u = t - born; if (u < 0 || u > .9) continue; const big = k === 0 ? 3 : 1.4; const cx0 = vanX + 2.62 + u * .5, cy0 = .42 + u * .3, rr = (.05 + u * .16) * big; ctx.fillStyle = `rgba(${k === 0 ? 105 : 130},${k === 0 ? 108 : 134},${k === 0 ? 112 : 138},${(k === 0 ? .55 : .45) * (1 - u / .9)})`; [[0, 0, 1], [-.6, .3, .7], [.55, .35, .75], [.1, .7, .6], [-.3, -.35, .55]].forEach(([dx, dy, f]) => { circ(ctx, cx0 + dx * rr, cy0 + dy * rr, rr * f); ctx.fill(); }); }
    if (t < T_ENG + .3) { const u = seg(t, T_ENG, T_ENG + .3); ctx.strokeStyle = `rgba(60,60,60,${1 - u})`; ctx.lineWidth = px(2.4); for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(vanX + 2.75, .9 + k * .25); ctx.lineTo(vanX + 2.95 + u * .1, .95 + k * .3); ctx.stroke(); } }
  }
  van(ctx, vanX, .3, {
    door: doorK, bounce: climb + vib + slam,
    cab: t > T_CLIMB[0] ? (c) => { const up = E.o(seg(t, T_CLIMB[0], T_CLIMB[1] + .08)); sub(c, -1.55, lerp(1.1, 1.62, up), 0, -.3, .3, () => { faceSide(c, CAST.driver, { eyes: 'open', mouth: 'flat' }); hairSide(c, CAST.driver); }); P(c, [[-1.9, lerp(.8, 1.3, up)], [-1.35, lerp(.8, 1.3, up)], [-1.4, lerp(1.0, 1.48, up)], [-1.75, lerp(1.0, 1.5, up)]]); c.fillStyle = CAST.driver.top; c.fill(); } : null,
    inside: (c, dx0, dx1) => {
      const x0 = dx0, bw = .42, bh = .34, fl = .62;
      box(c, x0 + .3, fl, bw, bh); box(c, x0 + .74, fl, bw, bh);
      box(c, x0 + .3, fl + bh, bw, bh); box(c, x0 + .74, fl + bh, bw, bh);
      box(c, x0 + .3, fl + 2 * bh, bw, bh);
      // the loose one on top of the right stack: tips out towards us (grows, drops, turns)
      const sc = 1 + creep * .3, rot = -creep * .45 + (engine && creep < .95 ? Math.sin(t * 60) * .02 : 0);
      local(c, x0 + .74 + creep * .06, fl + 2 * bh - creep * .1, rot, sc, sc); box(c, 0, 0, bw, bh); c.restore();
    }
  });
  pavement(ctx, -6, 6, -.5, .1, '#c2bcb2', { rows: 1, slab: 1.0 });
  kerb(ctx, -6, 6, .12, .06, '#b3ada4');
  // ---- hero on the pavement in front: stops short of the doorway, taps the box back, then hooks the door shut ----
  const hy = -.2;
  const hx = kf(t, [[0, -3.5], [1.0, -1.45, E.o], [1.72, -1.45], [1.95, -1.1, E.io], [4.0, -1.1]]);
  const spd = kf(t, [[0, 1], [.85, 1], [1.0, .1], [1.72, .1], [1.8, .8], [1.95, .1]]);
  const hd = hx + 3.5;
  const base = heroSide(ctx, { x: hx, y: hy, measure: 1, legs: legsByDist(hd, spd) });
  const boxFace = [vanX - 1.1 + .74 - .19, .3 + .62 + .68 + .2];
  const handleAt = dk => [vanX + lerp(-1.0 + .065, .3 + .065, dk), .3 + 1.2];
  const handle = handleAt(doorK);
  let tipT, k;
  const tapK = kf(t, [[1.4, 0], [1.55, 1, E.io], [T_TAP + .12, 1], [1.8, 0, E.io]]);
  const doorA = kf(t, [[1.8, 0], [T_HOOK - .06, 1, E.io], [T_REL + .12, 1], [T_REL + .4, 0, E.io]]);
  if (t < 1.8) { const back = add(boxFace, [-.1, .02]); tipT = t < T_TAP - .08 ? back : t < T_TAP ? mix(back, add(boxFace, [.02, 0]), E.i(seg(t, T_TAP - .08, T_TAP))) : mix(add(boxFace, [.02, 0]), add(boxFace, [-.18, .05]), E.o(seg(t, T_TAP, T_TAP + .12))); k = tapK; }
  else { const h0 = handleAt(1), pre = add(h0, [.12, .05]); if (t < T_HOOK) tipT = mix(add(h0, [.3, .2]), pre, E.io(seg(t, 1.8, T_HOOK - .06))); else if (t < T_REL) tipT = add(handle, [-.02, 0]); else { const hr = add(handleAt(doorAt(T_REL)), [-.02, 0]); tipT = hr; } k = doorA; }   // after letting go the arm simply lowers (the blend)
  const aim = aimTip(base, tipT, 1, [.3, -.15]);
  const arms = armsByDist(hd, spd);
  arms.L = { sh: lerp(arms.L.sh, aim.arm.sh, k), el: lerp(arms.L.el, aim.arm.el, k), wr: 0 };
  arms.R = blendArm(arms.R, CUP_LOW, kf(t, [[1.3, 0], [1.45, 1, E.io], [2.4, 1], [2.6, 0, E.io]]));   // coffee low while the umbrella works at chest height
  const m = heroSide(ctx, { x: hx, y: hy, measure: 1, legs: legsByDist(hd, spd), arms });
  const ang = lerp(-Math.PI / 2 + Math.sin(TAU * hd / (2 * STRIDE())) * .1 * spd, Math.atan2(tipT[1] - m.handL[1], tipT[0] - m.handL[0]), E.io(k));
  const pullLean = t > T_HOOK && t < T_REL + .25 ? -.1 * Math.sin(Math.PI * seg(t, T_HOOK, T_REL + .25)) : 0;
  const sipT = kf(t, [[2.95, 0], [3.2, 1, E.io], [3.5, 1], [3.7, 0, E.io]]);
  heroSide(ctx, { x: hx, y: hy, legs: legsByDist(hd, spd), arms, umb: { ang }, lean: -.03 + pullLean, sipT, smirk: t > 2.6 ? .6 : 0, nod: t > .6 && t < 1.0 ? -.1 : 0 });
  // tap and slam accents
  const burst = (p, t0, r0) => { if (t > t0 && t < t0 + .16) { const u = seg(t, t0, t0 + .16); ctx.strokeStyle = `rgba(40,40,40,${1 - u})`; ctx.lineWidth = px(2.6); ctx.lineCap = 'round'; for (let q = 0; q < 6; q++) { const a = q * TAU / 6 + .4; ctx.beginPath(); ctx.moveTo(p[0] + Math.cos(a) * r0, p[1] + Math.sin(a) * r0); ctx.lineTo(p[0] + Math.cos(a) * (r0 + .07 + u * .05), p[1] + Math.sin(a) * (r0 + .07 + u * .05)); ctx.stroke(); } } };
  burst(boxFace, T_TAP, .08);
  burst([vanX - 1.02, 1.4], T_SHUT, .15);
}, { notes: 'The driver climbs into the cab from the far side, so he never sees the open side door. The engine coughs, the van shakes, and the top box starts tipping out. The man taps it back, hooks the door handle with the tip and slams the door shut just before the van pulls away, then sips.' });

// ---------- 14. Handbag ----------
shot('Handbag', ...CUT(13), (ctx, t) => {
  HS.leg = 1; // the trouser smear from the butcher's shop, until the taxi water washes it
  skyFill(ctx, '#c9cfd2', '#d9dbdb');
  camera(ctx, .2, 1.1, 420);
  stoneWall(ctx, -3, 4, .2, 3.5, '#d4ccbd', { seed: 29 });
  sashWindow(ctx, -1.6, 1.7, .9, 1.2, { wall: '#d4ccbd' }); sashWindow(ctx, 1.4, 1.7, .9, 1.2, { wall: '#d4ccbd' });
  railings(ctx, -3, 4, .2, .95, { c: '#23262b' });
  pavement(ctx, -3, 4, -.45, .2, '#c1bbb1', { rows: 1 });
  
  const T_YANK = .9, T_HOOK = 1.12, T_LOSE = 1.46, T_TILT = [2.08, 2.2], T_SLIDE = [2.2, 2.58], T_CATCH = 2.6;
  // ---- lady (upstage, right): robbed, jolted, then hurries over for her bag ----
  const lx = kf(t, [[T_YANK, 1.3], [T_YANK + .12, 1.18, E.o], [1.45, 1.2], [2.15, .55, E.io]]);
  const lWalk = t > 1.45 && t < 2.12;
  const jolt = kf(t, [[T_YANK, 0], [T_YANK + .06, 1, E.o], [1.3, 0, E.io]]);
  const Dl = dims(CAST.lady);
  const lm = personSide(ctx, CAST.lady, { x: lx, f: -1, legs: standLegs(.03, .02), lean: jolt * .35, measure: 1 });
  const lJ = add(lm.Sh, [0, -Dl.limbW * .5]);
  const lIK = tgt => { const r = ik2(-(tgt[0] - lJ[0]), tgt[1] - lJ[1], Dl.up, Dl.fo); return { sh: r[0], el: r[1] }; };
  // ---- hero (upstage, left): walks in, stops, holds the umbrella out level at bag height ----
  const hx = kf(t, [[0, -2.8], [.8, -.95, E.o]]), hd = hx + 2.8, spd = kf(t, [[.65, 1], [.8, .1]]);
  const base = heroSide(ctx, { x: hx, y: .05, measure: 1, legs: legsByDist(hd, spd) });
  const guard = kf(t, [[.92, 0], [1.08, 1, E.o], [2.75, 1], [3.0, 0, E.io]]);
  const handG = add(base.Sh, [.32, -.6]);
  const ik = heroArmIK(base.Sh, handG, 1);
  const arms = armsByDist(hd, spd);
  arms.L = { sh: lerp(arms.L.sh, ik.sh, guard), el: lerp(arms.L.el, ik.el, guard), wr: 0 };
  const sipT = kf(t, [[3.15, 0], [3.4, 1, E.io], [3.7, 1], [3.9, 0, E.io]]);
  const m = heroSide(ctx, { x: hx, y: .05, measure: 1, legs: legsByDist(hd, spd), arms });
  const tilt = kf(t, [[T_TILT[0], 0], [T_TILT[1], 1, E.io], [T_CATCH + .1, 1], [2.75, 0, E.io]]);
  const bump = t > T_HOOK && t < T_LOSE + .2 ? -.06 * Math.sin(Math.PI * seg(t, T_HOOK, T_LOSE + .2)) : 0;
  const ua = lerp(-Math.PI / 2 + Math.sin(TAU * hd / (2 * STRIDE())) * .1 * spd, lerp(-.02, -.26, tilt) + bump, guard);
  const drawHeroH = () => heroSide(ctx, { x: hx, y: .05, legs: legsByDist(hd, spd), arms, umb: { ang: ua }, sipT, nod: t > 3.0 && t < 3.15 ? .2 : 0, smirk: t > 2.7 ? .6 : 0 });
  const dir = [Math.cos(ua), Math.sin(ua)], nrm = [-Math.sin(ua), Math.cos(ua)];
  const shaftPt = u => add(m.handL, dir, u);
  // ---- thief (downstage): sprints in, yanks the bag, runs into the shaft, loses it, runs on ----
  const tx = kf(t, [[.5, 3.2], [T_YANK, .98, E.lin], [T_HOOK, -.05, E.lin], [T_LOSE, -.72, E.lin], [1.62, -1.2, E.o], [2.2, -3.2, E.i]]);
  const stumble = kf(t, [[T_LOSE, 0], [T_LOSE + .1, 1], [1.6, .2]]);
  const Dt = dims(CAST.thief);
  const tm = personSide(ctx, CAST.thief, { x: tx, y: .14, f: -1, legs: standLegs(), lean: .3, measure: 1 });
  const tJ = add(tm.Sh, [0, -Dt.limbW * .5]);
  const tIK = tgt => { const r = ik2(-(tgt[0] - tJ[0]), tgt[1] - tJ[1], Dt.up, Dt.fo); return { sh: r[0], el: r[1] }; };
  // ---- the one bag ----
  const ladyHold = add(lJ, [-.05, -.52]);
  let bagMode, bagP, brot = 0;
  if (t < T_YANK) { bagMode = 'lady'; bagP = ladyHold; }
  else if (t < T_HOOK) { bagMode = 'thief'; bagP = [tx + .25, shaftPt(0)[1] + .01]; brot = .25; }
  else if (t < T_CATCH) {
    bagMode = 'hook';
    const u = t < T_LOSE ? lerp(.84, .22, E.o(seg(t, T_HOOK, T_LOSE))) : t < T_SLIDE[0] ? .22 : lerp(.22, .84, E.i(seg(t, ...T_SLIDE)));
    bagP = add(shaftPt(u), nrm, .004);
    brot = t < T_LOSE ? .5 * seg(t, T_HOOK, T_LOSE) : t < T_SLIDE[0] ? .5 * Math.cos((t - T_LOSE) * 9) * Math.exp(-(t - T_LOSE) * 2.6) : -.15 * seg(t, ...T_SLIDE);
  } else { bagMode = 'lady2'; }
  // lady arms: holding the bag; yanked forward; reaching; hugging it
  let lNear;
  if (t < T_YANK) lNear = { sh: .15, el: .2 };
  else if (t < 1.4) lNear = { sh: lerp(1.3, .5, seg(t, T_YANK + .1, 1.4)), el: .2 };
  else if (t < T_CATCH) { const reach = kf(t, [[1.9, 0], [2.3, 1, E.io]]); const r = lIK(add(shaftPt(.84), [.02, -.02])); lNear = { sh: lerp(.5, r.sh, reach), el: lerp(.3, r.el, reach) }; }
  else { const hug = E.io(seg(t, T_CATCH, T_CATCH + .3)); const r = lIK(add(shaftPt(.84), [.02, -.02])); lNear = { sh: lerp(r.sh, .7, hug), el: lerp(r.el, 1.9, hug) }; }
  const lEx = t < T_YANK ? { eyes: 'open', mouth: 'smile', lookX: -.3 } : t < 1.6 ? { eyes: 'wide', mouth: 'o', brow: 1.3, lookX: -1 } : t < T_CATCH ? { eyes: 'open', mouth: 'o', lookX: -1, lookY: -.3 } : { eyes: 'happy', mouth: 'grin' };
  personSide(ctx, CAST.lady, { x: lx, f: -1, legs: lWalk ? walkLegs(t / .6, .3) : t > T_YANK && t < T_YANK + .2 ? [{ th: .3, kn: .2 }, { th: -.2, kn: .1 }] : standLegs(.03, .02), lean: jolt * .35 + (t > 2.0 && t < T_CATCH + .2 ? .15 : 0), arms: { near: lNear, far: { sh: t > T_YANK && t < 1.6 ? .9 : .05, el: .4 } }, ex: lEx,
    hold: { near: (c, w) => { if (bagMode === 'lady') handbag(c, w[0], w[1] + .02, 0, 1); if (bagMode === 'lady2') handbag(c, w[0] + .02, w[1] + .04, .1, 1); } } });
  // thief: he runs past just behind the man, so the level shaft (and the bag caught on it) is in front of him
  if (t > .5 && t < 2.21) {
    let near;
    if (t < T_YANK - .08) near = { sh: -.4 + Math.sin(t * 16) * .7, el: .5 };
    else if (t < T_LOSE) near = tIK(t < T_YANK ? ladyHold : t < T_HOOK ? bagP : add(bagP, [.0, .0]));
    else near = { sh: lerp(-.6, 1.8, stumble), el: .3 };
    const far = { sh: .4 - Math.sin(t * 16) * .7, el: .6 };
    const tEx = t < T_YANK ? { eyes: 'open', mouth: 'flat', brow: -1 } : t < T_LOSE ? { eyes: 'open', mouth: 'grin', brow: -1 } : { eyes: 'wide', mouth: 'o', brow: 1 };
    personSide(ctx, CAST.thief, { x: tx, y: .14, f: -1, headF: t > 1.62 && t < 1.95 ? 1 : -1, legs: walkLegs(t / .36, .6), lean: .3 + stumble * .25, arms: { near, far }, ex: tEx,
      hold: { near: (c, w) => { if (bagMode === 'thief') handbag(c, w[0], w[1], brot, 1); } } });
  }
  drawHeroH();
  // bag on the shaft: handle round the shaft (back strand behind it, front strand in front)
  if (bagMode === 'hook') {
    handbag(ctx, bagP[0], bagP[1], brot, 1);
    ctx.save(); ctx.beginPath(); ctx.rect(bagP[0] - .14, bagP[1] - .09, .28, .16); ctx.clip();
    drawUmbrella(ctx, m.handL[0], m.handL[1], ua, { cs: 1 }); ctx.restore();
    local(ctx, bagP[0], bagP[1], brot, 1);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(.07, 0, .07, -.11); st(ctx, OLW * 2.6, INK);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(.07, 0, .07, -.11); st(ctx, OLW * 1.3, '#7a4a2b');
    ctx.restore();
    // the moment it catches: a little snag accent
    if (t < T_HOOK + .12) { const u = seg(t, T_HOOK, T_HOOK + .12); ctx.strokeStyle = `rgba(40,40,40,${1 - u})`; ctx.lineWidth = px(2.4); for (let q = 0; q < 5; q++) { const a = q * TAU / 5 + .3; ctx.beginPath(); ctx.moveTo(bagP[0] + Math.cos(a) * .07, bagP[1] + Math.sin(a) * .07); ctx.lineTo(bagP[0] + Math.cos(a) * (.13 + u * .04), bagP[1] + Math.sin(a) * (.13 + u * .04)); ctx.stroke(); } }
  }
}, { notes: 'A thief sprints past the old lady and yanks her handbag. The man holds his umbrella out level at bag height; the handle catches on the shaft, the thief’s own pull drags it down to the man’s fist and his grip fails, so he runs on empty-handed. The man tips the umbrella and the bag slides the length of the shaft into the lady’s hands.' });

// ---------- 15. Taxi ----------
shot('Taxi', ...CUT(14), (ctx, t, T) => {
  skyFill(ctx, '#c1c9cf', '#d3d7da');
  camera(ctx, .8, 1.1, 325);
  streetBack(ctx, T);
  pavement(ctx, -8, 8, .0, .5, '#b7b3ad', { rows: 2, slab: 1.1 });
  lamppost(ctx, -2.75, .15, .95);
  phoneBox(ctx, 3.3, .36, .85);
  railings(ctx, -3.6, -2.95, .45, .9, { c: '#2a2d32' });
  bystanders(ctx, t - 1.33, 'splash');
  const PX = 1.55;
  const T_LOOK = .85, T_HOP = [1.2, 1.48], T_OPEN = [1.46, 1.8], T_HIT = 1.9, T_HOLD = [2.12, 2.34], T_BREAK = 2.36, T_CLOSE = [2.85, 3.15];
  
  const hop = seg(t, ...T_HOP), x0 = -.35, hx = lerp(x0, PX, E.io(hop)), hyHop = Math.sin(Math.PI * hop) * .2;
  const antic = kf(t, [[1.08, 0], [1.18, 1, E.io], [1.24, 0]]);
  const crouch = E.io(seg(t, T_OPEN[0], T_OPEN[0] + .2)) * (1 - E.io(seg(t, T_CLOSE[1], T_CLOSE[1] + .2)));
  const open = kf(t, [[T_OPEN[0], 0], [T_OPEN[0] + .1, .25, E.o], [T_OPEN[1] - .06, 1.07, E.io], [T_OPEN[1], 1], [T_CLOSE[0], 1], [T_CLOSE[0] + .08, 1.04], [T_CLOSE[1], 0, E.io]]);
  const sipT = kf(t, [[.15, 0], [.35, 1, E.io], [.65, 1], [.8, 0, E.io], [3.3, 0], [3.5, 1, E.io], [3.8, 1], [4.0, .5]]);
  const wet = seg(t, T_BREAK - .1, T_BREAK + .1) * (1 - seg(t, 3.0, 4.0) * .5);
  const kneeA = crouch + antic * .5;
  // the smear from the butcher's shop is still on his trouser leg until this water washes it off
  HS.leg = 1 - E.io(seg(t, T_BREAK + .08, T_BREAK + .38));
  const flegs = [{ a: lerp(-.05, -.28, crouch) - hop * .2 * Math.sin(Math.PI * hop), k: lerp(0, .8, crouch) + antic * .8 + Math.sin(Math.PI * hop) * .6 }, { a: lerp(.05, .28, crouch) + hop * .2 * Math.sin(Math.PI * hop), k: lerp(0, .8, crouch) + antic * .8 + Math.sin(Math.PI * hop) * .6 }];   // a plain two-legged squat
  const faceOn = open > .02;
  const hp = {
    x: hx, y: hyHop, hipH: lerp(1.0, .72, crouch) - antic * .1 - Math.sin(Math.PI * hop) * .08 + hyHop, flegs, lookX: t < T_LOOK ? 0 : t < 1.08 ? -1 : t < T_HIT ? .7 : t < 2.5 ? -.3 : 0, lookY: t > 2.5 && t < 2.9 ? .3 : 0, eyes: t > T_HIT + .15 && t < T_BREAK + .1 ? .12 : .38, sipT,
    farms: { R: { sh: .12, el: -.3 }, L: faceOn ? { sh: .9, el: .6 } : { sh: .07 + Math.sin(Math.PI * hop) * .5, el: .05 } },
    umb: faceOn ? false : { ang: -Math.PI / 2 + Math.sin(Math.PI * hop) * .4 + (t > T_CLOSE[1] ? .15 * Math.exp(-(t - T_CLOSE[1]) * 8) : 0) }, coatFlare: Math.sin(Math.PI * hop) * .5, hairWind: -Math.sin(Math.PI * hop) * .4, smirk: t > 2.7 ? .7 : 0,
  };
  const cc = [hx + .04, lerp(.95, .86, crouch)];
  if (faceOn) { const mm = heroFront(ctx, Object.assign({ measure: 1 }, hp)); const ikS = frontArmIK(mm.Sh, [cc[0] + .02, cc[1] + .02], 1); const k = Math.min(1, open * 1.5); hp.farms.L = { sh: lerp(.07, ikS.sh, k), el: lerp(.05, ikS.el, k) }; }
  heroFront(ctx, hp);
  // the shield: seen from the road, dome towards us (ribs spread as it opens)
  if (faceOn) umbrellaFaceOn(ctx, cc[0], cc[1], .546 * (.12 + .88 * Math.min(1.08, open)), { wet, rot: .08 + (1 - Math.min(1, open)) * .6, squash: .75 + .25 * Math.min(1, open) });
  // road, kerb, a bright reflective puddle
  kerb(ctx, -8, 8, .02, .13, '#b1aca4');
  road(ctx, -8, 8, -1.2, -.11, '#5a5d62', false);
  const pud = 1 - E.o(seg(t, T_HIT, T_HIT + .5)) * .65;
  const pw = 1.05 * pud + .15;
  ell(ctx, PX, -.28, pw, .1 * (.5 + pud * .5)); ctx.fillStyle = 'rgba(150,175,195,.9)'; ctx.fill(); st(ctx, 1.2, 'rgba(70,85,100,.6)');
  ctx.save(); ell(ctx, PX, -.28, pw, .1 * (.5 + pud * .5)); ctx.clip();
  ctx.fillStyle = 'rgba(225,235,242,.8)'; ell(ctx, PX - pw * .25, -.25, pw * .45, .03); ctx.fill();
  ctx.fillStyle = 'rgba(40,40,45,.35)'; rect(ctx, PX - .3, -.36, .6, .05); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = px(1.6); for (let k = 0; k < 3; k++) { const u = ((T * .6 + k / 3) % 1); ell(ctx, PX + .3 - k * .35, -.3, .05 + u * .2, .012 + u * .03); ctx.globalAlpha = 1 - u; ctx.stroke(); ctx.globalAlpha = 1; }
  ctx.restore();
  // the sheet: thrown up off the puddle, it stands for a moment, then breaks on the canopy
  const rise = t < T_HIT ? 0 : t < T_HOLD[0] ? E.o(seg(t, T_HIT, T_HOLD[0])) : t < T_HOLD[1] ? 1 : 1 - E.i(seg(t, T_HOLD[1], T_BREAK + .25));
  if (rise > 0) {
    const Hh = 1.4 * rise + (t > T_HOLD[0] && t < T_HOLD[1] ? Math.sin(T * 20) * .02 : 0), xa = PX - .58, xb = PX + .58;   // no wider than the canopy that stops it
    ctx.save(); ctx.globalAlpha = .9 * (t > T_HOLD[1] ? 1 - seg(t, T_HOLD[1], T_BREAK + .25) * .6 : 1);
    const top = []; for (let i = 0; i <= 24; i++) { const u = i / 24, env = Math.pow(Math.sin(Math.PI * u), .7); top.push([lerp(xa, xb, u), -.18 + Hh * env * (.85 + .15 * Math.sin(u * 13 + T * 11))]); }
    ctx.beginPath(); ctx.moveTo(xa, -.2); top.forEach(q => ctx.lineTo(q[0], q[1])); ctx.lineTo(xb, -.2); ctx.closePath();
    const g = vgrad(ctx, -.2, 1.3, [[0, 'rgba(120,150,170,.9)'], [.5, 'rgba(175,205,225,.8)'], [1, 'rgba(225,238,246,.65)']]); ctx.fillStyle = g; ctx.fill();
    ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(240,248,252,.55)'; ctx.lineWidth = px(2.4);
    for (let k = 0; k < 10; k++) { const xs = lerp(xa + .1, xb - .1, k / 9); ctx.beginPath(); ctx.moveTo(xs, -.2); ctx.quadraticCurveTo(xs + .06 * Math.sin(k + T * 3), Hh * .5, xs + .12 * (k - 4.5) / 4.5, Hh); ctx.stroke(); }
    ctx.restore();
    ctx.beginPath(); top.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.lineWidth = px(8); ctx.strokeStyle = 'rgba(248,251,253,.95)'; ctx.lineCap = 'round'; ctx.stroke();
    ctx.lineWidth = px(1.8); ctx.strokeStyle = 'rgba(80,110,135,.7)'; ctx.stroke();
    ctx.restore();
    const r = rng(77); ctx.fillStyle = 'rgba(215,232,244,.95)';
    for (let i = 0; i < 50; i++) { const xd = lerp(xa, xb, r()), yd = -.15 + r() * Hh * 1.05; const j = Math.sin(T * 9 + i) * .02; if (Hh > .1) { circ(ctx, xd + j, yd + (r() - .5) * .1 + .06 * rise, .014 + r() * .02); ctx.fill(); } }
  }
  // it breaks on the canopy: burst round the rim, water down the dome, spray at his boots
  if (t > T_BREAK && t < T_BREAK + .5) {
    const u = seg(t, T_BREAK, T_BREAK + .5), r = rng(19);
    ctx.fillStyle = `rgba(220,236,246,${.95 * (1 - u)})`;
    for (let i = 0; i < 40; i++) { const a = r() * TAU, sp = .5 + r() * .7, d = .55 + u * sp * .9; const x = cc[0] + Math.cos(a) * d, y = cc[1] + Math.sin(a) * d * .8 - u * u * .6; circ(ctx, x, y, .014 + r() * .016); ctx.fill(); }
    ctx.strokeStyle = `rgba(235,245,250,${.85 * (1 - u)})`; ctx.lineWidth = px(3.4); ctx.lineCap = 'round';
    for (let k = 0; k < 12; k++) { const a = k * TAU / 12 + .2, d0 = .58, d1 = .66 + u * .4; ctx.beginPath(); ctx.moveTo(cc[0] + Math.cos(a) * d0, cc[1] + Math.sin(a) * d0); ctx.lineTo(cc[0] + Math.cos(a) * d1, cc[1] + Math.sin(a) * d1); ctx.stroke(); }
  }
  // the broken wave pours off the rim and down over his legs: that's what washes the trouser smear away
  if (t > T_BREAK && t < T_BREAK + .7) {
    const u = seg(t, T_BREAK, T_BREAK + .7), r = rng(41), y0 = cc[1] - .42;
    ctx.save(); ctx.lineCap = 'round';
    for (let i = 0; i < 16; i++) {
      const x = hx + lerp(-.34, .34, r()), d = r() * .25, uu = clamp((u - d) / .6, 0, 1); if (uu <= 0 || uu >= 1) continue;
      const yH = lerp(y0, -.02, E.i(Math.min(1, uu * 1.4))), yT = lerp(y0, -.02, E.i(Math.max(0, uu * 1.4 - .35)));
      ctx.strokeStyle = `rgba(215,234,246,${.85 * (1 - uu * .6)})`; ctx.lineWidth = px(3 + r() * 3);
      ctx.beginPath(); ctx.moveTo(x, yT); ctx.lineTo(x + (r() - .5) * .04, yH); ctx.stroke();
    }
    ctx.restore();
    if (u > .5) { sparkle(ctx, [hx - .16, .3], .05, Math.sin(Math.PI * seg(u, .5, 1))); }
  }
  // drips off the rim afterwards
  if (faceOn && t > T_BREAK + .2) { const r = rng(5); ctx.fillStyle = 'rgba(200,222,238,.9)'; for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (r() - .5) * 2.2, x = cc[0] + Math.cos(a) * .5 * Math.min(1, open), y0 = cc[1] + Math.sin(a) * .5 * Math.min(1, open), ph = ((t * 2.2 + r()) % 1); circ(ctx, x, y0 - ph * .5, .013); ctx.fill(); } }
  if (t > T_BREAK + .1) { ctx.fillStyle = `rgba(80,95,110,${.3 * seg(t, T_BREAK + .1, T_BREAK + .5)})`; ell(ctx, PX, .06, .8, .06); ctx.fill(); }
  // the taxi (nearest)
  const tx = kf(t, [[1.0, -4.3], [T_HIT, .1], [2.65, 6.8]]);
  if (t > 1.0 && t < 2.65) taxi(ctx, tx, -1.0, 1, -tx * 2.6);
}, { notes: 'A taxi is coming for the bright puddle right in front of two women. He clocks it, hops across, crouches behind the open umbrella held face-on, and the whole sheet of water stands up and breaks on the canopy instead of on them. The same water washes the grime off the canopy and the last smear off his trouser leg. He closes it and sips.' });

// ---------- 16. Raindrop ----------
shot('Raindrop', ...CUT(15), (ctx, t, T) => {
  screen(ctx);
  const g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, '#1d2127'); g.addColorStop(.42, '#262b33'); g.addColorStop(.47, '#e9e6df'); g.addColorStop(.55, '#e4e1da'); g.addColorStop(.6, '#232830'); g.addColorStop(1, '#1b1f25');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(20,22,26,.9)'; ctx.fillRect(W * .495, 0, W * .035, H);
  ctx.save(); ctx.filter = 'blur(18px)'; ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(200, 0, 300, H); ctx.restore();
  rainLayer(ctx, T, Math.floor(lerp(3, 18, t / 2)), { alpha: .22, len: 80, speed: 2200, seed: 3 });
  const cx = 960, cy = 560, rx = 560, ry = 250;
  ctx.lineJoin = 'round';
  const ol = (w = 4) => { ctx.lineWidth = w; ctx.strokeStyle = INK; ctx.stroke(); };
  ctx.beginPath(); ctx.moveTo(cx - rx * .92, cy + 40); ctx.lineTo(cx - rx * .8, H + 40); ctx.lineTo(cx + rx * .8, H + 40); ctx.lineTo(cx + rx * .92, cy + 40); ctx.closePath(); ctx.fillStyle = '#f2efe9'; ctx.fill(); ol();
  ctx.beginPath(); ctx.ellipse(cx, cy + 40, rx, ry, 0, 0, Math.PI); ctx.fillStyle = '#ebe7e0'; ctx.fill(); ol();
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.fillStyle = '#faf8f4'; ctx.fill(); ol();
  ctx.beginPath(); ctx.ellipse(cx, cy - 18, rx * .84, ry * .8, 0, 0, TAU); ctx.fillStyle = '#efebe4'; ctx.fill(); ol(3);
  ctx.beginPath(); ctx.ellipse(cx, cy - 10, rx * .8, ry * .74, 0, 0, Math.PI); ctx.strokeStyle = 'rgba(0,0,0,.08)'; ctx.lineWidth = 10; ctx.stroke();
  // his fingers round the cup
  const skin = HERO.skin, skinDk = HERO.skinDk;
  [[1330, 900, .0], [1270, 985, .05], [1225, 1062, .1]].forEach(([x, y, r], i) => { ctx.save(); ctx.translate(x, y); ctx.rotate(r - .1); ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-230, -38, 290, 76, 38) : ctx.rect(-230, -38, 290, 76); ctx.fillStyle = i % 2 ? skinDk : skin; ctx.fill(); ol(4); ctx.beginPath(); ctx.moveTo(-150, -30); ctx.quadraticCurveTo(-160, 0, -150, 30); ctx.strokeStyle = 'rgba(120,70,50,.35)'; ctx.lineWidth = 3; ctx.stroke(); ctx.beginPath(); ctx.ellipse(-195, -4, 24, 26, 0, 0, TAU); ctx.fillStyle = 'rgba(255,235,225,.55)'; ctx.fill(); ctx.restore(); });
  ctx.beginPath(); ctx.moveTo(W, 820); ctx.lineTo(1420, 860); ctx.quadraticCurveTo(1380, 1000, 1400, H); ctx.lineTo(W, H); ctx.closePath(); ctx.fillStyle = skinDk; ctx.fill(); ol(4);
  // his wrist goes into a white shirt cuff and the black coat sleeve (with a sheen so it reads on the dark street)
  ctx.beginPath(); ctx.moveTo(1640, 810); ctx.lineTo(1700, 800); ctx.quadraticCurveTo(1668, 960, 1690, H); ctx.lineTo(1628, H); ctx.quadraticCurveTo(1610, 960, 1640, 810); ctx.closePath(); ctx.fillStyle = '#f4f2ee'; ctx.fill(); ol(4);
  ctx.beginPath(); ctx.moveTo(1690, 780); ctx.lineTo(W, 740); ctx.lineTo(W, H); ctx.lineTo(1680, H); ctx.quadraticCurveTo(1655, 960, 1690, 780); ctx.closePath(); ctx.fillStyle = '#2a2e36'; ctx.fill(); ol(4);
  ctx.strokeStyle = 'rgba(160,170,190,.35)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(1730, 800); ctx.quadraticCurveTo(1712, 940, 1730, H); ctx.stroke();
  // sip hole
  const hx = cx + 300, hy = cy + 95;
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(-.35);
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-64, -18, 128, 36, 18) : ctx.rect(-64, -18, 128, 36); ctx.fillStyle = '#3a2418'; ctx.fill(); ol(3);
  ctx.restore();
  const drop = (x, y, s, a = 1) => { ctx.save(); ctx.globalAlpha = a; ctx.beginPath(); ctx.moveTo(x, y - 40 * s); ctx.quadraticCurveTo(x + 24 * s, y + 4 * s, x, y + 16 * s); ctx.quadraticCurveTo(x - 24 * s, y + 4 * s, x, y - 40 * s); ctx.fillStyle = 'rgba(215,232,244,.97)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(70,95,120,.95)'; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(x - 7 * s, y + 2 * s, 5 * s, 8 * s, -.3, 0, TAU); ctx.fill(); ctx.restore(); };
  // drop 1: tracked all the way down into the sip hole
  const T1 = [.1, .62];
  if (t > T1[0] && t < T1[1]) {
    const u = seg(t, ...T1), y = lerp(-120, hy - 8, E.i(u)), x = lerp(hx - 60, hx, u);
    ctx.strokeStyle = 'rgba(220,235,245,.45)'; ctx.lineWidth = 22; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - 20 * u, y - 120 - 260 * u); ctx.lineTo(x, y - 70); ctx.stroke();
    drop(x, y, 2.4);
  } else if (t >= T1[1] && t < T1[1] + .4) {
    // a little crown of coffee and water out of the hole
    const u = seg(t, T1[1], T1[1] + .4);
    // a little spout of coffee out of the hole, breaking into a crown of drops
    if (u < .55) { const hh = 190 * Math.sin(Math.PI * u / .55 * .5) * (1 - u / .55 * .6); ctx.beginPath(); ctx.moveTo(hx - 22, hy - 4); ctx.quadraticCurveTo(hx - 10, hy - hh * .6, hx, hy - hh); ctx.quadraticCurveTo(hx + 10, hy - hh * .6, hx + 22, hy - 4); ctx.closePath(); ctx.fillStyle = 'rgba(120,80,50,.95)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke(); }
    for (let k = 0; k < 11; k++) { const a = -Math.PI / 2 + (k - 5) * .27, d = 150 * E.o(u), up = 150 * Math.sin(Math.PI * u); ctx.beginPath(); ctx.arc(hx + Math.cos(a) * d * 1.3, hy - up + Math.sin(a) * d * .25 - 10, 22 * (1 - u) + 6, 0, TAU); ctx.fillStyle = k % 2 ? 'rgba(120,80,50,.9)' : 'rgba(210,228,240,.95)'; ctx.fill(); }
    ctx.strokeStyle = `rgba(120,80,50,${.8 * (1 - u)})`; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(hx, hy - 6, 40 + 40 * u, 12 + 10 * u, -.35, Math.PI, TAU); ctx.stroke();
  }
  // the spout's coffee comes down on the lid as a brown spot
  if (t > T1[1] + .3) { const u = E.o(seg(t, T1[1] + .3, T1[1] + .42)); ctx.save(); ctx.translate(hx - 150, hy - 40); ctx.beginPath(); ctx.ellipse(0, 0, 34 * u + 4, 14 * u + 2, -.2, 0, TAU); ctx.fillStyle = 'rgba(120,80,50,.92)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(-8, -3, 8 * u, 3 * u, -.2, 0, TAU); ctx.fill(); ctx.restore(); }
  // then the drops bead on the solid lid (a small squash as each lands)
  const beads = [[.92, cx - 170, cy - 30], [1.18, cx + 70, cy - 105], [1.42, cx - 360, cy + 20], [1.68, cx + 180, cy + 10]];
  beads.forEach(([t0, bx, by]) => {
    if (t > t0 - .2 && t < t0) { const u = seg(t, t0 - .2, t0); drop(bx, lerp(-120, by, E.i(u)), 1.6); }
    if (t >= t0) { const sq = 1 + .3 * Math.exp(-(t - t0) * 12) * Math.sin((t - t0) * 40); ctx.beginPath(); ctx.ellipse(bx, by, 42 * sq, 22 / sq, 0, 0, TAU); ctx.fillStyle = 'rgba(205,225,240,.92)'; ctx.fill(); ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(70,95,120,.8)'; ctx.stroke(); ctx.beginPath(); ctx.arc(bx - 13, by + 6, 8, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); }
  });
}, { olw: 4, notes: 'Close on his coffee lid, his fingers round the cup. The first raindrop falls straight into the sip hole, the one thing the umbrella couldn’t stop, and a little crown of coffee jumps out. The next drops bead on the plastic lid.' });

// ---------- 17. Face ----------
shot('Face', ...CUT(16), (ctx, t, T) => {
  skyFill(ctx, '#aeb7bf', '#c6ccd0');
  screen(ctx);
  ctx.save(); ctx.filter = 'blur(30px)'; ctx.fillStyle = '#9aa4ad'; ctx.fillRect(100, 300, 380, 900); ctx.fillRect(1500, 200, 300, 900); ctx.fillStyle = '#b2433d'; ctx.fillRect(1620, 420, 160, 500); ctx.fillStyle = '#e8d9a0'; ctx.beginPath(); ctx.arc(330, 250, 40, 0, TAU); ctx.fill(); ctx.restore();
  rainLayer(ctx, T, 70, { alpha: .55, len: 110, speed: 2400, seed: 12, width: 2.4 });
  camera(ctx, 0, -.02, 2200);
  const rise = kf(t, [[.95, 0], [1.35, 1, E.io]]);
  const hc = [0, .03 + rise * .012];
  // coat, lapels, shirt collar and tie (all clothing: no bare V); a short neck
  ctx.save(); ctx.translate(0, .05);
  P(ctx, [[-.5, -.5], [-.36, -.25], [-.12, -.19], [.12, -.19], [.36, -.25], [.5, -.5]]); fs(ctx, HERO.coat);
  P(ctx, [[-.075, -.19], [.075, -.19], [.03, -.34], [0, -.5], [-.03, -.34]]); fs(ctx, HERO.shirt);
  P(ctx, [[-.12, -.19], [-.075, -.19], [-.02, -.36], [-.06, -.5], [-.2, -.5]]); fs(ctx, HERO.coatHi || HERO.coat);
  P(ctx, [[.12, -.19], [.075, -.19], [.02, -.36], [.06, -.5], [.2, -.5]]); fs(ctx, HERO.coatHi || HERO.coat);
  limb(ctx, [[hc[0], hc[1] - .15], [0, -.165]], .056, HERO.skin);
  ctx.fillStyle = 'rgba(150,90,70,.25)'; ctx.fillRect(-.028, -.172, .056, .012);
  rect(ctx, -.04, -.195, .08, .03); fs(ctx, HERO.shirt);
  [-1, 1].forEach(s => { P(ctx, [[s * .006, -.186], [s * .052, -.17], [s * .036, -.232]]); fs(ctx, HERO.shirt); });
  P(ctx, [[-.013, -.19], [.013, -.19], [.009, -.212], [-.009, -.212]]); fs(ctx, HERO.tie);
  P(ctx, [[-.009, -.212], [.009, -.212], [.02, -.44], [0, -.47], [-.02, -.44]]); fs(ctx, HERO.tie);
  ctx.restore();
  // acting: neutral, the drop lands on his cheekbone, a blink, he looks up, the corner of his mouth lifts and stays
  const T_HIT = .45;
  const eyes = kf(t, [[0, .38], [.95, .38], [1.25, .6, E.io], [1.6, .6], [1.9, .34, E.io]]);
  const blink = kf(t, [[T_HIT + .02, 0], [T_HIT + .07, 1], [T_HIT + .16, 0], [2.0, 0], [2.05, .8], [2.12, 0]]);
  const lookY = kf(t, [[0, 0], [.95, 0], [1.3, .95, E.io]]);
  const smirk = kf(t, [[1.45, 0], [1.75, 1, E.io]]);
  const mouth = kf(t, [[1.45, 0], [1.75, .25]]);
  const tearU = seg(t, T_HIT + .05, 1.55), drip = Math.max(0, t - 1.55);
  const tear = t > T_HIT && t < 1.85 ? [.053 - tearU * .012, lerp(-.035, -.078, E.io(tearU)) - 1.6 * drip * drip, 1 - seg(t, 1.7, 1.85)] : null;
  heroHeadFront(ctx, hc[0], hc[1], { eyes, blink, lookY, mouth, smirk, tear, tearSc: 1.6, tilt: lerp(.02, -.03, rise), hairWind: Math.sin(T * 1.3) * .15 });
  // the drop comes down from above, tracked, onto the cheekbone
  const hitP = [hc[0] + .053, hc[1] - .035];
  if (t < T_HIT) { const u = seg(t, .12, T_HIT); const y = lerp(.3, hitP[1], E.i(u)), x = hitP[0] + .005; if (t > .12) { ctx.strokeStyle = 'rgba(225,238,248,.5)'; ctx.lineWidth = px(5); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y + .06); ctx.lineTo(x, y + .015); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y + .014); ctx.quadraticCurveTo(x + .007, y - .002, x, y - .007); ctx.quadraticCurveTo(x - .007, y - .002, x, y + .014); ctx.fillStyle = 'rgba(215,232,244,.95)'; ctx.fill(); st(ctx, OLW * .5, 'rgba(80,110,140,.9)'); } }
  if (t > T_HIT && t < T_HIT + .18) { const u = seg(t, T_HIT, T_HIT + .18); ctx.fillStyle = `rgba(225,238,248,${1 - u})`; for (let k = 0; k < 7; k++) { const a = k * .9 + .3; circ(ctx, hitP[0] + Math.cos(a) * .012 * (1 + u * 2.2), hitP[1] + Math.sin(a) * .01 * (1 + u * 2.2), .0035); ctx.fill(); } }
}, { olw: 5, vign: .34, notes: 'A raindrop comes down, tracked, and lands on his cheekbone. He blinks, it runs down like a tear, he looks up at the sky and the corner of his mouth lifts and stays there. Coat, shirt collar and tie are all clothing: no bare V at the neck.' });

// ---------- 18. Stance ----------
// the same four bystanders as the taxi shot, going into their rain poses (k: 0 dry .. 1 covered)
function bystandersRain(ctx, t, k, o = {}) {
  // b1: briefcase from his side up over his head
  const up = E.io(seg(k, .1, .6));
  const upL = seg(up, .25, 1);
  // forearms fold up first, then the upper arms rise: the hands never swing out sideways
  const liftArm = u => { const bend = E.io(seg(u, 0, .4)), raise = E.io(seg(u, .3, 1)); return { sh: lerp(.12, 2.75, raise), el: lerp(lerp(.1, 2.6, bend), .45, raise) }; };
  personFront(ctx, CAST.b1, { x: -2.6, y: .36, ex: up > .5 ? { eyes: 'closed', mouth: 'frown' } : { eyes: 'open', mouth: 'flat', lookY: .8 }, farms: { l: { sh: .1, el: .1 }, r: liftArm(up) },
    hold: { r: (c, w, o) => { if (up > .7) { rect(c, w[0] - .3, w[1] + .03, .42, .1); fs(c, '#5a3a28'); seg2(c, [w[0] - .04, w[1] + .03], [w[0] - .04, w[1] - .01], 2.5, '#3a2618'); } else { rrect(c, w[0] - .15, w[1] - .25, .3, .22, .02); fs(c, '#5a3a28'); } } } });
  // b4: pulls his hood up
  const hood = seg(k, .25, .55);
  if (hood > .5) CAST.b4.hat = { type: 'hood', color: '#c47a26' };
  personFront(ctx, CAST.b4, { x: -1.75, y: .4, ex: hood > .5 ? { eyes: 'closed', mouth: 'flat' } : { eyes: 'open', mouth: 'o', lookY: .8 }, farms: hood > 0 && hood < 1 ? { l: { sh: 2.6, el: 1.2 }, r: { sh: 2.6, el: 1.2 } } : { l: { sh: .1, el: .1 }, r: { sh: .1, el: .1 } } });
  delete CAST.b4.hat;
  // b2's red umbrella is stuck: she shakes it, it won't open... until his tip pops the catch; she shares it with the old lady
  // she holds it out at her side (the side facing him), shaking it; once it pops she lifts it over herself and the old lady
  const popT = o.popT == null ? 1e9 : o.popT;
  const op = t < popT ? 0 : kf(t, [[popT, 0], [popT + .1, 1.12, E.o], [popT + .2, 1, E.io]]);
  const sp2 = CAST.b2, D2 = dims(sp2), x2 = 1.3, y2 = .38;
  const Sh2 = [x2, y2 + D2.leg + D2.shoe * .1 + D2.torso], J2 = [Sh2[0] - D2.bw * .55, Sh2[1] - D2.limbW * .5];
  const shake = tt => tt > .2 && tt < popT ? Math.sin(tt * 24) : 0;
  const handPre = tt => [x2 - .44, Sh2[1] - .12 + shake(tt) * .035];
  const lift = E.io(seg(t, popT + .08, popT + .45));
  const hand2 = t < popT ? handPre(t) : mix(handPre(popT), [x2 - .2, Sh2[1] + .05], lift);
  const tl = t < popT ? shake(t) * .06 : .25 * lift;
  const ikl = ik2((hand2[0] - J2[0]) * -1, hand2[1] - J2[1], D2.up, D2.fo);
  const armL2 = { sh: ikl[0], el: ikl[1] };
  const catchPop = add(handPre(popT), [0, .34]);
  if (o.onB2) o.onB2({ w: hand2, catchNow: add(hand2, [Math.sin(tl) * .34, Math.cos(tl) * .34]), catchPop });
  personFront(ctx, sp2, { x: x2, y: y2, ex: op > .6 ? { eyes: 'happy', mouth: 'smile', lookY: 1, lookX: .3 } : t > .2 ? { eyes: 'open', mouth: 'frown', brow: -1, lookY: .7, lookX: -.8 } : { eyes: 'open', mouth: 'o', lookY: .8 }, farms: { l: armL2, r: op > 0 ? { sh: .35, el: 1.9 } : { sh: .2, el: .15 } },
    hold: { l: (c, w) => {
      const u = [Math.sin(tl), Math.cos(tl)], n = [u[1], -u[0]];
      const at = (a, b) => [w[0] + u[0] * a + n[0] * b, w[1] + u[1] * a + n[1] * b];
      const top = at(.66, 0); seg2(c, at(-.05, 0), top, 2.6, '#333');
      if (op < .02) {
        // the furled canopy, strap flapping; the catch (runner) is the dark band
        P(c, [at(.16, -.014), at(.16, .014), at(.46, .055), at(.64, .012), at(.64, -.012), at(.46, -.055)]); fs(c, '#c7423a');
        P(c, [at(.4, .05), at(.37, .09 + shake(t) * .02), at(.33, .085 + shake(t) * .02), at(.36, .045)]); fs(c, '#8a2a25');
        P(c, [at(.325, -.05), at(.325, .05), at(.36, .05), at(.36, -.05)]); c.fillStyle = '#5a1c18'; c.fill();
      } else {
        const r = .6 * op, sag = .1 * op, rim = at(.66 - sag, 0);
        c.beginPath(); const a1 = [rim[0] - n[0] * r, rim[1] - n[1] * r], a2 = [rim[0] + n[0] * r, rim[1] + n[1] * r], cp = at(.66 + .42 * op + .04, 0);
        c.moveTo(a1[0], a1[1]); c.quadraticCurveTo(cp[0], cp[1], a2[0], a2[1]);
        for (let q = 4; q >= 0; q--) { const e = mix(a1, a2, q / 5), m = add(mix(a1, a2, (q + .5) / 5), [u[0] * .045, u[1] * .045]); c.quadraticCurveTo(m[0], m[1], e[0], e[1]); }
        c.closePath(); fs(c, '#c7423a');
        const apex = mix(rim, cp, .5);
        c.strokeStyle = 'rgba(110,30,26,.55)'; c.lineWidth = px(1.8);
        for (let q = 1; q < 5; q++) { const e = add(mix(a1, a2, q / 5), [u[0] * .045, u[1] * .045]); c.beginPath(); c.moveTo(apex[0], apex[1]); c.lineTo(e[0], e[1]); c.stroke(); }
      }
    } } });
  personFront(ctx, CAST.b3, { x: lerp(1.95, 1.68, lift), y: .34, ex: op > .6 ? { eyes: 'happy', mouth: 'smile' } : { eyes: 'closed', mouth: 'frown' }, farms: { l: { sh: .12, el: .1 }, r: { sh: .12, el: .1 } }, tilt: -.12 * lift });
}
shot('Stance', ...CUT(17), (ctx, t, T) => {
  skyFill(ctx, '#9ea8b2', '#c3c9ce');
  camera(ctx, .1, 1.35, 330);
  ctx.fillStyle = '#b2bac1'; ctx.fillRect(-5, 0, 10, 6);
  for (let i = -2; i <= 2; i++) { rect(ctx, i * 2.1 - .8, 0, 1.7, 5.5); ctx.fillStyle = i % 2 ? '#a9b1b8' : '#b6bdc3'; ctx.fill(); for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) { rect(ctx, i * 2.1 - .6 + c * .75, .9 + r * 1.15, .45, .75); ctx.fillStyle = '#8f9aa4'; ctx.fill(); } }
  fogBand(ctx, -5, 5, 0, 5, '#c9cfd4', .55, .1);
  rect(ctx, -5, -.6, 10, .6); ctx.fillStyle = '#6f777f'; ctx.fill();
  ctx.fillStyle = 'rgba(210,220,230,.25)'; ctx.fillRect(-5, -.04, 10, .04);
  lamppost(ctx, -2.95, .2, 1.0);
  phoneBox(ctx, 3.35, .2, 1.05);
  const T_POP = .92;
  let b2i = null;
  bystandersRain(ctx, t, seg(t, 0, 1.3), { popT: T_POP, onB2: w => { b2i = w; } });
  HS.leg = 0; HS.dirt = 0;
  // ---- hero, side view: en garde, a lunge whose tip pops the stuck umbrella's catch, then a courteous salute ----
  const hx = -.35, hy = -.2;
  const prep = kf(t, [[.42, 0], [.62, 1, E.io]]), lunge = kf(t, [[.62, 0], [T_POP, 1, E.o], [1.3, 1], [1.65, 0, E.io]]), salute = kf(t, [[1.7, 0], [1.98, 1, E.io]]);
  const stand = standLegs();
  const garde = [{ th: .35, kn: .45, fa: 0 }, { th: -.3, kn: .35, fa: 0 }], lung = [{ th: .95, kn: .75, fa: .1 }, { th: -.62, kn: .05, fa: -.2 }];
  const legs = stand.map((l, i) => { const g = garde[i], L = lung[i]; const a = { th: lerp(l.th, g.th, prep), kn: lerp(l.kn, g.kn, prep), fa: lerp(0, g.fa, prep) }; return { th: lerp(a.th, L.th, lunge), kn: lerp(a.kn, L.kn, lunge), fa: lerp(a.fa, L.fa, lunge) }; }).map((l, i) => salute > 0 ? { th: lerp(l.th, stand[i].th, salute), kn: lerp(l.kn, stand[i].kn, salute), fa: lerp(l.fa, 0, salute) } : l);
  const lean = -.03 + prep * .05 + lunge * .22 - salute * .05 + (salute > .5 ? .12 * Math.sin(Math.PI * seg(t, 1.98, 2.35)) : 0);
  const xS = hx + lunge * .35;
  const base = heroSide(ctx, { x: xS, y: hy, measure: 1, legs, lean });
  const catchP = t < T_POP ? b2i.catchNow : b2i.catchPop;
  const aim = aimTip(base, t < T_POP ? add(catchP, [-.02 * (1 - seg(t, .62, T_POP)), 0]) : add(catchP, [-.04 * seg(t, T_POP, T_POP + .1), 0]), 1, [.45, .02]);
  const gardeH = add(base.Sh, [.3, -.1]), saluteH = add(base.Sh, [.34, -.06]);
  const ikG = heroArmIK(base.Sh, gardeH, 1), ikS = heroArmIK(base.Sh, saluteH, 1);
  const walkA = armsByDist(0, 0);
  let armL = { sh: lerp(walkA.L.sh, ikG.sh, prep), el: lerp(walkA.L.el, ikG.el, prep), wr: 0 };
  armL = { sh: lerp(armL.sh, aim.arm.sh, lunge), el: lerp(armL.el, aim.arm.el, lunge), wr: 0 };
  armL = { sh: lerp(armL.sh, ikS.sh, salute), el: lerp(armL.el, ikS.el, salute), wr: 0 };
  const armR = { sh: lerp(-.1, -.5, lunge), el: lerp(.4, 1.2, lunge), wr: 0 };
  const mL = heroSide(ctx, { x: xS, y: hy, measure: 1, legs, lean, arms: { L: armL, R: armR } });
  const angAim = Math.atan2(catchP[1] - mL.handL[1], catchP[0] - mL.handL[0]);
  // after the pop the tip never drops back towards her: it rises straight into the salute
  const ang = t < 1.3 ? lerp(lerp(-Math.PI / 2, .05, prep), angAim, lunge) : lerp(angAim, Math.PI / 2 + .28, E.io(seg(t, 1.3, 1.98)));
  heroSide(ctx, { x: xS, y: hy, legs, lean, arms: { L: armL, R: armR }, umb: { ang }, coatFlare: lunge * .9, coatWind: lunge * .35, smirk: t > 1.2 ? .8 : .3, brow: lunge > .5 && t < T_POP ? -.3 : 0, nod: salute > .5 ? .2 * Math.sin(Math.PI * seg(t, 1.98, 2.35)) : 0 });
  if (t > T_POP - .01 && t < T_POP + .14) { const u = seg(t, T_POP - .01, T_POP + .14); ctx.strokeStyle = `rgba(40,40,40,${1 - u})`; ctx.lineWidth = px(2.6); for (let q = 0; q < 6; q++) { const an = q * TAU / 6 + .3; ctx.beginPath(); ctx.moveTo(catchP[0] + Math.cos(an) * .06, catchP[1] + Math.sin(an) * .06); ctx.lineTo(catchP[0] + Math.cos(an) * (.13 + u * .04), catchP[1] + Math.sin(an) * (.13 + u * .04)); ctx.stroke(); } }
  rainLayer(ctx, T, Math.floor(lerp(80, 220, t / 2.54)), { alpha: .6, len: 70, speed: 2100, seed: 5, width: 2 });
  camera(ctx, .1, 1.35, 330);
  const r = rng(Math.floor(T * 12)); ctx.fillStyle = 'rgba(225,232,240,.6)';
  for (let i = 0; i < 22; i++) { const x = -4 + r() * 8, y = -.05 - r() * .45; ell(ctx, x, y, .04, .01); ctx.fill(); }
}, { notes: 'The rain comes on properly and the same four bystanders from the taxi shot dive into cover: a briefcase goes up, a hood goes up. The woman’s red umbrella is stuck and won’t open. He lunges like a fencer, the tip pops its catch, and it springs open over her and the old lady. He finishes with a courteous salute of his own still-closed umbrella.' });

// ---------- 19. Exit ----------
function exitStreet(ctx) {
  const vy = 1.55;
  ctx.fillStyle = '#6c747c'; P(ctx, [[-6, -1], [6, -1], [.3, vy], [-.3, vy]]); ctx.fill();
  ctx.fillStyle = '#8b939a'; P(ctx, [[-6, -1], [-3.6, -1], [-.19, vy], [-.3, vy]]); ctx.fill();
  ctx.fillStyle = '#a8b0b7'; P(ctx, [[-6, -1], [-6, 6], [-.35, 4], [-.35, vy]]); ctx.fill(); P(ctx, [[6, -1], [6, 6], [.35, 4], [.35, vy]]); ctx.fill();
  for (let i = 0; i < 6; i++) { const k = i / 6, x = lerp(-3.2, -.45, k), h = lerp(3.4, .6, k); rect(ctx, x, lerp(-.2, vy - .1, k), .06 * (1 - k) + .01, h); ctx.fillStyle = 'rgba(40,44,50,.5)'; ctx.fill(); }
  for (let i = 0; i < 6; i++) { const k = i / 6, x = lerp(3.2, .45, k), h = lerp(3.4, .6, k); rect(ctx, x, lerp(-.2, vy - .1, k), .06 * (1 - k) + .01, h); ctx.fillStyle = 'rgba(40,44,50,.5)'; ctx.fill(); }
}
shot('Exit', ...CUT(18), (ctx, t, T) => {
  skyFill(ctx, '#98a3ad', '#bfc6cc');
  HS.leg = 0; HS.dirt = 0;
  const pull = E.io(seg(t, 2.0, 3.54));
  const s = lerp(540, 380, pull), cy = lerp(1.62, 1.75, pull);
  camera(ctx, 0, cy, s);
  exitStreet(ctx);
  // the tree where the cat shelters (the next shot's stage), small in the background
  const TX = -1.36, TY = .8, TS = .3;
  streetTree(ctx, TX, TY, TS);
  cat(ctx, -1.0, .785, -1, { pose: 'sit', eyes: 'half', tail: Math.sin(t * 2) * .5, sc: .34 });
  fogBand(ctx, -6, 6, -1, 5, '#b9c1c8', .15, .7);
  ctx.fillStyle = 'rgba(210,220,230,.18)'; for (let i = 0; i < 6; i++) { ell(ctx, (i - 2.5) * .9, -.25 + (i % 2) * .1, .4, .03); ctx.fill(); }
  // ---- hero: a deliberate open (in-betweens, overshoot), a sip, the turn, then away down the street ----
  const open = kf(t, [[.12, 0], [.34, .28, E.io], [.52, 1.08, E.o], [.62, 1, E.io]]);
  const sipT = kf(t, [[.8, 0], [1.05, 1, E.io], [1.4, 1], [1.6, 0, E.io]]);
  const smirk = kf(t, [[1.5, 0], [1.75, 1]]);
  const away = seg(t, 2.2, 3.54);
  const walkPh = (t - 2.2) * 1.0;
  const hy = lerp(0, .95, E.i(away) * .5 + away * .5), hsc = lerp(1, .55, away);
  const L = { sh: .2, el: 2.7 };
  // the turn is cheated with a squash across the body at each change of view (front -> side -> back), so it never pops
  const sx = t < 1.92 ? 1 - .45 * E.i(seg(t, 1.8, 1.92)) : t < 2.2 ? Math.min(1 - .35 * (1 - E.o(seg(t, 1.92, 2.02))), 1 - .35 * E.i(seg(t, 2.1, 2.2))) : 1 - .35 * (1 - E.o(seg(t, 2.2, 2.3)));
  ctx.save(); ctx.translate(0, 0); ctx.scale(sx, 1);
  if (t < 1.92) {
    const shake = t > .5 && t < .7 ? Math.sin((t - .5) * 50) * .02 * (1 - seg(t, .5, .7)) : 0;
    heroFront(ctx, { x: 0, y: 0, farms: { R: { sh: .12, el: -.3 }, L }, umb: { ang: Math.PI / 2 + .15 + shake, open: Math.min(1.08, open) }, sipT, eyes: lerp(.35, .24, smirk), mouth: .2, smirk, hairWind: .1, lookX: t > 1.6 && t < 1.9 ? -.8 : 0 });
  } else if (t < 2.2) {
    // the turn: side view, umbrella and coffee both held in front of him
    heroSide(ctx, { x: 0, y: 0, f: -1, legs: standLegs(), arms: { R: CUP_LOW, L: { sh: .45, el: 2.35, wr: 0 } }, umb: { ang: Math.PI / 2 - .08, open: 1 }, smirk: .8 });
  } else {
    // back view, walking away; the umbrella and the cup are held in front, so only the shaft shows between his hair and the raised canopy
    ctx.save(); ctx.translate(0, hy); ctx.scale(hsc, hsc); const S0 = S; S = S * hsc;
    const Sh = [0, .015 * Math.cos(TAU * walkPh * 2) + 1.0 + HERO.torso];
    drawUmbrella(ctx, -.02, Sh[1] + .02, Math.PI / 2 + .03, { open: 1, cs: 1 });
    heroBack(ctx, { x: 0, y: 0, walk: 1, phase: walkPh, hideHands: 1 });
    S = S0; ctx.restore();
  }
  ctx.restore();
  rainLayer(ctx, T, 200, { alpha: .42, len: 60, speed: 2200, seed: 9 });
  if (open > .9 && t < 1.92) { const r = rng(Math.floor(T * 14)); ctx.fillStyle = 'rgba(230,238,245,.8)'; camera(ctx, 0, cy, s); for (let i = 0; i < 10; i++) { const a = r() * Math.PI; circ(ctx, .1 + Math.cos(a) * .58 * (r() > .5 ? 1 : -1), 2.3 + r() * .1, .012); ctx.fill(); } }
}, { notes: 'He finally opens the umbrella, slowly and properly, takes a sip and turns away. From behind you see only the shaft between his hair and the canopy: the umbrella and the coffee are held in front of him. The orange cat is sheltering under a tree across the street.' });

// ---------- 20. Last word ----------
shot('Last word', ...CUT(19), (ctx, t, T) => {
  skyFill(ctx, '#98a3ad', '#bfc6cc');
  const CAMX = -.92, CAMY = 1.42, CAMS = 860;
  camera(ctx, CAMX, CAMY, CAMS);
  exitStreet(ctx);
  // the man, far off now, still walking away under his umbrella
  { const away = seg(t, 0, 5.42), hy = lerp(1.3, 1.42, away), hsc = lerp(.19, .13, away), walkPh = 1.34 + t;
    ctx.save(); ctx.translate(-.06, hy); ctx.scale(hsc, hsc); const S0 = S; S = S * hsc;
    const Sh = [0, .015 * Math.cos(TAU * walkPh * 2) + 1.0 + HERO.torso];
    drawUmbrella(ctx, -.02, Sh[1] + .02, Math.PI / 2 + .03, { open: 1, cs: 1 });
    heroBack(ctx, { x: 0, y: 0, walk: 1, phase: walkPh, hideHands: 1 });
    S = S0; ctx.restore(); }
  fogBand(ctx, -6, 6, -1, 5, '#b9c1c8', .12, .5);
  const TX = -1.36, TY = .8, TS = .3;
  const tw = (u, v) => [TX + u * TS, TY + v * TS];
  streetTree(ctx, TX, TY, TS);
  const CS = .5, catBase = [-1.0, .83], branchEnd = tw(.88, 2.26), junction = tw(.14, 2.08);
  const T_IN = [.55, 1.05], T_POOP = [1.0, 1.28], T_LAND = 1.55, T_CLIMB = [1.95, 2.35], T_CROUCH = [2.35, 2.85], T_POUNCE = [2.85, 3.0];
  // the pigeon (its own dropping still on its back) flies in, drops one on the cat, lands on the branch, gloats
  const pig = tt => tt < 1.12 ? mix([.3, 2.05], [-.95, 1.78], seg(tt, T_IN[0], 1.12)) : mix([-.95, 1.72], add(branchEnd, [0, .005]), E.o(seg(tt, 1.12, T_LAND)));
  if (t > T_IN[0] && t < T_POUNCE[1]) {
    const q = pig(t);
    const gloat = t > T_LAND && t < T_CROUCH[0] + .2, preen = t >= T_CROUCH[0] + .2;
    pigeon(ctx, q[0], q[1], -1, t < T_LAND ? { flap: t * 7, sc: .6, splat: 1 } : { sc: .6, splat: 1, look: gloat ? 0 : -1, headTilt: gloat ? .5 * Math.sin((t - T_LAND) * 6) : .2, peck: preen ? Math.max(0, Math.sin((t - T_CROUCH[0]) * 9)) * .6 : 0 });
  }
  if (t > T_POOP[0] && t < T_POOP[1]) { const u = seg(t, ...T_POOP), q0 = pig(T_POOP[0]); const p = [lerp(q0[0], catBase[0] - .05, u), lerp(q0[1], catBase[1] + .15, E.i(u))]; ctx.strokeStyle = 'rgba(240,238,228,.5)'; ctx.lineWidth = px(4); ctx.beginPath(); ctx.moveTo(p[0] + .03, p[1] + .1); ctx.lineTo(p[0], p[1] + .02); ctx.stroke(); dropping(ctx, p[0], p[1], 0, .8); }
  // the cat
  const splatOn = t > T_POOP[1];
  let catP = catBase, catO = { pose: 'sit', eyes: 'half', tail: Math.sin(t * 2) * .5, sc: CS }, catF = -1;
  if (t < T_POOP[1]) { const lk = t < .9 ? Math.abs(Math.sin(t * 7)) : 0; catO = { pose: 'sit', eyes: t < .9 ? 'happy' : 'open', tongue: lk > .4 ? lk : 0, headRot: t > .9 ? .35 : -.1, tail: Math.sin(t * 2) * .5, sc: CS }; }
  else if (t < T_CLIMB[0]) {
    const u = seg(t, T_POOP[1], T_POOP[1] + .15);
    catP = add(catBase, [0, Math.sin(Math.PI * u) * .06]);
    const glare = t > T_POOP[1] + .3;
    catO = { pose: 'sit', eyes: glare ? 'half' : 'wide', puff: glare ? 0 : 1, earsBack: 1, headRot: glare ? .55 : .1, tail: glare ? Math.sin(t * 14) * .8 : 1, sc: CS };
  }
  else if (t < T_CLIMB[1]) { const u = seg(t, ...T_CLIMB); catP = [TX + .07, lerp(TY + .05, junction[1] - .02, E.io(u))]; catF = 1; catO = { pose: 'walk', ph: t * 4, rot: Math.PI / 2, eyes: 'half', earsBack: 1, tail: .5, sc: CS }; }
  else if (t < T_POUNCE[0]) { catP = junction; catF = 1; const wig = Math.sin(t * 30) * .006; catP = add(junction, [wig, 0]); catO = { pose: 'crouch', eyes: 'wide', earsBack: 1, tail: Math.sin(t * 20) * .6, sc: CS }; }
  else if (t < T_POUNCE[1]) { const u = seg(t, ...T_POUNCE); catP = [lerp(junction[0], branchEnd[0] - .02, u), lerp(junction[1], branchEnd[1], u) + Math.sin(Math.PI * u) * .06]; catF = 1; catO = { pose: 'leap', eyes: 'wide', tail: .6, sc: CS }; }
  else { catP = add(branchEnd, [-.03, 0]); catF = 1; catO = { pose: 'sit', eyes: t < 3.9 ? 'wide' : 'half', headRot: t < 3.9 ? .5 : .25, feather: 1, tail: .3 + Math.sin(t * 3) * .3, sc: CS }; }
  // the pigeon gets away, minus a few feathers, flapping for its life
  if (t > T_POUNCE[1] + .05) { const u = seg(t, T_POUNCE[1] + .05, T_POUNCE[1] + 1.1); if (u < 1) { const q = [lerp(branchEnd[0] + .05, .45, E.i(u)), lerp(branchEnd[1] + .08, 2.25, u) + Math.sin(u * 20) * .02]; pigeon(ctx, q[0], q[1], 1, { flap: t * 14, sc: .6 }); } }
  cat(ctx, catP[0], catP[1], catF, catO);
  if (splatOn && t < T_CLIMB[0]) { const h = add(catP, [catF * .12 * CS, .36 * CS]); smear(ctx, h[0], h[1] + .012, .02, .3); }
  if (splatOn && t < T_POOP[1] + .15) { const u = seg(t, T_POOP[1], T_POOP[1] + .15), h = add(catBase, [-.05, .16]); ctx.fillStyle = `rgba(240,238,228,${1 - u})`; for (let k = 0; k < 6; k++) { const a = k * TAU / 6; circ(ctx, h[0] + Math.cos(a) * .03 * (1 + u * 2), h[1] + Math.sin(a) * .02 * (1 + u * 2), .006); ctx.fill(); } }
  // feathers
  if (t > T_POUNCE[1] - .02) { const u = t - (T_POUNCE[1] - .02), r = rng(4); for (let k = 0; k < 14; k++) { const a = r() * TAU, v = .12 + r() * .22; const x = branchEnd[0] + Math.cos(a) * v * Math.min(u, .25) * 4 + Math.sin(u * 5 + k) * .02, y = branchEnd[1] + .03 + Math.sin(a) * v * Math.min(u, .25) * 4 - Math.max(0, u - .25) * .1; if (y < TY - .05) continue; local(ctx, x, y, u * 3 + k); ctx.beginPath(); ctx.moveTo(-.045, 0); ctx.quadraticCurveTo(0, .02, .045, 0); ctx.quadraticCurveTo(0, -.015, -.045, 0); fs(ctx, k % 3 ? '#eef0f3' : '#6f7888', OLW * .7); ctx.restore(); } }
  if (t > T_POUNCE[1] - .02 && t < T_POUNCE[1] + .15) { const u = seg(t, T_POUNCE[1] - .02, T_POUNCE[1] + .15); ctx.strokeStyle = `rgba(40,40,40,${1 - u})`; ctx.lineWidth = px(3); for (let q = 0; q < 8; q++) { const a = q * TAU / 8; ctx.beginPath(); ctx.moveTo(branchEnd[0] + Math.cos(a) * .07, branchEnd[1] + .05 + Math.sin(a) * .07); ctx.lineTo(branchEnd[0] + Math.cos(a) * (.13 + u * .05), branchEnd[1] + .05 + Math.sin(a) * (.13 + u * .05)); ctx.stroke(); } }
  rainLayer(ctx, T, 170, { alpha: .4, len: 70, speed: 2200, seed: 9 });
}, { notes: 'The same pigeon, still wearing its own dropping from the bench, finally scores a hit: on the cat sheltering under a tree. It lands on a branch to gloat. The cat glares, climbs, waits, and pounces. Feathers: the pigeon just gets away, flapping for its life, and the cat is left on the branch with one tail feather. It stares after it, feather in its mouth, while the man walks off into the rain.' });
