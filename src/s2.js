// ===== shots 7-11 =====

// ---------- 7. Butcher ----------
function butcherShop(ctx) {
  const red = '#8e2b25';
  rect(ctx, -4, 0, 8, 3); ctx.fillStyle = '#d8cfc0'; ctx.fill();
  rect(ctx, -3.3, 0, 6.6, 2.6); fsb(ctx, red);
  rect(ctx, -2.6, .72, 3.2, 1.9); fsb(ctx, '#f0e2c8');
  ctx.fillStyle = 'rgba(255,240,215,.6)'; ctx.fillRect(-2.55, .75, 3.1, 1.85);
  seg2(ctx, [-2.6, 1.72], [.6, 1.72], 3, '#8a8d93');
  for (let i = 0; i < 5; i++) { const x = -2.25 + i * .62; seg2(ctx, [x, 1.72], [x, 1.62], 1.6, '#555'); ctx.beginPath(); ctx.moveTo(x - .09, 1.6); ctx.quadraticCurveTo(x - .15, 1.2, x - .02, 1.1); ctx.quadraticCurveTo(x + .16, 1.15, x + .09, 1.6); ctx.closePath(); fs(ctx, '#c98a78', 1.4); ctx.fillStyle = 'rgba(255,255,255,.35)'; ell(ctx, x - .03, 1.35, .025, .1); ctx.fill(); }
  rect(ctx, -2.55, .8, 3.1, .12); ctx.fillStyle = '#e9e4dc'; ctx.fill();
  for (let i = 0; i < 6; i++) { rrect(ctx, -2.4 + i * .5, .9, .4, .08, .02); ctx.fillStyle = '#b9c7ac'; ctx.fill(); ell(ctx, -2.3 + i * .5, .96, .06, .025); ctx.fillStyle = '#b4542f'; ctx.fill(); ell(ctx, -2.15 + i * .5, .96, .06, .025); ctx.fill(); }
  rect(ctx, -2.6, .72, 3.2, 1.9); ctx.strokeStyle = shade(red, -.3); ctx.lineWidth = .05; ctx.stroke();
  txt(ctx, 'FAMILY BUTCHER', -1.6, 2.12, .13, '#8e2b25');
  rect(ctx, .95, 0, .95, 2.3); ctx.fillStyle = '#2b2220'; ctx.fill();
  rect(ctx, 1.85, 0, .08, 2.3); ctx.fillStyle = shade(red, -.2); ctx.fill();
  P(ctx, [[1.9, 0], [2.25, .08], [2.25, 2.2], [1.9, 2.3]]); fsb(ctx, red); P(ctx, [[1.95, .9], [2.2, .95], [2.2, 2.05], [1.95, 2.1]]); ctx.fillStyle = '#9fb0b8'; ctx.fill();
  pavement(ctx, -4, 4, -.6, 0, '#c1bbb1', { rows: 1 });
}
// polyline helpers for the sausage chain
const plLen = pts => { let L = 0; for (let i = 0; i < pts.length - 1; i++) L += dist(pts[i], pts[i + 1]); return L; };
const plAt = (pts, f) => { let a = f * plLen(pts); for (let i = 0; i < pts.length - 1; i++) { const d = dist(pts[i], pts[i + 1]); if (a <= d || i === pts.length - 2) return mix(pts[i], pts[i + 1], d ? clamp(a / d) : 0); a -= d; } return pts[pts.length - 1]; };
const plRes = (pts, n) => { const o = []; for (let k = 0; k < n; k++) o.push(plAt(pts, k / (n - 1))); return o; };
const plSub = (pts, f0, f1, n) => { const o = []; for (let k = 0; k < n; k++) o.push(plAt(pts, lerp(f0, f1, k / (n - 1)))); return o; };
shot('Butcher', ...CUT(6), (ctx, t) => {
  skyFill(ctx, '#c9ced1', '#d7d9da');
  const { T_LOOK, T_WIPE, T_HOOK, T_TURN, T_GRAB, T_C1, T_C2, T_SPEAR, T_SIP } = MOMENTS('Butcher');
  const NS = 8, NP = 12;
  // ---- camera: a gentle pan, then a push-in on the last three sausages for the cut ----
  const zoom = kf(t, [[2.3, 0], [2.68, 1, E.io], [3.68, 1], [4.08, 0, E.io]]);
  const zw = kf(t, [[.35, 0], [.58, 1, E.io], [.95, 1], [1.25, 0, E.io]]);
  const cx0 = lerp(-.45, .12, E.sine(seg(t, 0, 2.3))), focus = [.85, .5], focusW = [-.78, 1.0];
  const cxz = lerp(lerp(cx0, focusW[0], zw * .8), focus[0], zoom), cyz = lerp(lerp(1.0, focusW[1], zw * .8), focus[1], zoom);
  camera(ctx, cxz, cyz, 430 * Math.pow(1000 / 430, zoom) * Math.pow(1.25, zw));
  butcherShop(ctx);
  // ---- the dog: runs out with the whole chain; when it is lifted off its back it turns and digs in ----
  const dogX = kf(t, [[0, 1.55], [1.3, .18, E.lin], [1.45, .12, E.o]]);
  // a quick hop-turn (not a flip on the spot)
  const turnU = seg(t, T_TURN - .06, T_TURN + .06), dogF = t < T_TURN - .06 ? -1 : t > T_TURN + .06 ? 1 : (turnU < .5 ? -1 : 1) * Math.max(.15, Math.abs(Math.cos(Math.PI * turnU))), dogHop = .07 * Math.sin(Math.PI * turnU);
  const dogRun = t < 1.35;
  const mouthAt = f => [dogX + .37 * f, .265];   // the chain starts inside the jaws (drawn behind the head)
  const mouth = t < T_TURN ? mouthAt(-1) : mix(mouthAt(-1), mouthAt(1), E.o(seg(t, T_TURN, T_TURN + .1)));
  // ---- the butcher: shouts from the door, comes out, grabs the far end, tugs; reels his sausages in ----
  const butX = kf(t, [[1.35, 1.6], [1.95, 1.42, E.o], [T_C1, 1.42], [T_C1 + .15, 1.5, E.o], [5.96, 1.5]]);
  const bRun = t > 1.35 && t < 1.95;
  const tug = t > T_GRAB && t < T_C1;
  const bEx = t < 1.95 ? { eyes: 'wide', mouth: 'o', brow: 1.2 } : t < T_C1 ? { eyes: 'open', mouth: 'flat', brow: -1, lookY: -1, lookX: -1 } : t < T_C1 + .4 ? { eyes: 'wide', mouth: 'o', brow: 1 } : { eyes: 'happy', mouth: 'grin' };
  const reachEnd = kf(t, [[1.7, 0], [T_GRAB, 1, E.o]]);
  const bArm = t < 1.35 ? { sh: 2.4 + Math.sin(t * 14) * .2, el: .4 } : { sh: lerp(bRun ? 1.0 : .3, 1.0, reachEnd), el: lerp(.4, .5, reachEnd) };
  let bOut = null;
  if (t > .25) {
    if (t < 1.35) { ctx.save(); rect(ctx, .95, -1, 1.2, 4); ctx.clip(); }
    bOut = personSide(ctx, CAST.butcher, { x: t < 1.35 ? lerp(2.1, 1.62, E.o(seg(t, .25, .55))) : butX, f: -1, legs: bRun ? walkLegs(t / .45, .45) : standLegs(.07, .05), lean: bRun ? .2 : tug ? -.14 + Math.sin(t * 20) * .02 : 0, arms: { near: bArm, far: { sh: bRun ? -.5 : tug ? .9 : .15, el: tug ? .6 : .3 } }, ex: bEx, nod: t > 4.2 && t < 4.5 ? .25 : 0 });
    if (t < 1.35) ctx.restore();
  }
  const bHand = bOut && t > 1.35 ? bOut.handN : [butX - .3, .95];
  // ---- the hero ----
  // he steps in once the butcher has the far end, so the tip can reach the last sausages
  const heroX = kf(t, [[0, -2.1], [.55, -.98, E.o], [.9, -.98], [1.12, -.72, E.io], [2.02, -.72], [2.45, -.15, E.io], [4.85, -.15], [5.96, .2, E.i]]);
  const spd = kf(t, [[0, 1], [.45, 1], [.55, .1], [.9, .1], [.97, .8], [1.12, .1], [2.0, .1], [2.08, .8], [2.38, .8], [2.48, .1], [4.85, .1], [5.05, .9]]);
  const d = heroX + 2.1;
  // for the wipe he lifts his knee and draws the tip down the front of his shin in one stroke
  const knee = kf(t, [[.5, 0], [.64, 1, E.o], [.96, 1], [1.06, 0, E.io]]);
  // for the cuts he drops into a fencer's lunge (as in the rain later)
  const lungeB = kf(t, [[2.4, 0], [2.65, 1, E.io], [3.45, 1], [3.85, 0, E.io]]), LUNGE = [{ th: .95, kn: .75, fa: .1 }, { th: -.62, kn: .05, fa: -.2 }];
  const legs = legsByDist(d, spd).map((l, i) => i === 0 ? { th: lerp(l.th, 1.2, knee), kn: lerp(l.kn, 1.35, knee), fa: lerp(l.fa, .2, knee) } : l).map((l, i) => ({ th: lerp(l.th, LUNGE[i].th, lungeB), kn: lerp(l.kn, LUNGE[i].kn, lungeB), fa: lerp(l.fa, LUNGE[i].fa, lungeB) }));
  const leanB = .2 * kf(t, [[2.4, 0], [2.65, 1, E.io], [3.45, 1], [3.85, 0, E.io]]);
  const base = heroSide(ctx, { x: heroX, y: 0, measure: 1, legs, lean: leanB });
  HS.tip = t < (T_WIPE[0] + T_WIPE[1]) / 2 ? 1 : 0;
  if (t > T_WIPE[1]) HS.leg = 1;
  // chain geometry for each phase
  const hookTip = [dogX - .04, .56], liftP = [.42, .86];
  const onDog = plRes([mouthAt(-1), [dogX - .28, .45], [dogX - .05, .48], [dogX + .16, .45], [dogX + .25, .33], [dogX + .32, .05], [dogX + .62, .02]], NP);
  const taut = plRes([mouth, [lerp(mouth[0], bHand[0], .45), Math.min(mouth[1], bHand[1]) - .02], bHand], NP);
  // the cut points: two sausages from the mouth, then one
  const cp1 = (() => { let a = 2 * .15; for (let i = 0; i < taut.length - 1; i++) { const dd = dist(taut[i], taut[i + 1]); if (a <= dd) return mix(taut[i], taut[i + 1], a / dd); a -= dd; } return taut[taut.length - 1]; })(), link2 = add(mouthAt(1), [.15, 0]);
  const s2Fall = tt => { const u = Math.max(0, tt - T_C2); return [link2[0] + .01, link2[1] - .075 - 4.9 * u * u]; };
  const spearP = add(s2Fall(T_SPEAR), [.04, -.085]);   // the tip ends just out of the far end of the sausage
  // where the tip is
  const onShin = u => add(mix(base.L[0].K, base.L[0].A, u), [.035, 0]);
  let tipT, act, handOv = null;
  if (t < T_LOOK[1]) { act = E.io(seg(t, T_LOOK[0], T_LOOK[0] + .12)); tipT = [heroX + .4, 1.63]; }
  else if (t < T_WIPE[0]) {
    // from sniffing to the shin: the hand rises while the umbrella swings down in front of him (hand and angle interpolated, never behind his head)
    act = 1; const tipL = [heroX + .4, 1.63], hA = aimTip(base, tipL, 1, [.3, -.3]).hand, hB = aimTip(base, onShin(.2), 1, [.26, .14]).hand;
    const aA = Math.atan2(tipL[1] - hA[1], tipL[0] - hA[0]), aB = Math.atan2(onShin(.2)[1] - hB[1], onShin(.2)[0] - hB[0]), u = E.io(seg(t, T_LOOK[1], T_WIPE[0]));
    handOv = mix(hA, hB, u); const aI = lerp(aA, aB, u); tipT = add(handOv, [Math.cos(aI) * UL, Math.sin(aI) * UL]);
  }
  else if (t < T_WIPE[1]) { act = 1; tipT = onShin(lerp(.2, .66, E.io(seg(t, ...T_WIPE)))); }
  else if (t < 1.0) { act = 1; tipT = mix(onShin(.66), [heroX + .7, .75], E.o(seg(t, T_WIPE[1] + .04, 1.04))); }
  else if (t < T_HOOK) { act = 1; tipT = mix([heroX + .7, .75], hookTip, E.io(seg(t, 1.0, T_HOOK))); }
  else if (t < T_GRAB + .05) { act = 1; tipT = mix(hookTip, liftP, E.o(seg(t, T_HOOK, T_HOOK + .3))); }
  else if (t < 2.5) { act = 1; tipT = mix(liftP, add(cp1, [-.08, .3]), E.io(seg(t, T_GRAB + .05, 2.5))); }
  else if (t < 2.72) { act = 1; tipT = mix(add(cp1, [-.08, .3]), add(cp1, [-.14, .46]), E.io(seg(t, 2.5, 2.72))); }          // wind-up
  else if (t < T_C1) { act = 1; tipT = mix(add(cp1, [-.14, .46]), add(cp1, [.02, -.05]), E.i(seg(t, 2.72, T_C1))); }       // chop
  else if (t < 3.0) { act = 1; tipT = mix(add(cp1, [.02, -.05]), add(cp1, [-.03, .12]), E.o(seg(t, T_C1, 3.0))); }           // recoil
  else if (t < 3.12) { act = 1; tipT = mix(add(cp1, [-.03, .12]), add(link2, [-.03, .26]), E.io(seg(t, 3.0, 3.12))); }
  else if (t < T_C2) { act = 1; tipT = mix(add(link2, [-.03, .26]), link2, E.i(seg(t, 3.12, T_C2))); }              // the snip...
  else if (t < T_SPEAR) { act = 1; tipT = mix(link2, spearP, seg(t, T_C2, T_SPEAR)); }                                 // ...runs on into the falling sausage
  else { act = 1; tipT = mix(spearP, [heroX + .75, 1.75], E.io(seg(t, T_SPEAR + .03, 3.8))); }
  if (t > T_SPEAR) HS.sausage = 1;
  const arms = armsByDist(d, spd);
  const wA = t < T_WIPE[0] ? 0 : 1 - E.io(seg(t, 1.0, 1.3));
  const aim = handOv ? { arm: heroArmIK(base.Sh, handOv, 1) } : aimTip(base, tipT, 1, mix([.3, -.3], [.26, .14], wA));
  arms.L = { sh: lerp(arms.L.sh, aim.arm.sh, act), el: lerp(arms.L.el, aim.arm.el, act), wr: 0 };
  arms.R = { sh: -.2, el: .8, wr: 0 };     // coffee low and back while the umbrella works
  const m = heroSide(ctx, { x: heroX, y: 0, measure: 1, legs, arms, lean: leanB });
  let ang = lerp(-Math.PI / 2 + .15, Math.atan2(tipT[1] - m.handL[1], tipT[0] - m.handL[0]), E.io(act));
  // afterwards: umbrella up like a torch with the sausage on top, a sip
  const torch = kf(t, [[3.8, 0], [4.15, 1, E.io]]);
  const armT = heroArmIK(base.Sh, add(base.Sh, [.24, -.2]), 1);
  arms.L = { sh: lerp(arms.L.sh, armT.sh, torch), el: lerp(arms.L.el, armT.el, torch), wr: 0 };
  ang = lerp(ang, 1.3, torch);
  const sipT = kf(t, [[T_SIP[0], 0], [T_SIP[1], 1, E.io], [T_SIP[2], 1], [T_SIP[3], 0, E.io]]);
  arms.R = blendArm({ sh: -.2, el: .8 }, CUP_LOW, torch);   // umbrella up like a torch, so the coffee stays low
  const disgust = t > T_LOOK[0] + .05 && t < T_WIPE[0];
  heroSide(ctx, { x: heroX, y: 0, legs, arms, lean: leanB, umb: { ang }, sipT, coatShort: knee * .55, coatFlare: knee * .5, nod: disgust ? .2 : 0, brow: disgust ? -.8 : t > 2.6 && t < 3.4 ? -.3 : 0, mouth: disgust ? -.6 : 0, smirk: t > T_WIPE[1] && !(t > 2.6 && t < 3.4) ? .7 : 0 });
  const mm = heroSide(ctx, { x: heroX, y: 0, measure: 1, legs, arms, lean: leanB });
  const tipNow = umbTip(mm.handL, ang);
  globalThis.__tipErr = [dist(tipNow, tipT), tipT.map(v=>+v.toFixed(2)), tipNow.map(v=>+v.toFixed(2)), mm.handL.map(v=>+v.toFixed(2)), base.Sh.map(v=>+v.toFixed(2))];
  // the look (it stinks), the one clean swipe down his shin, the glint of a clean tip
  if (t > T_LOOK[0] && t < T_WIPE[0]) smellLines(ctx, add(tipNow, [0, .05]), t, Math.sin(Math.PI * seg(t, T_LOOK[0], T_WIPE[0])) * 1.3, 'rgba(110,125,60,.9)', 3.4);
  if (t > T_WIPE[0] && t <= T_WIPE[1]) { const u = lerp(.2, .66, E.io(seg(t, ...T_WIPE))); if (u > .28) streak(ctx, mix(base.L[0].K, base.L[0].A, .26), mix(base.L[0].K, base.L[0].A, Math.min(.6, u)), .05); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = px(3); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(...add(onShin(.2), [.06, 0])); ctx.lineTo(...add(onShin(u), [.06, 0])); ctx.stroke(); }
  if (t > .92 && t < 1.14) sparkle(ctx, tipNow, .08 * Math.sin(Math.PI * seg(t, .92, 1.14)), 1);
  // ---- the chain: a fixed length (eight sausages); whatever the path doesn't use hangs down / lies on the ground ----
  const SL = .15, CL = NS * SL;
  const plTrim = (pts, len) => { const o = [pts[0]]; let a = len; for (let i = 0; i < pts.length - 1; i++) { const dd = dist(pts[i], pts[i + 1]); if (a <= dd) { o.push(dd ? mix(pts[i], pts[i + 1], a / dd) : pts[i + 1]); return o; } o.push(pts[i + 1]); a -= dd; } return o; };
  const chainOf = path => { const e = path[path.length - 1]; return plTrim([...path, [e[0] + .001, Math.min(e[1], .04)], [e[0] + 3, .04]], CL); };
  const hooked = plRes([mouth, [lerp(mouth[0], tipNow[0], .5), Math.min(mouth[1], tipNow[1]) - .05], tipNow, [tipNow[0] + .2, .35], [tipNow[0] + .3, .04]], NP);
  const grabbed = plRes([mouth, [lerp(mouth[0], tipNow[0], .5), Math.min(mouth[1], tipNow[1]) - .05], tipNow, bHand], NP);
  const k1 = E.io(seg(t, T_HOOK, T_HOOK + .2)), k2 = E.io(seg(t, T_GRAB - .1, T_GRAB + .08)), k3 = E.io(seg(t, T_GRAB + .08, 2.35));
  const chainT = chainOf(taut);
  const chain = chainOf(onDog.map((p, i) => mix(mix(mix(p, hooked[i], k1), grabbed[i], k2), taut[i], k3)));
  const cut1 = t >= T_C1, cut2 = t >= T_C2;
  // the chain is drawn behind the dog: it comes out of its jaws (and trails on the far side while it runs)
  if (!cut1) sausageChain(ctx, chain, NS);
  else { const q = add(mouthAt(1), [.075, 0]); ell(ctx, q[0], q[1], .075, .036); fs(ctx, '#b4542f', OLW * .9); ctx.fillStyle = 'rgba(255,230,210,.45)'; ell(ctx, q[0] - .01, q[1] + .013, .045, .009); ctx.fill(); circ(ctx, q[0] + .075, q[1], .013); ctx.fillStyle = '#7a3420'; ctx.fill(); }
  // ---- the dog ----
  const tugR = t > T_TURN && t < T_C1 ? -.1 + Math.sin(t * 22) * .03 : 0;
  const chew = cut2 ? Math.abs(Math.sin((t - T_C2) * 9)) : 0;
  // an upper and a lower tooth clamp it at the lips
  const teeth = c => { P(c, [[.158, -.04], [.18, -.04], [.169, -.066]]); fs(c, '#fbf7ee', OLW * .6); P(c, [[.152, -.094], [.172, -.094], [.162, -.07]]); fs(c, '#fbf7ee', OLW * .6); };
  bulldog(ctx, dogX, dogHop, dogF, { run: t * 2.8, running: dogRun ? 1 : 0, wag: cut2 ? 1 : .3, rot: tugR + (cut1 && !cut2 ? .05 * Math.exp(-(t - T_C1) * 6) : 0), headRot: tugR * .5 + (cut2 ? -.05 * chew : 0), mouthItem: teeth });
  if (cut1) {
    // the butcher's six: swing free from his hand and get reeled in
    const tc = t - T_C1, sw = Math.sin(tc * 11) * .16 * Math.exp(-tc * 3), reel = seg(t, 3.9, 5.2);
    const hang = [bHand, add(bHand, [-.04 + sw * .3, -.2 + reel * .1]), add(bHand, [-.02 + sw, -.42 + reel * .22]), add(bHand, [.04 + sw * 1.4, -.62 + reel * .32])];
    const from = plSub(chainT, 2 / NS, 1, 4).reverse();
    const k = E.o(seg(t, T_C1, T_C1 + .25));
    sausageChain(ctx, plRes(from.map((p, i) => mix(p, hang[i], k)), NP), 6);
    // the dog's two: the second dangles from the one in its mouth until the second cut
    if (!cut2) { const sw2 = Math.sin((t - T_C1) * 9) * .2 * Math.exp(-(t - T_C1) * 2.5), top = link2, bot = add(link2, [.02 + sw2 * .5, -.15]); const kd = E.o(seg(t, T_C1, T_C1 + .2)); const fromD = plSub(chainT, 1 / NS, 2 / NS, 2); sausageChain(ctx, [mix(fromD[0], top, kd), mix(fromD[1], bot, kd)], 1); }
    // the second one drops... straight onto the tip that cut it
    else if (t < T_SPEAR) { const q = s2Fall(t); local(ctx, q[0], q[1], lerp(Math.PI / 2, ang + Math.PI, seg(t, T_C2, T_SPEAR))); ell(ctx, 0, 0, .075, .036); fs(ctx, '#b4542f', OLW * .9); ctx.restore(); }
  }
  // accents: two chops and a stab
  const burst = (p, t0, r0) => { if (t > t0 - .01 && t < t0 + .12) { const u = seg(t, t0 - .01, t0 + .12); ctx.strokeStyle = `rgba(40,40,40,${1 - u})`; ctx.lineWidth = px(2.6); ctx.lineCap = 'round'; for (let q = 0; q < 6; q++) { const an = q * TAU / 6 + .3; ctx.beginPath(); ctx.moveTo(p[0] + Math.cos(an) * r0, p[1] + Math.sin(an) * r0); ctx.lineTo(p[0] + Math.cos(an) * (r0 * 2 + u * .03), p[1] + Math.sin(an) * (r0 * 2 + u * .03)); ctx.stroke(); } } };
  burst(cp1, T_C1, .045); burst(link2, T_C2, .04); burst(spearP, T_SPEAR, .05);
  // motion streaks along the tip's path: the chop, then the snip that runs on into the sausage
  const streakPath = (pts, t0, t1, w) => { if (t < t0 || t > t1 + .1) return; const a = t < t1 ? 1 : 1 - seg(t, t1, t1 + .1), u = seg(t, t0, t1); ctx.strokeStyle = `rgba(255,255,255,${.9 * a})`; ctx.lineWidth = px(w); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); const n = 12; for (let i = 0; i <= n; i++) { const q = plAt(pts, Math.min(1, i / n) * Math.max(.05, u)); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); } ctx.stroke(); };
  ctx.save(); rect(ctx, mouthAt(1)[0] + .02, -1, 5, 5); ctx.clip();
  streakPath([add(cp1, [-.14, .46]), add(cp1, [.02, -.05])], 2.74, T_C1, 7);
  streakPath([add(link2, [-.03, .26]), link2, spearP], 3.14, T_SPEAR, 6);
  ctx.restore();
}, { notes: 'The bulldog runs out with the butcher’s whole chain of sausages. The man sniffs his soiled tip and, in one clean swipe down his own shin, wipes it: the dropping goes on his trousers, the tip glints clean. He lifts the chain off the dog’s back; the dog turns and digs in, the butcher grabs the far end. Close in: one chop leaves the dog two, a ninja slash leaves it one, and the man spears the other in mid-air. The butcher gets the rest back, the dog chews, and the man walks on with a sausage on his tip.' });

// ---------- 8. Cat ----------
shot('Cat', ...CUT(7), (ctx, t) => {
  skyFill(ctx, '#c4ccd0', '#d9dcd8');
  camera(ctx, .45, 1.22, 400);
  ctx.fillStyle = '#c9cdcc'; ctx.fillRect(-4, .4, 9, 2.6);
  for (let i = 0; i < 9; i++) { rect(ctx, -3.6 + i * 1.0, 1.2, .35, .6); ctx.fillStyle = '#b7bec2'; ctx.fill(); rect(ctx, -3.6 + i * 1.0, 2.1, .35, .5); ctx.fill(); }
  fogBand(ctx, -5, 6, .3, 3.5, '#dcdfdc', .65, .2);
  ctx.globalAlpha = .5; tree(ctx, -2.6, .3, .6, { leaf: '#9fb09a', flat: 1 }); tree(ctx, -1.0, .35, .5, { leaf: '#a7b5a2', flat: 1 }); ctx.globalAlpha = 1;
  rect(ctx, -5, -.9, 11, 1.25); ctx.fillStyle = '#8fae6c'; ctx.fill();
  rect(ctx, -5, -.2, 11, .32); ctx.fillStyle = '#d1c6aa'; ctx.fill();
  P(ctx, [[1.75, -.2], [2.35, -.2], [2.2, 3.6], [1.85, 3.6]]); fsb(ctx, '#5b4a3c');
  ctx.beginPath(); ctx.moveTo(1.9, 2.25); ctx.quadraticCurveTo(1.0, 2.25, .15, 2.02); ctx.lineTo(.2, 1.95); ctx.quadraticCurveTo(1.0, 2.12, 1.9, 2.05); ctx.closePath(); fsb(ctx, '#5b4a3c');
  ctx.beginPath(); [[2.1, 3.7, 1.0], [1.2, 3.35, .75], [.4, 3.1, .5], [2.9, 3.3, .8]].forEach(([a, b, c]) => { ctx.moveTo(a + c, b); ctx.arc(a, b, c, 0, TAU); }); ctx.fillStyle = '#6b8a58'; ctx.fill();
  const branchY = x => lerp(2.03, 2.2, clamp((x - .15) / 1.75));
  HS.sausage = 1; HS.leg = 1;
  const CX = 1.12, CY = branchY(CX) + .01;
  const mouthC = [CX - .2 - .075, CY + .135 - .035];
  const { T_UP, T_STARTLE, T_SNIFF, T_LICK, T_DOWN, T_WIPE, T_JUMP, T_SIP } = MOMENTS('Cat');
  // ---- girl ----
  // she pleads facing the tree; when the tip comes down to her she turns round and offers her palm
  const { T_TURN } = MOMENTS('Cat'), gf = t < T_TURN ? 1 : -1;
  const catLand = [.5, 0];
  const kneel = E.io(seg(t, 3.34, 3.62));
  const standG = standLegs(.04, .03), kLegs = [{ th: .5, kn: 2.2, fa: -1.2 }, { th: .35, kn: 2.1, fa: -1.1 }];
  const gLegs = standG.map((l, i) => ({ th: lerp(l.th, kLegs[i].th, kneel), kn: lerp(l.kn, kLegs[i].kn, kneel), fa: lerp(0, kLegs[i].fa, kneel) }));
  const hop = t < .8 ? Math.abs(Math.sin(t * 9)) * .025 : Math.abs(t - T_TURN) < .08 ? .03 * Math.cos((t - T_TURN) / .08 * Math.PI / 2) : 0;
  const gx = lerp(.88, 1.0, kneel), gLean = lerp(0, .7, kneel);
  const Dg = dims(CAST.catGirl);
  const gMeas = personSide(ctx, CAST.catGirl, { x: gx, y: hop, f: gf, legs: gLegs, lean: gLean, measure: 1 });
  const JN = add(gMeas.Sh, [0, -Dg.limbW * .5]);
  const gik = (tgt) => { const r = ik2((tgt[0] - JN[0]) * gf, tgt[1] - JN[1], Dg.up, Dg.fo); return { sh: r[0], el: r[1] }; };
  const offerP = [gx - .3, .7];
  let nearArm, farArm;
  if (t < .8) { nearArm = { sh: 2.05 + Math.sin(t * 8) * .08, el: .2 }; farArm = { sh: 2.2, el: .35 }; }
  else if (t < T_TURN) { const u = E.io(seg(t, .8, 1.05)); nearArm = { sh: lerp(2.05, 1.05, u), el: lerp(.2, 1.55, u) }; farArm = { sh: lerp(2.2, .95, u), el: lerp(.35, 1.65, u) }; }
  else {
    const off = gik(offerP), u = E.o(seg(t, T_TURN, T_TURN + .14));
    const lick = gik([catLand[0] + .23, .25]);
    const strokes = seg(t, 3.7, 4.5), su = .5 - .5 * Math.cos(strokes * TAU * 2), petX = lerp(catLand[0] + .13, catLand[0] - .01, su), pet = gik([petX, lerp(.46, .36, su)]);
    nearArm = { sh: lerp(lerp(.3, off.sh, u), lick.sh, kneel), el: lerp(lerp(.4, off.el, u), lick.el, kneel) };
    farArm = { sh: lerp(-.1, pet.sh, kneel), el: lerp(.25, pet.el, kneel) };
  }
  const gMeas2 = personSide(ctx, CAST.catGirl, { x: gx, y: hop, f: gf, legs: gLegs, lean: gLean, arms: { near: nearArm, far: farArm }, measure: 1 });
  const gHand = gMeas2.handN;
  // ---- hero ----
  const hx = kf(t, [[0, -2.05], [.9, -.35, E.o]]);
  const spd = kf(t, [[0, 1], [.72, 1], [.9, .1]]);
  const d = Math.abs(hx + 2.05);
  const base = heroSide(ctx, { x: hx, y: 0, measure: 1, legs: legsByDist(d, spd) });
  const catHeadShift = t < T_STARTLE[0] ? 0 : t < T_SNIFF[0] ? -.05 * E.o(seg(t, T_STARTLE[0], T_STARTLE[0] + .08)) : t < T_LICK[0] ? lerp(-.05, .025, E.io(seg(t, T_SNIFF[0], T_SNIFF[0] + .2))) : .02;
  const tipCat = [mouthC[0] - .045, mouthC[1] - .01];
  const wipeA = add(gHand, [.08, .035]), wipeB = add(gHand, [-.05, .02]);
  let tipT;
  if (t < T_DOWN[0]) tipT = add(tipCat, [Math.sin(t * 5) * .004, 0]);
  else if (t < T_WIPE[0]) { const u = E.io(seg(t, ...T_DOWN)), mid = [wipeA[0] - .08, wipeA[1] + .5]; tipT = mix(mix(tipCat, mid, u), mix(mid, wipeA, u), u); }
  else tipT = mix(wipeA, wipeB, E.io(seg(t, ...T_WIPE)));
  const raise = kf(t, [[T_UP[0], 0], [T_UP[1], 1, E.io], [T_WIPE[1], 1], [3.3, 0, E.io]]);
  const aim = aimTip(base, tipT, 1, [.32, -.18]);
  const arms = armsByDist(d, spd);
  // he walks in carrying the umbrella up like a torch, the sausage on top (as he left the butcher's)
  const torch = t < T_UP[1] ? 1 : 0, armT = heroArmIK(base.Sh, add(base.Sh, [.24, -.2]), 1);
  const baseL = torch ? { sh: armT.sh, el: armT.el } : arms.L, baseAng = t < T_UP[1] ? 1.3 : -Math.PI / 2 + .15;
  arms.L = { sh: lerp(baseL.sh, aim.arm.sh, raise), el: lerp(baseL.el, aim.arm.el, raise), wr: 0 };
  arms.R = { sh: -.15, el: lerp(.7, 1.45, seg(t, 3.4, 3.75)), wr: 0 };   // coffee low while the umbrella hand works up at his chest
  const m = heroSide(ctx, { x: hx, y: 0, measure: 1, legs: legsByDist(d, spd), arms });
  const ang = lerp(baseAng, Math.atan2(tipT[1] - m.handL[1], tipT[0] - m.handL[0]), E.io(raise));
  if (t > T_WIPE[0] + .1) HS.sausage = 0;
  const sipT = kf(t, [[T_SIP[0], 0], [T_SIP[1], 1, E.io], [T_SIP[2], 1], [T_SIP[3], .5]]);
  heroSide(ctx, { x: hx, y: 0, legs: legsByDist(d, spd), arms, umb: { ang }, sipT, smirk: t > 3.3 ? .6 : 0 });
  const tipNow = umbTip(m.handL, ang);
  // the smell of sausage: a warm wisp from the scrap on the tip, later from her hand
  if (t > .95 && t < T_LICK[0]) smellLines(ctx, add(tipNow, [-.02, .05]), t, E.o(seg(t, .95, 1.1)) * (1 - seg(t, 1.7, 1.82)), 'rgba(150,95,55,.85)', 3);
  if (t > T_WIPE[1] && t < 3.35) smellLines(ctx, add(gHand, [0, .06]), t, 1 - seg(t, 3.2, 3.35), 'rgba(150,95,55,.85)', 3);
  // the flick: the sausage slides off the tip into her palm
  if (t > T_WIPE[0] && t < T_WIPE[0] + .1) { const u = E.io(seg(t, T_WIPE[0], T_WIPE[0] + .1)), p0 = add(tipNow, [-Math.cos(ang) * .095, -Math.sin(ang) * .095]), p1 = add(gHand, [.03 * gf, .03]); const q = mix(p0, p1, u); local(ctx, q[0], q[1] + Math.sin(Math.PI * u) * .05, lerp(ang, Math.PI + .15 * gf, u)); ell(ctx, 0, 0, .075, .034); fs(ctx, '#b4542f', OLW * .9); ctx.restore(); }
  // ---- girl drawn in front of the hero ----
  const gEx = t < T_UP[0] ? { eyes: 'open', mouth: t % .5 < .3 ? 'o' : 'smile', sadBrow: 1, lookY: 1, lookX: .6 }
    : t < T_TURN ? { eyes: 'wide', mouth: 'o', brow: 1, lookY: 1, lookX: .5 }
    : t < T_WIPE[0] ? { eyes: 'wide', mouth: 'o', brow: 1.1, lookY: .2, lookX: .8 }
    : t < T_JUMP[0] + .1 ? { eyes: 'wide', mouth: 'flat', brow: .6, lookY: -.8, lookX: .7 }
    : { eyes: 'happy', mouth: 'grin' };
  const greasyPalm = (c, w) => {
    palm(c, w, kneel > .5 ? .25 : -.05, CAST.catGirl, 1.15, gf);
    if (t > T_WIPE[0] + .1) { const eat = seg(t, 3.7, 4.45), L = .075 * (1 - eat * .85); if (eat < 1) { local(c, w[0] + .03 * gf, w[1] + .03, .15 * gf); ell(c, 0, 0, L, .034); fs(c, '#b4542f', OLW * .9); c.fillStyle = 'rgba(255,230,210,.45)'; ell(c, -.01, .012, L * .55, .008); c.fill(); c.restore(); } }
  };
  personSide(ctx, CAST.catGirl, { x: gx, y: hop, f: gf, legs: gLegs, lean: gLean, arms: { near: nearArm, far: farArm }, ex: gEx, nod: t < T_TURN ? -.35 : lerp(.05, .2, kneel), hold: t > T_TURN ? { near: greasyPalm } : {} });
  // ---- the cat ----
  if (t < T_JUMP[0] - .05) {
    let ex = { pose: 'loaf', eyes: 'half', tailDown: 1, tail: Math.sin(t * 2.2) * .8 };
    if (t > .3 && t < .7) { ex.meow = Math.sin(Math.PI * seg(t, .3, .7)); ex.headRot = .2 * ex.meow; }
    if (t >= T_STARTLE[0] && t < T_SNIFF[0]) Object.assign(ex, { eyes: 'wide', headX: catHeadShift, headRot: .35, puff: 1, earsBack: 1, pose: 'crouch', tailDown: 0, tail: 1 });
    else if (t >= T_SNIFF[0] && t < T_LICK[0]) Object.assign(ex, { eyes: 'open', headX: catHeadShift, sniff: t });
    else if (t >= T_LICK[0] && t < T_DOWN[0]) Object.assign(ex, { eyes: 'happy', headX: catHeadShift, tongue: .6 + .4 * Math.abs(Math.sin((t - T_LICK[0]) * 14)) });
    else if (t >= T_DOWN[0]) Object.assign(ex, { eyes: 'wide', headX: .01, headRot: -.75 * E.o(seg(t, T_DOWN[0], T_DOWN[0] + .3)), pose: t > 2.72 ? 'crouch' : 'loaf', tailDown: t > 2.72 ? 0 : 1, tail: .6 });
    cat(ctx, CX, CY, -1, ex);
  } else if (t < T_JUMP[1]) {
    const u = seg(t, T_JUMP[0] - .05, T_JUMP[1]);
    const p = [lerp(CX, catLand[0], u) - Math.sin(Math.PI * u) * .35, lerp(CY, catLand[1], E.i(u)) + Math.sin(Math.PI * u) * .12];   // it leaps out and down in front of her, not across her face
    cat(ctx, p[0], p[1], -1, { pose: 'leap', eyes: 'wide', rot: lerp(-.5, .1, u), tail: .6 });
  } else if (t < 3.62) {
    // lands, turns to the hand and stretches up to it
    const sq = Math.exp(-(t - T_JUMP[1]) * 18);
    ctx.save(); ctx.translate(catLand[0], 0); ctx.scale(1 + sq * .12, 1 - sq * .15); ctx.translate(-catLand[0], 0);
    cat(ctx, catLand[0], catLand[1], t < 3.36 ? -1 : 1, t < 3.36 ? { pose: 'crouch', eyes: 'open', tail: .7 } : { pose: 'sit', eyes: 'happy', headRot: .35, tail: .7 + Math.sin(t * 6) * .3 });
    ctx.restore();
  } else {
    const lk = Math.abs(Math.sin((t - 3.62) * 13));
    cat(ctx, catLand[0], catLand[1], 1, { pose: 'sit', eyes: 'happy', headRot: .12, tongue: .5 + .5 * lk, tail: .5 + Math.sin(t * 6) * .3 });
  }
  // the stroking hand goes over the cat's back
  if (kneel > .9) { const w = gMeas2.handF; circ(ctx, w[0], w[1], Dg.limbW * .6); fs(ctx, CAST.catGirl.skin); }
}, { notes: 'The cat isn’t stuck, it just can’t be bothered, and the girl really wants it down. He offers it the scrap of sausage on the tip: it bristles, sniffs, licks, and follows the tip with its eyes as he wipes the scrap and the grease onto the girl’s open palm. The cat jumps straight down to her hand, and she kneels to let it lick her palm while she strokes it.' });

// ---------- 9. Pond ----------
shot('Pond', ...CUT(8), (ctx, t, T) => {
  HS.leg = 1; // the trouser smear from the butcher's shop, until the taxi water washes it
  const CX = .6, CY = .95, SC = 370, rimY = .04, wy = -.08;
  const { T_OPEN, T_SWISH, T_GUST, T_DIP, T_LIFT, T_POUR, T_SIP } = MOMENTS('Pond');
  // the umbrella is pointed at the boat and snapped open: the snap itself is the gust
  const open = kf(t, [[T_OPEN[0], 0], [T_OPEN[1] - .02, 1.08, E.o], [T_OPEN[1] + .06, 1]]);
  HS.water = t < T_DIP[1] ? 0 : t < T_POUR[0] ? E.o(seg(t, T_DIP[1], T_DIP[1] + .12)) : 1 - seg(t, T_POUR[0] + .05, T_POUR[1]);
  const HXf = tt => kf(tt, [[0, -2.3], [.85, -.55, E.o], [3.2, -.55], [4.5, .9, E.i]]);
  const SPD = tt => kf(tt, [[0, 1], [.7, 1], [.85, .1], [3.2, .1], [3.4, 1]]);
  // umbrella keys: [hand offset from the shoulder x, y, angle]
  const shake = 0;
  const UK = [[.8, [.3, -.12, .1]], [1.0, [.38, -.1, -.42], E.io], [T_OPEN[1] - .02, [.48, -.14, -.42], E.o], [1.4, [.46, -.13, -.42]], [1.85, [.12, -.22, 2.2], E.io]];   // aimed level-ish at the sails
  const pose = (c, tt) => {
    const hx = HXf(tt), d = hx + 2.3, spd = SPD(tt);
    const bow = kf(tt, [[T_DIP[0], 0], [T_DIP[1] - .05, 1, E.io], [T_LIFT[0], 1], [T_LIFT[1], 0, E.io]]);
    const lean = -.03 + bow * .72 + kf(tt, [[1.0, 0], [T_OPEN[1], .1, E.o], [1.55, 0, E.io]]);
    const legs = legsByDist(d, spd).map(l => ({ th: l.th + bow * .25, kn: l.kn + bow * .45, fa: l.fa }));
    const base = heroSide(c, { x: hx, y: .12, measure: 1, legs, lean });
    const arms = armsByDist(d, spd);
    const k = kf(tt, UK), w = E.io(seg(tt, .8, .95));
    // the scoop: the canopy goes into the water just past the rim, bowl up
    const dipAng = -1.42, dipTip = [hx + .62, -.3], dipHand = [dipTip[0] - UL * Math.cos(dipAng), dipTip[1] - UL * Math.sin(dipAng)];
    const wd = kf(tt, [[T_DIP[0], 0], [T_DIP[1], 1, E.io], [T_LIFT[0], 1], [T_LIFT[1], 0, E.io]]);
    const ik = heroArmIK(base.Sh, mix(add(base.Sh, [k[0], k[1]]), dipHand, wd), 1);
    arms.L = { sh: lerp(arms.L.sh, ik.sh, w), el: lerp(arms.L.el, ik.el, w), wr: 0 };
    arms.R = blendArm(arms.R, CUP_HIGH, w);   // the coffee held steady and high while the umbrella is in use
    const angWalk = -Math.PI / 2 + Math.sin(TAU * d / (2 * STRIDE())) * .1;
    const lookLeg = false;
    return { x: hx, y: .12, legs, arms, lean, nod: bow * .3 + (lookLeg ? .42 : 0), lookLeg, ang: lerp(lerp(angWalk, k[2], w), dipAng, wd) + shake, base };
  };
  const q = pose(ctx, t);
  const heroM = heroSide(ctx, { x: q.x, y: q.y, measure: 1, legs: q.legs, arms: q.arms, lean: q.lean });
  // ---- the boat: becalmed out on the water; the gust fills the sail and it sails off past the kids ----
  const bx = kf(t, [[T_GUST, 1.15], [2.3, 1.5, E.i], [4.5, 4.2]]), by = wy - .26 + Math.sin(T * 2.3) * .01, bs = 1.35;
  const fill = E.o(seg(t, T_GUST - .02, T_GUST + .1));
  const rock = Math.sin(T * 2.1) * .03 + (t > T_GUST ? -.13 * Math.exp(-(t - T_GUST) * 5) * Math.cos((t - T_GUST) * 12) - .05 * seg(t, T_GUST, T_GUST + .3) : 0);
  const KIDS = [[CAST.pondBoy, 1.8, .06], [CAST.pondGirl, 2.35, -.05]];
  const above = c => {
    skyFill(c, '#c4ccd0', '#dadcd8');
    camera(c, CX, CY, SC);
    c.globalAlpha = .55; tree(c, -2.2, .7, .55, { leaf: '#9eb09a', flat: 1 }); tree(c, 3.0, .75, .6, { leaf: '#a4b5a0', flat: 1 }); tree(c, .9, .9, .4, { leaf: '#aebcaa', flat: 1 }); c.globalAlpha = 1;
    fogBand(c, -4, 5, .5, 2.8, '#dcdfdb', .5, .1);
    railings(c, -4, 5, .62, .55, { c: '#4a5048', gap: .12 });
    rect(c, -4, .2, 9, .45); c.fillStyle = '#93b06f'; c.fill();
    rect(c, -4, rimY, 9, .17); c.fillStyle = '#d7cbab'; c.fill();
    rect(c, -4, rimY - .12, 9, .12); c.fillStyle = '#c9c1b0'; c.fill(); rect(c, -4, rimY - .005, 9, .02); c.fillStyle = '#e4ddcc'; c.fill();
    // the wet patch on the path where he poured
    if (t > T_POUR[0] + .1) { const u = E.o(seg(t, T_POUR[0] + .1, T_POUR[1])); c.fillStyle = `rgba(110,100,80,${.4 * u})`; ell(c, q.x + .05, .14, .26 * u, .035); c.fill(); }
    // hero
    const smirk = t > 1.9 ? .6 : 0;
    heroSide(c, { x: q.x, y: q.y, legs: q.legs, arms: q.arms, umb: { ang: q.ang, open: Math.min(1, open) }, sipT: kf(t, [[T_SIP[0], 0], [T_SIP[1], 1, E.io], [T_SIP[2], 1], [T_SIP[3], 0, E.io]]), lean: q.lean, nod: q.nod, brow: q.lookLeg ? -.7 : 0, mouth: q.lookLeg ? -.5 : 0, smirk });
    // kids kneeling on the rim, facing us
    const surprise = t > T_GUST && t <= T_GUST + .25, joy = t > T_GUST + .25;
    KIDS.forEach(([sp, kx, tl], i) => {
      const clap = joy ? Math.abs(Math.sin((t - T_GUST - .25) * 13 + i)) : 0;
      const look = clamp((bx - kx) * 3, -1, 1);
      let ex, arms;
      if (joy) { ex = { eyes: 'happy', mouth: 'grin', lookX: look }; arms = { l: { sh: 2.5 + clap * .3, el: .35 }, r: { sh: 2.5 + (1 - clap) * .3, el: .35 } }; }
      else if (surprise) { ex = { eyes: 'wide', mouth: 'o', brow: 1, lookX: -1 }; arms = { l: { sh: .6, el: -1.2 }, r: { sh: .6, el: -1.2 } }; }
      else { ex = { eyes: 'open', mouth: 'frown', sadBrow: 1, lookY: -1, lookX: -1 }; arms = i === 0 ? { l: { sh: 1.45 + Math.sin(t * 5) * .04, el: .1 }, r: { sh: .25, el: -.6 } } : { l: { sh: .25, el: -.6 }, r: { sh: .25, el: -.6 } }; }
      // after the boat has passed, the boy turns and waves to the man
      if (i === 0 && t > 3.75) { const wv = Math.sin((t - 3.75) * 16); ex = { eyes: 'happy', mouth: 'grin', lookX: -1 }; arms = { l: { sh: 2.6 + wv * .25, el: .3 }, r: { sh: .3, el: -.6 } }; }
      c.save(); rect(c, kx - 1, rimY + .1, 2, 3); c.clip();
      personFront(c, sp, { x: kx, y: rimY - .2, hipH: .44, farms: arms, ex, tilt: joy ? tl * Math.sin(t * 6 + i) : -tl });
      c.restore();
      [-1, 1].forEach(sd => { ell(c, kx + sd * .08, rimY + .1, .08, .058); fs(c, sp.bottom); });
    });
    // the gust from the swish: streaks flying over the water towards the boat
    if (t > T_SWISH && t < T_GUST + .3) {
      // the puff pushed out of the canopy as it snaps open, rolling down over the water to the boat
      // it travels from the canopy and reaches the sails exactly when they fill
      const u = seg(t, T_SWISH, T_GUST + .3), r0 = umbRim(heroM.handL, q.ang, 1).c, sailP = [1.15, wy - .26 + .45 * 1.35], D = dist(r0, sailP), dir = [(sailP[0] - r0[0]) / D, (sailP[1] - r0[1]) / D];
      const travel = t < T_GUST ? D * seg(t, T_SWISH, T_GUST) : D + (t - T_GUST) * 2.5;
      c.save(); c.globalAlpha = Math.sin(Math.PI * u) * .95; c.strokeStyle = '#f7f9fa'; c.lineWidth = px(6); c.lineCap = 'round';
      for (let k = 0; k < 5; k++) { const off = (k - 2) * .1, p0 = add(add(r0, dir, travel - Math.abs(k - 2) * .06), [-dir[1] * off, dir[0] * off]); c.beginPath(); c.moveTo(...add(p0, dir, -.6)); c.quadraticCurveTo(...add(add(p0, dir, -.12), [-dir[1] * .04, dir[0] * .04]), ...p0); c.stroke(); }
      c.restore();
    }
  };
  const oc = offscreen(); above(oc);
  skyFill(ctx, '#000', '#000');
  ctx.drawImage(oc.canvas, 0, 0);
  camera(ctx, CX, CY, SC);
  const g = vgrad(ctx, wy, -1.2, [[0, '#9fb5bd'], [1, '#6f8a96']]); ctx.fillStyle = g; ctx.fillRect(-4, -1.2, 9, wy + 1.2);
  const yw = H / 2 + (CY - wy) * SC;
  reflect(ctx, oc, yw, T, .5, 3);
  camera(ctx, CX, CY, SC);
  ctx.fillStyle = 'rgba(120,150,165,.25)'; ctx.fillRect(-4, -1.2, 9, wy + 1.2);
  // ripples; a cat's-paw of wind runs across the water with the gust
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = px(1.6);
  const rr = rng(8); for (let i = 0; i < 14; i++) { const x = -2.4 + rr() * 5.6 + Math.sin(T + i) * .05, y = -.2 - rr() * .3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + .15 + rr() * .2, y); ctx.stroke(); }
  if (t > T_GUST - .15 && t < T_GUST + .45) {
    const u = seg(t, T_GUST - .15, T_GUST + .45), cx = .2 + u * 1.2; ctx.save(); ctx.globalAlpha = Math.sin(Math.PI * u); ctx.strokeStyle = 'rgba(235,245,250,.9)'; ctx.lineWidth = px(2.2);
    for (let k = 0; k < 7; k++) { const x = cx - .3 + k * .1, y = -.13 - (k % 3) * .06; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + .09, y); ctx.stroke(); }
    ctx.restore();
  }
  // where the canopy dips in: rings
  if (t > T_DIP[1] - .1 && t < T_POUR[0] + .2) { const u = seg(t, T_DIP[1] - .1, T_POUR[0] + .2); ctx.strokeStyle = `rgba(255,255,255,${.7 * (1 - u)})`; ctx.lineWidth = px(2.2); ell(ctx, q.x + .62, wy - .03, .32 + u * .5, .04 + u * .07); ctx.stroke(); }
  // the boat (and its reflection)
  ctx.save(); ctx.translate(0, 2 * by); ctx.scale(1, -1); ctx.globalAlpha = .3; sailboat(ctx, bx, by, bs * .98, fill, -rock, fill); ctx.restore();
  sailboat(ctx, bx, by, bs, fill, rock, fill);
  if (t > T_GUST) { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = px(2); for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(bx - .3 - k * .14, by - .02 - k * .012); ctx.lineTo(bx - .45 - k * .2, by - .03 - k * .02); ctx.stroke(); } }
  // the pour: a real stream from the low side of the rim onto his shin
  if (t > T_POUR[0] && t < T_POUR[1] + .05) {
    const r = umbRim(heroM.handL, q.ang, 1), P0 = r.a[1] < r.b[1] ? r.a : r.b;
    const L0 = heroM.L[0], S0 = add(mix(L0.K, L0.A, .45), [.03, 0]);
    const u = seg(t, T_POUR[0], T_POUR[1] + .05), w = Math.min(1, Math.sin(Math.PI * u) * 1.6);
    ctx.save();
    const w0 = .06 * w, w1 = .045 * w;
    ctx.beginPath(); ctx.moveTo(P0[0] - w0, P0[1]); ctx.quadraticCurveTo(P0[0] - .05, lerp(P0[1], S0[1], .5), S0[0] - w1, S0[1]); ctx.lineTo(S0[0] + w1, S0[1]); ctx.quadraticCurveTo(P0[0] + .01, lerp(P0[1], S0[1], .5), P0[0] + w0, P0[1]); ctx.closePath();
    ctx.fillStyle = 'rgba(165,205,226,.92)'; ctx.fill(); st(ctx, 1.2, 'rgba(70,110,140,.8)');
    // water sheeting down the shin to the boot, and spray
    ctx.strokeStyle = 'rgba(165,205,226,.9)'; ctx.lineWidth = px(4); for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(S0[0] - .03 + k * .03, S0[1]); ctx.lineTo(S0[0] - .02 + k * .03, L0.A[1] - .03); ctx.stroke(); }
    const rd = rng(Math.floor(t * 30)); ctx.fillStyle = 'rgba(185,218,236,.95)';
    for (let k = 0; k < 16; k++) { circ(ctx, S0[0] + (rd() - .3) * .22, S0[1] + (rd() - .6) * .22, .009 + rd() * .01); ctx.fill(); }
    ctx.restore();
  }
  // the shake: drops fly off the canopy
  if (t > 2.48 && t < 2.72) { const u = seg(t, 2.48, 2.72), r = umbRim(heroM.handL, q.ang, 1); ctx.fillStyle = `rgba(185,218,236,${1 - u})`; const rd = rng(4); for (let k = 0; k < 10; k++) { const a = rd() * TAU; circ(ctx, r.c[0] + Math.cos(a) * (.5 + u * .4), r.c[1] + Math.sin(a) * (.35 + u * .3) - u * u * .3, .012); ctx.fill(); } }
}, { notes: 'The kids’ toy boat is becalmed out on the water, sail hanging. He points the umbrella at it and snaps it open: the snap itself is the gust. Both sails pop full and the boat sails off past the cheering kids. He swings the open umbrella onto his shoulder, sips and walks on.' });

// ---------- 10. Wet concrete ----------
function wetSign(ctx, x, y, sc = 1) {
  local(ctx, x, y, 0, sc);
  seg2(ctx, [-.2, 0], [-.12, .62], OLW * 1.2 + .03 * S, INK); seg2(ctx, [-.2, 0], [-.12, .62], .03 * S, '#9a7b4f');
  seg2(ctx, [.2, 0], [.12, .62], OLW * 1.2 + .03 * S, INK); seg2(ctx, [.2, 0], [.12, .62], .03 * S, '#9a7b4f');
  rrect(ctx, -.24, .26, .48, .34, .02); fs(ctx, '#f2c230');
  rect(ctx, -.24, .26, .48, .05); ctx.fillStyle = '#232323'; ctx.fill(); rect(ctx, -.24, .55, .48, .05); ctx.fill();
  txt(ctx, 'WET', 0, .47, .1, '#1d1d1d', '900 {S}px "DejaVu Sans", Arial, sans-serif');
  txt(ctx, 'CEMENT', 0, .37, .075, '#1d1d1d', '900 {S}px "DejaVu Sans", Arial, sans-serif');
  ctx.restore();
}
shot('Wet concrete', ...CUT(9), (ctx, t) => {
  HS.leg = 1; // the trouser smear from the butcher's shop, until the taxi water washes it
  skyFill(ctx, '#c9cfd2', '#dcdddc');
  const CXc = kf(t, [[1.6, .1], [2.8, 1.8, E.io]]);
  camera(ctx, CXc, 1.62, 285);
  // facade + a scaffold rail running along it
  brickWall(ctx, -4, 6, .3, 5, '#a88468', { seed: 21 });
  rect(ctx, -4, .3, 10, .12); ctx.fillStyle = '#d6cfc2'; ctx.fill();
  door(ctx, 3.9, .42, .95, 2.1, '#d9a93a', { knob: 1, fanlight: 1 });
  sashWindow(ctx, -2.2, 2.2, .9, 1.4, { wall: '#a88468' }); sashWindow(ctx, 1.0, 2.2, .9, 1.4, { wall: '#a88468' });
  const PIPE = 3.3;   // high enough that, hanging from it with his knees up, he clears the ducking worker
  [-2.9, 4.6].forEach(x => { rect(ctx, x - .03, .3, .06, 4); fsb(ctx, '#7c838b', 1.2); });
  rect(ctx, -4, PIPE - .025, 10, .05); fsb(ctx, '#737b84', 1.4); rect(ctx, -4, PIPE + .008, 10, .01); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fill();
  // pavement & the fresh concrete strip (right across the pavement)
  pavement(ctx, -4, 6, -.45, .3, '#bfb9ae', { rows: 1 });
  const px0 = .1, px1 = 2.4;
  rect(ctx, px0, -.35, px1 - px0, .62); ctx.fillStyle = '#9ea2a3'; ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.18)'; rect(ctx, px0, .12, px1 - px0, .05); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = px(1.6);
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(px0 + .3 + i * .36, -.08, .16, .3, 2.6); ctx.stroke(); }
  rect(ctx, px0 - .05, -.37, .05, .66); ctx.fillStyle = '#b08a5a'; ctx.fill(); rect(ctx, px1, -.37, .05, .66); ctx.fill();
  wetSign(ctx, -.12, .27, 1.05);
  [.98, 1.42].forEach(x => { rrect(ctx, x - .2, .24, .4, .045, .01); fs(ctx, '#b08a5a'); });
  // timings: stop hand, close, toss to a grip near the tip, hook the rail, glide over, feet down, unhook, let it slide back to the crook
  const { T_CLOSE, T_DOWN, T_TOSS, T_RAISE, T_HOOK, T_GO, T_LAND, T_PULL, T_FALL, T_LOWER, T_SLIDE } = MOMENTS('Wet concrete');
  // ---- the worker, kneeling on his boards; stop hand, ducks as the man glides past, then a thumbs-up ----
  const duck = kf(t, [[1.98, 0], [2.1, 1, E.o], [2.4, 1], [2.6, 0, E.io]]);
  const look = kf(t, [[1.25, 0], [1.38, 1], [3.35, 1], [3.55, 0, E.io]]);
  const stopK = kf(t, [[.55, 0], [.72, 1, E.o], [1.18, 1], [1.32, 0, E.io]]);
  const thumb = kf(t, [[3.05, 0], [3.25, 1, E.o], [3.95, 1], [4.15, 0, E.io]]);
  const sweep = look > .5 || stopK > .05 || thumb > .05 ? 0 : Math.sin(t * 6);
  const wEx = stopK > .3 ? { eyes: 'wide', mouth: 'o', brow: 1.2, lookX: 1 } : thumb > .3 ? { eyes: 'happy', mouth: 'grin' } : t < 1.3 ? { eyes: 'open', mouth: 'flat', lookY: -1, lookX: 1 } : t < 2.0 ? { eyes: 'wide', mouth: 'o', brow: 1, lookY: 1, lookX: .6 } : t < 3.1 ? { eyes: 'wide', mouth: 'o', brow: 1, lookY: .3, lookX: -1 } : t < 3.5 ? { eyes: 'open', mouth: 'smile', lookX: -1 } : { eyes: 'open', mouth: 'smile', lookY: -1, lookX: 1 };
  personSide(ctx, CAST.worker, { x: 1.25, y: .28, f: thumb > .3 ? 1 : -1, legs: [{ th: 1.35, kn: 1.3, fa: 0 }, { th: .12, kn: 1.62, fa: -1.3 }], lean: .5 - look * .35 + duck * 1.05 - stopK * .3 - thumb * .25, headF: thumb > .3 ? 1 : t > 2.1 && t < 3.5 ? 1 : -1, nod: duck * .5,
    arms: { near: duck > .1 ? { sh: lerp(1.1, 2.4, duck), el: lerp(.3, 2.2, duck) } : stopK > .01 ? { sh: lerp(1.1, 1.95, stopK), el: lerp(.3, -.35, stopK) + Math.sin(t * 18) * .08 * stopK } : thumb > .3 ? { sh: 1.9, el: -1.35 + Math.sin(t * 10) * .05 } : { sh: 1.1 + sweep * .2, el: .3 }, far: duck > .1 ? { sh: lerp(.8, 2.3, duck), el: lerp(.5, 2.3, duck) } : { sh: .8, el: .5 } }, ex: wEx,
    hold: { near: (c, w) => { if (stopK > .5) { palm(c, w, 1.4, CAST.worker, 1.2, -1); } else if (thumb > .5) { circ(c, w[0], w[1], .055); fs(c, CAST.worker.skin, OLW * .8); ell(c, w[0] + .008, w[1] + .095, .03, .062); fs(c, CAST.worker.skin, OLW * .8); } else { local(c, w[0], w[1], 0); rect(c, -.25, -.035, .26, .03); fs(c, '#8a8f96'); c.restore(); } } } });
  cone_traffic(ctx, px0 - .15, -.36, .7); cone_traffic(ctx, px1 + .18, -.36, .7);
  // ---- the hero ----
  const GRIP = .75;                                   // reversed grip: hand this far down the shaft from the crook
  const cupArm = { sh: .3, el: 1.3, wr: 0 };
  const hookX = kf(t, [[T_HOOK, -.55], [T_GO, -.45, E.i], [T_LAND, 2.75, E.io]]);
  const crookAt = hx => [hx - .045, PIPE - .08];    // the crook's J sits over the rail
  let umbC = null, umbA = -Math.PI / 2, umbOpen = 0;
  if (t < T_HOOK) {
    // walk in, stop at the sign; close it, toss it and catch it low; reach up and hook the rail
    const hx = kf(t, [[0, -2.5], [.95, -.8, E.o], [1.68, -.8], [T_HOOK, -.62, E.io]]), d = hx + 2.5;
    const spd = kf(t, [[0, 1], [.8, 1], [.95, .1], [1.68, .1], [1.74, .6], [1.86, .1]]);
    const legs = legsByDist(d, spd).map(l => { const c = kf(t, [[1.68, 0], [1.74, 1, E.o], [1.8, 0, E.io]]); return { th: l.th + c * .35, kn: l.kn + c * .7, fa: l.fa }; });
    const tip = kf(t, [[1.7, 0], [1.74, -.05, E.o], [T_HOOK, .4, E.o]]);   // a crouch and a hop up to the rail
    const base = heroSide(ctx, { x: hx, y: tip, measure: 1, legs });
    const handShoulder = add(base.Sh, [.12, -.22]), handFront = add(base.Sh, [.36, -.34]), handCatch = add(base.Sh, [.38, .12]);
    const G = [crookAt(hookX)[0], crookAt(hookX)[1] - GRIP];
    let hand, ang, open = 1, C;
    if (t < T_DOWN[0]) { hand = handShoulder; ang = 2.2; open = 1 - E.io(seg(t, ...T_CLOSE)); C = hand; }
    else if (t < T_TOSS[0]) { const u = E.io(seg(t, ...T_DOWN)); hand = mix(handShoulder, handFront, u); ang = lerp(2.2, -Math.PI / 2 + .05, u); open = 0; C = hand; }
    else if (t < T_TOSS[1]) { const u = seg(t, ...T_TOSS); hand = mix(handFront, handCatch, E.io(u)); open = 0; ang = -Math.PI / 2 + .05 + .22 * Math.sin(TAU * u); C = add(mix(handFront, add(handCatch, [0, GRIP]), u), [0, .38 * Math.sin(Math.PI * u)]); }
    else { const u = E.io(seg(t, ...T_RAISE)); hand = mix(handCatch, G, u); ang = -Math.PI / 2; open = 0; C = add(hand, [0, GRIP]); }
    const ik = heroArmIK(base.Sh, hand, 1), arms = armsByDist(d, spd);
    arms.L = ik;   // the umbrella rides on his shoulder from the first frame (as he left the pond)
    arms.R = cupArm;
    umbC = C; umbA = ang; umbOpen = open;
    const inHand = t < T_TOSS[0] || t >= T_TOSS[1];
    const read = t > 1.0 && t < 1.16, up = t > 1.2 && t < T_HOOK;
    if (!inHand || t >= T_TOSS[1]) drawUmbrella(ctx, C[0], C[1], ang, { open, cs: 1 });
    heroSide(ctx, { x: hx, y: tip, legs, arms, umb: t < T_TOSS[0] ? { ang, open } : false, nod: read ? .3 : up ? -.35 : 0, brow: read ? .5 : 0, cupAng: 0 });
  } else if (t < T_LAND) {
    // hanging one-handed from the hooked umbrella, knees up, gliding along the rail; the coffee never tilts
    const C = crookAt(hookX), G = [C[0], C[1] - GRIP];
    const tuck = kf(t, [[T_GO, 0], [T_GO + .12, 1, E.o]]);   // knees stay up until he lets go
    const push = kf(t, [[T_HOOK, 0], [T_GO, 1, E.io], [T_GO + .06, 0]]);
    const lean = kf(t, [[T_HOOK, 0], [T_GO + .14, -.28, E.o], [2.42, -.08, E.io], [T_LAND, .18, E.io]]);
    const st = standLegs(), TK = [{ th: 1.75, kn: 2.35, fa: 0 }, { th: 1.5, kn: 2.2, fa: 0 }], PU = [{ th: -.35, kn: .1, fa: 0 }, { th: .35, kn: .2, fa: 0 }];
    const legs = st.map((l, i) => { const a = { th: lerp(l.th, PU[i].th, push), kn: lerp(l.kn, PU[i].kn, push), fa: 0 }; return { th: lerp(a.th, TK[i].th, tuck), kn: lerp(a.kn, TK[i].kn, tuck), fa: 0 }; });
    const armL = { sh: Math.PI - .06, el: .04, wr: 0 };
    const trial = heroSide(ctx, { x: 0, hipY: 1, measure: 1, legs, lean, arms: { L: armL, R: cupArm } });
    const x = G[0] - trial.handL[0], hipY = 1 + G[1] - trial.handL[1];
    drawUmbrella(ctx, C[0], C[1], -Math.PI / 2, { cs: 1 });
    // the rail again over the back of the hook, so the J wraps round it
    rect(ctx, C[0] - .02, PIPE - .025, .07, .05); fsb(ctx, '#737b84', 1.2);
    shadow(ctx, x + .05, .0, .3, .3);
    if (t > T_GO && t < T_LAND - .1) { const a = Math.min(1, seg(t, T_GO, T_GO + .1)) * (1 - seg(t, 2.45, T_LAND - .1)); ctx.strokeStyle = `rgba(90,90,90,${.6 * a})`; ctx.lineWidth = px(3); ctx.lineCap = 'round'; for (let k = 0; k < 4; k++) { const y = hipY + .25 + k * .22, x0 = x - .3 - (k % 2) * .1; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 - .45 - k * .05, y); ctx.stroke(); } }
    heroSide(ctx, { x, hipY, legs, lean, arms: { L: armL, R: cupArm }, umb: false, cupAng: 0, coatFlare: .35 * tuck, coatWind: .5 * tuck, hairWind: -.5 * tuck, smirk: t > 2.2 ? .6 : 0, nod: -.1 });
    // a little rattle of the rail where the hook runs
    if (t > T_GO && t < 2.6) { ctx.strokeStyle = 'rgba(60,60,60,.5)'; ctx.lineWidth = px(2); for (let k = 0; k < 3; k++) { const xx = C[0] - .12 - k * .12; ctx.beginPath(); ctx.moveTo(xx, PIPE + .05); ctx.lineTo(xx - .08, PIPE + .05); ctx.stroke(); } }
  } else {
    // past the strip: a little pull-up lifts the crook off the rail, he drops to the pavement with it, lowers it, lets it slide back to the crook and walks on
    const walk = kf(t, [[3.45, 0], [4.5, .75, E.i]]);
    const hx = hookX + .02 + walk;
    const legs00 = walk > 0 ? legsByDist(walk, seg(t, 3.45, 3.55)) : standLegs();
    const TKc = [{ th: 1.75, kn: 2.35, fa: 0 }, { th: 1.5, kn: 2.2, fa: 0 }], untuck = E.io(seg(t, T_FALL[0] + .02, T_FALL[1] - .02));
    const legs0 = legs00.map((l, i) => ({ th: lerp(TKc[i].th, l.th, untuck), kn: lerp(TKc[i].kn, l.kn, untuck), fa: lerp(0, l.fa, untuck) }));
    const squat = kf(t, [[T_FALL[1] - .02, 0], [T_FALL[1] + .05, 1, E.o], [3.12, 0, E.io]]);
    const legs = legs0.map(l => ({ th: l.th + squat * .45, kn: l.kn + squat * .9, fa: l.fa }));
    const armUp = { sh: Math.PI - .06, el: .04, wr: 0 };
    const g0 = heroSide(ctx, { x: hx, y: 0, measure: 1, legs: standLegs(), arms: { L: armUp, R: cupArm } }), gT = heroSide(ctx, { x: hx, y: 0, measure: 1, legs: TKc, arms: { L: armUp, R: cupArm } });
    const Crail = crookAt(hookX), G = [Crail[0], Crail[1] - GRIP];
    const yHang = G[1] - lerp(gT.handL[1], g0.handL[1], untuck);   // (the tucked body is grounded differently: keep the hand on the rail)
    const pull = kf(t, [[T_PULL[0], 0], [T_PULL[1], .07, E.o]]);
    const y = t < T_FALL[0] ? yHang + pull : lerp(yHang + .07, 0, E.i(seg(t, ...T_FALL)));
    const base = heroSide(ctx, { x: hx, y, measure: 1, legs });
    const handLow = add(base.Sh, [.38, .12]);
    const lowerK = E.io(seg(t, ...T_LOWER));
    const ik = heroArmIK(base.Sh, handLow, 1);
    const walkA = armsByDist(walk, 1), back = E.io(seg(t, 3.4, 3.6));
    let armL = t < T_LOWER[0] ? armUp : blendArm(armUp, ik, lowerK);
    armL = blendArm(armL, walkA.L, back);
    const m = heroSide(ctx, { x: hx, y, measure: 1, legs, arms: { L: armL, R: cupArm } });
    const slide = E.i(seg(t, ...T_SLIDE));
    const C = add(m.handL, [0, GRIP * (1 - slide)]);
    if (back < .01) drawUmbrella(ctx, C[0], C[1], -Math.PI / 2, { cs: 1 });
    if (t < T_FALL[1]) shadow(ctx, hx + .05, 0, .3, .3);
    heroSide(ctx, { x: hx, y, legs, arms: { L: armL, R: blendArm(cupArm, CUP_HIGH, back) }, umb: back < .01 ? false : { ang: -Math.PI / 2 + .05 }, cupAng: 0, smirk: .6, nod: t > 3.9 && t < 4.2 ? .15 : 0 });
  }
}, { notes: 'He arrives with the umbrella still open on his shoulder from the pond. A WET CEMENT sign, and the worker holds up a hand: stop. He looks up at the scaffold rail, closes the umbrella, tosses it and catches it low, hooks the crook over the rail and glides across one-handed, knees up, while the worker ducks. Feet down on the far side, he unhooks, lets the umbrella slide down to the crook and walks on; the worker gives him a thumbs-up. The concrete is never touched and the coffee stays level.' });

// ---------- 11. Ice cream ----------
shot('Ice cream', ...CUT(10), (ctx, t) => {
  HS.leg = 1; // the trouser smear from the butcher's shop, until the taxi water washes it
  skyFill(ctx, '#cdd2d4', '#dadcdb');
  camera(ctx, 0, .95, 390);
  stoneWall(ctx, -4, 4, .35, 3, '#d9d1c3', { seed: 17, bh: .4, bw: .9 });
  rect(ctx, -4, .2, 8, .18); ctx.fillStyle = '#c7bfb0'; ctx.fill();
  pavement(ctx, -4, 4, -.45, .2, '#c3bdb3', { rows: 1, slab: 1.1 });
  
  const CS = 1.3;                                   // cone scale
  const { T_FALL, T_F1, C1, TR1, TR2, T_F2, C2, T_MAKE, T_GRIP, T_SIP } = MOMENTS('Ice cream');
  const cartX = 1.4, cartY = .1, counterY = cartY + .96;
  const jar = [1.83, counterY];
  const coins = 2 + (t > C1[1] ? 1 : 0) + (t > C2[1] ? 1 : 0);
  const splat = [.22, -.18];
  // ---- vendor (behind the cart, at its left end) ----
  const vx = 1.15, vy = .2, Dv = dims(CAST.vendor);
  const vSway = kf(t, [[2.2, 0], [2.35, -.1, E.io], [2.95, -.1], [3.1, 0, E.io], [4.2, 0], [4.45, -.16, E.io], [4.85, -.16], [5.04, -.08, E.io]]);
  const vSh = [vx + vSway * 1.3, vy + Dv.leg + Dv.shoe * .1 + Dv.torso], vJ = [vSh[0] - Dv.bw * .55, vSh[1] - Dv.limbW * .5];
  const vIK = tgt => { const r = ik2(-(tgt[0] - vJ[0]), tgt[1] - vJ[1], Dv.up, Dv.fo); return { sh: r[0], el: r[1] }; };
  const tub = [vx + vSway * 1.3 - .05, counterY - .15];
  // kid's cone (in the kid's hand), filled later
  const kx = kf(t, [[3.15, .6], [4.4, 3.0]]), kWalk = t > 3.15;
  const kf_ = t < 2.2 ? -1 : 1;
  const Dk = dims(CAST.iceKid);
  const kMeas = personSide(ctx, CAST.iceKid, { x: kx, y: 0, f: kf_, legs: standLegs(.04, .03), measure: 1 });
  const kJ = add(kMeas.Sh, [0, -Dk.limbW * .5]);
  const kIK = tgt => { const r = ik2((tgt[0] - kJ[0]) * kf_, tgt[1] - kJ[1], Dk.up, Dk.fo); return { sh: r[0], el: r[1] }; };
  const lickP = [kx - .17, .44 + Math.sin(t * 9) * .012 * (t < .78 ? 1 : 0)];
  const upP = [kx + .12, .66];
  const holdUp = kf(t, [[2.22, 0], [2.36, 1, E.io], [2.98, 1], [3.15, 0, E.io]]);
  let kArm;
  if (t < 2.2) { const k = kIK(t < T_FALL[1] ? lickP : [kx - .15, .38]); kArm = k; }
  else { const a = kIK(upP), b = kIK([kx + .16, .42]); kArm = { sh: lerp(b.sh, a.sh, holdUp), el: lerp(b.el, a.el, holdUp) }; }
  if (kWalk) { const b = kIK([kx + .16, .44]); kArm = b; }
  const kHandNow = personSide(ctx, CAST.iceKid, { x: kx, y: 0, f: kf_, legs: standLegs(.04, .03), arms: { near: kArm, far: { sh: .1, el: .3 } }, measure: 1 }).handN;
  const kTilt = t < .5 ? .12 * kf_ * -1 : t < T_FALL[0] ? lerp(.12, .75, E.i(seg(t, .5, T_FALL[0]))) : lerp(.75, .1, E.o(seg(t, T_FALL[0], 1.2)));
  const coneRot = t < 2.2 ? kTilt : -.1;           // positive rot tips the scoops to the left (towards us)
  const coneTip = add(kHandNow, [0, -.06]);
  const scoopTop = n => add(coneTip, [-Math.sin(coneRot) * (n === 1 ? .185 : .243) * CS, Math.cos(coneRot) * (n === 1 ? .185 : .243) * CS]);
  // vendor arms
  let vArmL = { sh: .25, el: -.4 }, vHoldL = null;
  const trip = (tr, n) => { const u = seg(t, ...tr); const top = scoopTop(n); const above = add(top, [.02, .06]); if (u < .45) return { p: mix(tub, above, E.io(u / .45)), carry: true }; if (u < .55) return { p: mix(above, add(top, [.01, .03]), (u - .45) / .1), carry: true }; return { p: mix(add(top, [.01, .03]), tub, E.io((u - .55) / .45)), carry: false }; };
  if (t > TR1[0] - .15 && t < TR2[1] + .2) {
    let tp;
    if (t < TR1[0]) tp = { p: mix([vx - .1, counterY + .1], tub, seg(t, TR1[0] - .15, TR1[0])), carry: false };
    else if (t < TR1[1]) tp = trip(TR1, 1); else if (t < TR2[1]) tp = trip(TR2, 2); else tp = { p: mix(tub, [vx - .1, counterY + .1], seg(t, TR2[1], TR2[1] + .2)), carry: false };
    vArmL = vIK(tp.p); vHoldL = tp.carry ? 'scoop' : null;
  }
  const hold = [.56, .97];
  if (t > T_MAKE[0]) { const u = E.io(seg(t, ...T_MAKE)); const p = t < T_MAKE[0] + .1 ? mix([vx - .1, counterY + .1], tub, seg(t, T_MAKE[0], T_MAKE[0] + .1)) : mix(tub, hold, u); vArmL = vIK(t > T_GRIP + .08 ? mix(hold, [vx - .1, counterY + .12], E.io(seg(t, T_GRIP + .08, T_GRIP + .3))) : p); vHoldL = t > T_MAKE[0] + .1 && t < T_GRIP + .08 ? 'cone' : null; }
  const vEx = t < C1[1] ? { eyes: 'open', mouth: 'smile', lookX: -.6, lookY: -.4 } : t < 2.28 ? { eyes: 'wide', mouth: 'o', brow: 1, lookX: -.3, lookY: -.6 } : t < 3.0 ? { eyes: 'happy', mouth: 'grin' } : t < C2[1] ? { eyes: 'open', mouth: 'smile', lookX: -.8, lookY: -.6 } : t < 4.3 ? { eyes: 'wide', mouth: 'o', brow: 1, lookX: -.3, lookY: -.6 } : { eyes: 'happy', mouth: 'grin' };
  personFront(ctx, CAST.vendor, { x: vx, y: vy, measure: 0, shadow: false, farms: { l: vArmL, r: { sh: .3, el: .3 } }, ex: vEx, sway: vSway,
    pre: null, hold: { l: (c, w) => { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.restore(); if (vHoldL === 'scoop') { seg2(c, w, add(w, [-.08, .03]), 3, '#9aa0a8'); scoop(c, w[0] - .1, w[1] + .03, t < TR1[1] ? 'choc' : 'van'); } else if (vHoldL === 'cone') cone(c, w[0] - .01, w[1] - .07, .1, 1, CS); } } });
  // the cart is drawn over her lower half
  iceCart(ctx, cartX, cartY, { jar: false });
  // re-draw her serving arm when it reaches outside the cart
  // tip jar: big, glassy, on the counter's left end
  rrect(ctx, jar[0] - .12, jar[1], .24, .3, .035); fs(ctx, 'rgba(170,205,222,.75)', 1.8);
  for (let i = 0; i < coins; i++) { ell(ctx, jar[0] - .06 + (i % 3) * .06, jar[1] + .035 + Math.floor(i / 3) * .026, .04, .014); fs(ctx, '#e0b53f', 1); }
  rrect(ctx, jar[0] - .13, jar[1] + .28, .26, .04, .01); fs(ctx, '#3b4550');
  rect(ctx, jar[0] - .1, jar[1] + .12, .2, .09); ctx.fillStyle = '#d05a5f'; ctx.fill(); txt(ctx, 'TIPS', jar[0], jar[1] + .166, .065, '#fff', '800 {S}px "DejaVu Sans", Arial, sans-serif');
  ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = px(3); ctx.beginPath(); ctx.moveTo(jar[0] - .085, jar[1] + .04); ctx.lineTo(jar[0] - .085, jar[1] + .25); ctx.stroke();
  // her arm again, in front of the cart, when it is out over the counter
  if (vArmL.sh > .5) { ctx.save(); rect(ctx, -5, counterY + .05, 5 + cartX - .6, 5); ctx.clip(); personFront(ctx, CAST.vendor, { x: vx, y: vy, shadow: false, sway: vSway, farms: { l: vArmL, r: { sh: .3, el: .3 } }, ex: vEx, hold: { l: (c, w) => { if (vHoldL === 'scoop') { seg2(c, w, add(w, [-.08, .03]), 3, '#9aa0a8'); scoop(c, w[0] - .1, w[1] + .03, t < TR1[1] ? 'choc' : 'van'); } else if (vHoldL === 'cone') cone(c, w[0] - .01, w[1] - .07, .1, 1, CS); } } }); ctx.restore(); }
  // ---- the splat stays on the pavement ----
  if (t > T_FALL[1] - .02) { const u = E.o(seg(t, T_FALL[1] - .02, T_FALL[1] + .1)); ell(ctx, splat[0] + .06, splat[1], .12 * u + .02, .04 * u + .01); fs(ctx, '#6b3f2a', 1.4); ell(ctx, splat[0] - .09, splat[1] + .008, .11 * u + .02, .035 * u + .01); fs(ctx, '#f4ead3', 1.4); if (u > .5) { ctx.fillStyle = '#6b3f2a'; circ(ctx, splat[0] + .2, splat[1] + .01, .015); ctx.fill(); ctx.fillStyle = '#f4ead3'; circ(ctx, splat[0] - .22, splat[1] - .01, .014); ctx.fill(); } }
  // ---- hero (front lane): walks in, stops, flicks a coin to the jar; later a second one ----
  const hy = -.12;
  const HX = tt => kf(tt, [[0, -3.1], [1.35, -1.3, E.o]]);
  const heroP = tt => {
    const hx = HX(tt), d = hx + 3.1, spd = kf(tt, [[1.1, 1], [1.35, .1]]);
    const flick = kf(tt, [[T_F1 - .12, 0], [T_F1 - .04, -.4, E.io], [T_F1 + .04, 1, E.o], [T_F1 + .25, 0, E.io], [T_F2 - .12, 0], [T_F2 - .04, -.4, E.io], [T_F2 + .04, 1, E.o], [T_F2 + .25, 0, E.io]]);
    const arms = armsByDist(d, spd); arms.L = { sh: arms.L.sh + flick * .22, el: arms.L.el + flick * .55, wr: 0 };   // a flick from the hip, well below the coffee
    arms.R = blendArm(arms.R, CUP_HIGH, kf(tt, [[1.2, 0], [1.4, 1, E.io]]));
    const sipT = kf(tt, [[T_SIP[0], 0], [T_SIP[1], 1, E.io], [T_SIP[2], 1], [T_SIP[3], .4]]);
    return { x: hx, y: hy, legs: legsByDist(d, spd), arms, umb: { swing: Math.sin(TAU * d / (2 * STRIDE())) * .1 * spd + flick * .35 }, sipT, smirk: (t > 2.95 && t < 3.3) || t > 4.8 ? .6 : 0 };
  };
  // ---- cat (front-most lane): smells the ice cream on the pavement and runs in for it ----
  const catX = kf(t, [[2.45, -3.0], [2.95, splat[0] - .22, E.o]]);
  // ---- girl: runs in after her cat, watches the kid's cone go by, then runs to the vendor for her own ----
  const gxK = [[2.75, -3.1], [3.25, -.2, E.o], [4.3, -.2], [4.62, .38, E.io]];   // she stops clear of his umbrella
  const gx = kf(t, gxK), gy = kf(t, [[4.3, .12], [4.62, .02]]);   // a step upstage of the cat
  const gRun = (t > 2.75 && t < 3.22) || (t > 4.3 && t < 4.6);
  const Dg = dims(CAST.catGirl);
  // draw order: girl (behind the cat lane), kid, hero, cat
  if (t > 2.75) {
    const gm = personSide(ctx, CAST.catGirl, { x: gx, y: gy, f: 1, legs: standLegs(.04, .03), measure: 1 });
    const gJ = add(gm.Sh, [0, -Dg.limbW * .5]);
    const grip = [hold[0] - .02, hold[1] - .05];
    const r = ik2(grip[0] - gJ[0], grip[1] - gJ[1], Dg.up, Dg.fo);
    const reach = kf(t, [[4.55, 0], [T_GRIP, 1, E.io]]);
    const runA = Math.sin(t * 17) * .6;
    const near = gRun ? { sh: -.5 + runA, el: .5 } : { sh: lerp(.1, r[0], reach), el: lerp(.3, r[1], reach) };
    const far = gRun ? { sh: .5 - runA, el: .5 } : t > 3.3 && t < 3.72 ? { sh: 1.65, el: .05 } : t > 3.72 && t < 4.3 ? { sh: .6, el: 1.8 } : { sh: .1, el: .3 };
    const gEx = t < 3.25 ? { eyes: 'wide', mouth: 'o', brow: 1 } : t < 3.72 ? { eyes: 'open', mouth: 'flat', sadBrow: 1, lookX: 1, lookY: .4 } : t < C2[1] ? { eyes: 'open', mouth: 'flat', sadBrow: 1, lookX: -1, lookY: .2 } : t < T_GRIP ? { eyes: 'wide', mouth: 'o', brow: 1, lookX: 1, lookY: 1 } : { eyes: 'happy', mouth: 'grin' };
    personSide(ctx, CAST.catGirl, { x: gx, y: gy, f: 1, legs: gRun ? walkLegs(t / .34, .55) : standLegs(.04, .03), lean: gRun ? .2 : 0, arms: { near, far }, ex: gEx, nod: t > 3.3 && t < 3.72 ? -.15 : 0,
      hold: { near: (c, w) => { if (t > T_GRIP + .08) cone(c, w[0] - .01, w[1] - .05, -.15, 1, CS); } } });
  }
  // kid
  const kEx = t < .55 ? { eyes: 'happy', mouth: 'o' } : t < T_FALL[0] ? { eyes: 'happy', mouth: 'o' } : t < T_FALL[1] ? { eyes: 'wide', mouth: 'o', brow: 1, lookY: -1 } : t < C1[1] ? { eyes: 'sad', mouth: 'cry', sadBrow: 1, lookY: -1 } : t < 2.36 ? { eyes: 'wide', mouth: 'o', brow: 1, lookY: 1, lookX: .5 } : t < 2.98 ? { eyes: 'wide', mouth: 'o', lookY: 1 } : { eyes: 'happy', mouth: 'o' };
  const kNScoops = t < T_FALL[0] ? 2 : t < TR1[0] + .5 * (TR1[1] - TR1[0]) ? 0 : t < TR2[0] + .5 * (TR2[1] - TR2[0]) ? 1 : 2;
  personSide(ctx, CAST.iceKid, { x: kx, y: 0, f: kf_, legs: kWalk ? walkLegs((t - 3.15) / .5, .38) : standLegs(.04, .03), arms: { near: kArm, far: { sh: .1, el: .3 } }, ex: kEx, nod: t < T_FALL[1] ? .1 : t < C1[1] ? .3 : holdUp > .5 ? -.3 : 0,
    hold: { near: (c, w) => { cone(c, w[0] - .01, w[1] - .06, coneRot, kNScoops, CS); if (t < .6 || kWalk) { const top = scoopTop(2); const lk = Math.abs(Math.sin(t * 9)); if (lk > .5) { ell(c, top[0] - .04 * kf_ * -1 * (kWalk ? -1 : 1), top[1] + .02, .022, .014); fs(c, '#e5838c', OLW * .6); } } } } });
  // the two scoops tumbling off the tipped cone
  if (t >= T_FALL[0] && t < T_FALL[1]) {
    const u = seg(t, ...T_FALL);
    [[2, 'van', -.05], [1, 'choc', .04]].forEach(([n, kind, dx]) => { const p0 = scoopTop(n), p1 = [splat[0] + dx, splat[1] + .03]; scoop(ctx, lerp(p0[0], p1[0], u), lerp(p0[1], p1[1], u * u) + Math.sin(Math.PI * u) * .06, kind, u * 3 * (n === 1 ? 1 : -1), u > .9 ? (u - .9) * 5 : 0); });
  }
  heroSide(ctx, heroP(t));
  if (t > 2.45) {
    if (t < 2.95) cat(ctx, catX, splat[1] - .06, 1, { pose: 'walk', ph: t * 4.5, eyes: 'open', tail: .3 });
    else cat(ctx, catX, splat[1] - .06, 1, { pose: 'crouch', eyes: 'happy', headY: -.05, headRot: -.35, tongue: Math.abs(Math.sin((t - 2.95) * 16)), tail: .5 + Math.sin(t * 5) * .3 });
  }
  // ---- the coins: big, gold, with a trail; a glint in the jar ----
  const coinArc = (tc, c0, c1, hh) => {
    if (t <= c0 || t > c1 + .01) return;
    const h0 = heroSide(ctx, Object.assign(heroP(tc), { measure: 1 })).handL;
    const p0 = [h0[0] + .03, h0[1] + .05], p1 = [jar[0], jar[1] + .28];
    const at = u => [lerp(p0[0], p1[0], u), lerp(p0[1], p1[1], u) + Math.sin(Math.PI * u) * hh];
    const u = seg(t, c0, c1);
    ctx.save(); ctx.lineCap = 'round'; for (let k = 6; k >= 1; k--) { const a = at(Math.max(0, u - k * .03)), b = at(Math.max(0, u - (k - 1) * .03)); ctx.strokeStyle = `rgba(250,215,100,${.5 - k * .07})`; ctx.lineWidth = px(14 - k * 1.6); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); } ctx.restore();
    const q = at(u), sp = Math.abs(Math.cos(u * 18)); ell(ctx, q[0], q[1], .085, .085 * sp + .016); fs(ctx, '#f0c040', 2); if (sp > .5) { ell(ctx, q[0], q[1], .055, .055 * sp); st(ctx, 1.4, 'rgba(160,110,20,.8)'); }
    ctx.fillStyle = 'rgba(255,252,230,.95)'; circ(ctx, q[0] - .025, q[1] + .02 * sp, .016); ctx.fill();
    if (u < .15) sparkle(ctx, p0, .09 * (1 - u / .15), 1);
  };
  coinArc(T_F1, ...C1, 1.05); coinArc(T_F2, ...C2, 1.05);   // high: over the vendor's head, in front of the awning, down into the jar
  [C1[1], C2[1]].forEach(ct => { if (t > ct - .02 && t < ct + .25) { const u = seg(t, ct - .02, ct + .25); ctx.strokeStyle = `rgba(255,236,160,${1 - u})`; ctx.lineWidth = px(3); for (let k = 0; k < 8; k++) { const a = k * TAU / 8; ctx.beginPath(); ctx.moveTo(jar[0] + Math.cos(a) * .12, jar[1] + .3 + Math.sin(a) * .12); ctx.lineTo(jar[0] + Math.cos(a) * (.18 + u * .1), jar[1] + .3 + Math.sin(a) * (.18 + u * .1)); ctx.stroke(); } } });
}, { notes: 'The kid licks too eagerly and both scoops topple onto the pavement, where they stay. The man stops and flicks a big gold coin into the tip jar; the vendor gets it at once and piles two fresh scoops on the kid’s cone. The orange cat smells the dropped ice cream and runs in for it with the girl behind it; she watches the kid walk off licking, so a second coin buys her a cone, which she takes straight from the vendor’s hand.' });
