// ===== the hero: one locked model sheet =====
// Right hand = coffee, left hand = umbrella. No glasses. Brown chelsea boots. Coat to mid-shin.
const HERO = {
  thigh: .47, shin: .46, torso: .56, upper: .31, fore: .29,
  coat: '#1f232a', coatDk: '#171a20', coatHi: '#2e3440', shirt: '#f4f2ec', shirtSh: '#dcd9d2', tie: '#131519',
  trou: '#1c1f25', trouDk: '#15171c', skin: '#e8b691', skinDk: '#cf9876', hair: '#131519', boot: '#6e4731', bootDk: '#57371f', sole: '#2e1f17',
  lip: '#b2705f', eyeW: '#f6f1ea',
};

// ---------- continuity state (umbrella tip / canopy / trouser) ----------
// tip: 0 clean, 1 poop, 2 more poop; grease 0..1 (sausage); dirt: canopy grime 0..1; leg: poop smears on his LEFT shin 0..2; water: umbrella bowl 0..1
let HS = { tip: 0, grease: 0, dirt: 0, leg: 0, water: 0, bit: 0, sausage: 0 };
function resetHS() { HS = { tip: 0, grease: 0, dirt: 0, leg: 0, water: 0, bit: 0, sausage: 0 }; if (typeof window !== 'undefined' && window.HSO) Object.assign(HS, window.HSO); }
function smear(ctx, x, y, r, rot = 0) {
  // a bird dropping stuck to something: lumpy white blob, grey-green core, a small satellite drop
  local(ctx, x, y, rot);
  smooth(ctx, [[-r, -.1 * r], [-.7 * r, .55 * r], [-.1 * r, .75 * r], [.35 * r, .5 * r], [.95 * r, .35 * r], [.8 * r, -.35 * r], [.2 * r, -.75 * r], [-.5 * r, -.6 * r]], true, .7); fs(ctx, '#efece2', OLW * .7);
  ell(ctx, .05 * r, .05 * r, .38 * r, .3 * r, .4); ctx.fillStyle = 'rgba(105,110,78,.75)'; ctx.fill();
  circ(ctx, 1.25 * r, -.55 * r, .22 * r); fs(ctx, '#efece2', OLW * .5);
  ctx.restore();
}
function streak(ctx, a, b, w) {
  // a wiped smear: lumpy blob where the tip touched first, dragged into a ragged, thinning tail
  const d = [b[0] - a[0], b[1] - a[1]], L = Math.hypot(d[0], d[1]) || 1, n = [-d[1] / L, d[0] / L];
  const q = (u, k) => [a[0] + d[0] * u + n[0] * w * k, a[1] + d[1] * u + n[1] * w * k];
  smooth(ctx, [q(-.28, .2), q(-.2, 1.05), q(.08, 1.2), q(.3, .7), q(.5, .75), q(.72, .35), q(.95, .3), q(1.05, .05), q(.9, -.2), q(.66, -.25), q(.45, -.55), q(.22, -.6), q(.05, -1.15), q(-.22, -.85)], true, .55); fs(ctx, '#ebe8dd', OLW * .6);
  ctx.fillStyle = 'rgba(100,104,72,.75)'; ell(ctx, ...q(.0, .05), w * .45, w * .35, Math.atan2(d[1], d[0])); ctx.fill(); ell(ctx, ...q(.5, .1), w * .22, w * .16); ctx.fill();
  circ(ctx, ...q(.35, 1.9), w * .22); fs(ctx, '#ebe8dd', OLW * .4); circ(ctx, ...q(.8, -1.2), w * .16); fs(ctx, '#ebe8dd', OLW * .4);
}
function legSmears(ctx, K, A, n) {
  if (n <= 0) return;
  ctx.save(); if (n < 1) ctx.globalAlpha *= n;
  streak(ctx, mix(K, A, .26), mix(K, A, .6), .05);
  if (n >= 2) streak(ctx, add(mix(K, A, .6), [.006, 0]), add(mix(K, A, .86), [-.004, 0]), .032);
  ctx.restore();
}

// ---------- gait ----------
function walkLegs(ph, A = .34) {
  const leg = p => {
    p = ((p % 1) + 1) % 1;
    const th = A * Math.cos(TAU * p);
    let kn = .07 + .06 * Math.sin(Math.PI * clamp(p / .5)) ;
    if (p > .5) kn = .09 + .85 * Math.pow(Math.sin(Math.PI * (p - .5) * 2), 1.2);
    let fa = 0;
    if (p < .1) fa = .28 * (1 - p / .1);
    else if (p > .36 && p <= .5) fa = -.55 * ((p - .36) / .14);
    else if (p > .5 && p < .64) fa = -.55 * (1 - (p - .5) / .14) - .1 * Math.sin(Math.PI * (p - .5) / .14);
    else if (p > .88) fa = .28 * ((p - .88) / .12);
    return { th, kn, fa };
  };
  return [leg(ph), leg(ph + .5)];
}
const STRIDE = (A = .34) => 2 * (HERO.thigh + HERO.shin) * Math.sin(A) * .97; // metres per step
function walkX(t, T = 1.1, A = .34) { return t * STRIDE(A) / (T / 2); }
function standLegs(sp = .06, kn = .03) { return [{ th: sp, kn, fa: 0 }, { th: -sp, kn, fa: 0 }]; }
function walkArms(ph, amt = 1) {
  const s = Math.cos(TAU * ph) * amt;
  return {
    R: { sh: -.12 - .07 * s, el: 1.45 + .05 * s, wr: 0 },     // coffee arm (swings little: holding a drink)
    L: { sh: .05 + .2 * s, el: .22 + .08 * Math.max(0, s), wr: 0 }, // umbrella arm
  };
}

// ---------- props held by the hero ----------
function drawCup(ctx, x, y, ang = 0, sc = 1, lidMark = true) {
  local(ctx, x, y, ang, sc);
  // body
  P(ctx, [[-.045, .06], [.045, .06], [.034, -.075], [-.034, -.075]]); fs(ctx, '#f6f4ef');
  // sleeve
  P(ctx, [[-.042, .028], [.042, .028], [.037, -.035], [-.037, -.035]]); fs(ctx, '#c79d6d');
  ctx.fillStyle = 'rgba(0,0,0,.08)'; P(ctx, [[.018, .028], [.042, .028], [.037, -.035], [.016, -.035]]); ctx.fill();
  // lid
  rrect(ctx, -.052, .058, .104, .02, .006); fs(ctx, '#fbfaf6');
  P(ctx, [[-.043, .077], [.043, .077], [.036, .09], [-.036, .09]]); fs(ctx, '#f1eee8');
  if (lidMark) { ctx.fillStyle = INK; rrect(ctx, .012, .086, .018, .005, .002); ctx.fill(); }
  ctx.restore();
}

// Umbrella. (x,y) = point on the umbrella held by the hand, ang = direction grip->tip (standard radians, y up)
// o.open 0..1, o.cs crook side (+1/-1), o.gripU where along the umbrella the hand is (0 = crook grip)
function drawUmbrella(ctx, x, y, ang, o = {}) {
  const open = o.open || 0, cs = o.cs == null ? 1 : o.cs, gu = o.gripU || 0, sc = o.sc || 1;
  local(ctx, x, y, ang, sc);
  ctx.translate(-gu, 0);
  const wood = '#8e5b34';
  // shaft
  const top = .79;
  if (!o.noShaft) {
  seg2(ctx, [0, 0], [top + .08, 0], OLW * 2 + .013 * S, INK);
  seg2(ctx, [0, 0], [top + .08, 0], .013 * S, '#3a3d44');
  // ferrule tip
  P(ctx, [[top, -.007], [top + .1, -.002], [top + .1, .002], [top, .007]]); fs(ctx, '#b9bcc2');
  // crook (J hook) behind grip
  const hook = [[.02, 0], [-.07, 0]];
  for (let i = 0; i <= 12; i++) { const a = -Math.PI / 2 - i / 12 * Math.PI * 1.15; hook.push([-.07 + Math.cos(a) * .045, cs * (.045 + Math.sin(a) * .045)]); }
  limb(ctx, hook, .024, wood);
  // collar
  rrect(ctx, .015, -.012, .03, .024, .004); fs(ctx, '#2b2d32');
  }
  if (open < .04) {
    // closed bundle
    const prof = [[.07, .014], [.11, .045], [.19, .052], [.34, .04], [.53, .026], [.68, .014], [top, .006]];
    const pts = prof.map(([u, w]) => [u, w]).concat(prof.slice().reverse().map(([u, w]) => [u, -w * .9]));
    smooth(ctx, pts, true, .4); fs(ctx, '#262c38');
    // fold lines + a cool rim light along the upper edge (keeps it readable against the black coat)
    ctx.save(); smooth(ctx, pts, true, .4); ctx.clip();
    ctx.beginPath(); prof.forEach(([u, w], i) => i ? ctx.lineTo(u, w * .72) : ctx.moveTo(u, w * .72)); ctx.strokeStyle = 'rgba(175,190,215,.55)'; ctx.lineWidth = px(2.6); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.10)'; ctx.lineWidth = px(1.6);
    ctx.beginPath(); ctx.moveTo(.13, .035); ctx.quadraticCurveTo(.3, .005, .62, -.018); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(.2, .048); ctx.quadraticCurveTo(.42, .03, .7, .01); ctx.stroke();
    ctx.restore();
    // strap
    P(ctx, [[.3, .047], [.35, .044], [.35, -.042], [.3, -.045]]); fs(ctx, '#23262c');
    circ(ctx, .325, .02, .007); fs(ctx, '#8a8d93', OLW * .6);
    // rib tips
    ctx.fillStyle = '#9da0a6'; circ(ctx, .1, .043, .005); ctx.fill(); circ(ctx, .1, -.04, .005); ctx.fill();
  } else {
    const beta = lerp(.14, 1.28, E.o(open)), Lr = .57;
    const ru = top - Lr * Math.cos(beta), rv = Lr * Math.sin(beta);
    const bul = .03 + .1 * open;
    // underside (visible rim ellipse)
    ctx.beginPath(); ctx.ellipse(ru, 0, .02 + .06 * open, rv, 0, 0, TAU); ctx.fillStyle = o.lining || '#3a404c'; ctx.fill();
    if (open > .5) { ctx.save(); ctx.beginPath(); ctx.ellipse(ru, 0, .02 + .06 * open, rv, 0, 0, TAU); ctx.clip(); ctx.strokeStyle = 'rgba(20,22,28,.6)'; ctx.lineWidth = px(1.4); for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(ru - .08, 0); ctx.lineTo(ru + .1, rv * k / 3); ctx.stroke(); } ctx.restore(); }
    // dome
    ctx.beginPath(); ctx.moveTo(top, 0);
    ctx.quadraticCurveTo(lerp(top, ru, .45) + bul * .6, rv * .62 + bul, ru, rv);
    // scalloped rim (seen near edge-on)
    const nS = 4;
    for (let i = 0; i < nS; i++) {
      const v0 = rv - 2 * rv * i / nS, v1 = rv - 2 * rv * (i + 1) / nS;
      ctx.quadraticCurveTo(ru + .045 * open, (v0 + v1) / 2, ru, v1);
    }
    ctx.quadraticCurveTo(lerp(top, ru, .45) + bul * .6, -rv * .62 - bul, top, 0);
    ctx.closePath(); fs(ctx, '#232833');
    // seams
    ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(160,170,190,.22)'; ctx.lineWidth = px(1.5);
    for (let k = -2; k <= 2; k++) { const v = rv * k / 2.4; ctx.beginPath(); ctx.moveTo(top, 0); ctx.quadraticCurveTo(lerp(top, ru, .5) + bul * .5, v * .7, ru + .01, v); ctx.stroke(); }
    ctx.restore();
    // rib tips
    ctx.fillStyle = '#9da0a6';
    for (let i = 0; i <= nS; i++) { circ(ctx, ru + .004, rv - 2 * rv * i / nS, .007); ctx.fill(); }
    const dirt = o.dirt != null ? o.dirt : HS.dirt;
    if (dirt > 0) { ctx.fillStyle = `rgba(120,95,60,${.55 * dirt})`; [[.4, .3, .05], [.6, -.35, .06], [.75, .6, .045], [.5, -.7, .04], [.3, .05, .035], [.85, -.1, .05]].forEach(([k, v, r]) => { ell(ctx, lerp(top, ru, k), rv * v * k, r * 1.0, r * 1.5, .3); ctx.fill(); }); }
    const water = o.water != null ? o.water : HS.water;
    if (water > 0) { ctx.beginPath(); ctx.ellipse(ru + .012, 0, .02 + .04 * water, rv * .92, 0, 0, TAU); ctx.fillStyle = `rgba(150,195,220,${.85 * water})`; ctx.fill(); st(ctx, OLW * .7, 'rgba(70,110,140,.8)'); }
  }
  if (open < .04) { const dirt = o.dirt != null ? o.dirt : HS.dirt; if (dirt > 0) { ctx.fillStyle = `rgba(120,95,60,${.6 * dirt})`; [[.22, .02, .03], [.42, -.015, .025], [.58, .008, .02], [.15, -.02, .02]].forEach(([u, v, r]) => { ell(ctx, u, v, r, r * .6); ctx.fill(); }); } }
  // what is stuck on the tip
  const tipL = o.tip != null ? o.tip : HS.tip, gr = o.grease != null ? o.grease : HS.grease;
  if (gr > 0) { ctx.fillStyle = `rgba(200,110,60,${.55 * gr})`; P(ctx, [[top - .1, .012], [top + .1, .006], [top + .1, -.006], [top - .1, -.012]]); ctx.fill(); ctx.fillStyle = `rgba(255,235,200,${.7 * gr})`; ell(ctx, top + .02, .004, .03, .003); ctx.fill(); }
  const bit = o.bit != null ? o.bit : HS.bit;
  const sau = o.sausage != null ? o.sausage : HS.sausage;
  // a sausage skewered lengthwise on the tip, the ferrule poking out of its far end
  if (sau > 0) { local(ctx, top + .005, 0, 0); ell(ctx, 0, 0, .075, .037); fs(ctx, '#b4542f', OLW * .9); ctx.fillStyle = 'rgba(255,230,210,.45)'; ell(ctx, -.01, .014, .045, .009); ctx.fill(); circ(ctx, -.075, 0, .01); ctx.fillStyle = '#8a3a2a'; ctx.fill(); ctx.restore(); P(ctx, [[top + .074, -.006], [top + .1, -.002], [top + .1, .002], [top + .074, .006]]); fs(ctx, '#b9bcc2'); }
  if (bit > 0) { local(ctx, top + .05, .0, .3); ell(ctx, 0, 0, .05, .03); fs(ctx, '#b4542f', OLW * .9); ell(ctx, -.01, .008, .022, .008); ctx.fillStyle = 'rgba(255,225,205,.7)'; ctx.fill(); ctx.restore(); }
  if (tipL >= 1) smear(ctx, top + .065, .004, .022, .5);
  if (tipL >= 2) { smear(ctx, top + .02, -.01, .026, -.4); smear(ctx, top + .1, .012, .017, 1.2); }
  ctx.restore();
}

// open umbrella seen from the outside, face-on (the dome towards the viewer). (cx,cy) = the tip
function umbrellaFaceOn(ctx, cx, cy, R, o = {}) {
  const dirt = o.dirt != null ? o.dirt : HS.dirt, wet = o.wet || 0, rot = o.rot || 0;
  local(ctx, cx, cy, rot);
  const N = 8, ribs = [];
  for (let k = 0; k < N; k++) { const a = k * TAU / N + Math.PI / 8; ribs.push([Math.cos(a) * R, Math.sin(a) * R * (o.squash || 1)]); }
  const outline = () => { ctx.beginPath(); ctx.moveTo(...ribs[0]); for (let k = 0; k < N; k++) { const p = ribs[k], q = ribs[(k + 1) % N], m = mix(p, q, .5); ctx.quadraticCurveTo(m[0] * .9, m[1] * .9, q[0], q[1]); } ctx.closePath(); };
  outline(); fs(ctx, '#1b1d22');
  ctx.save(); outline(); ctx.clip();
  const g = ctx.createRadialGradient(-R * .25, R * .3, R * .05, 0, 0, R * 1.05); g.addColorStop(0, 'rgba(150,160,180,.28)'); g.addColorStop(.6, 'rgba(90,100,120,.08)'); g.addColorStop(1, 'rgba(0,0,0,.25)');
  ctx.fillStyle = g; ctx.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4);
  ctx.strokeStyle = 'rgba(160,170,190,.3)'; ctx.lineWidth = px(1.6);
  ribs.forEach(p => { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(p[0], p[1]); ctx.stroke(); });
  if (dirt > 0) {
    const r = rng(33); ctx.fillStyle = `rgba(128,106,76,${.6 * dirt})`;
    for (let i = 0; i < 9; i++) { const a = r() * TAU, d = R * (.25 + r() * .6), rr = R * (.06 + r() * .08); smooth(ctx, [[Math.cos(a) * d - rr, Math.sin(a) * d], [Math.cos(a) * d, Math.sin(a) * d + rr * .7], [Math.cos(a) * d + rr * 1.2, Math.sin(a) * d + rr * .2], [Math.cos(a) * d + rr * .3, Math.sin(a) * d - rr * .6]], true, .7); ctx.fill(); }
    ctx.fillStyle = `rgba(150,128,95,${.5 * dirt})`; for (let i = 0; i < 20; i++) { const a = r() * TAU, d = R * r(); circ(ctx, Math.cos(a) * d, Math.sin(a) * d, R * .015); ctx.fill(); }
  }
  if (wet > 0) {
    const r = rng(12); ctx.strokeStyle = `rgba(200,225,240,${.55 * wet})`; ctx.lineWidth = px(2.2); ctx.lineCap = 'round';
    for (let i = 0; i < 10; i++) { const x = (r() - .5) * R * 1.6, y0 = R * (r() * .8 - .1), l = R * (.2 + r() * .4); ctx.beginPath(); ctx.moveTo(x, y0); ctx.quadraticCurveTo(x + R * .03, y0 - l * .5, x, y0 - l); ctx.stroke(); }
    ctx.fillStyle = `rgba(230,242,250,${.7 * wet})`; for (let i = 0; i < 14; i++) { circ(ctx, (r() - .5) * R * 1.7, (r() - .5) * R * 1.7, R * .018); ctx.fill(); }
  }
  ctx.restore();
  outline(); st(ctx);
  ctx.fillStyle = '#9da0a6'; ribs.forEach(p => { circ(ctx, p[0], p[1], R * .018); ctx.fill(); });
  circ(ctx, 0, 0, R * .045); fs(ctx, '#b9bcc2', OLW * .8);
  ctx.restore();
}

// ---------- side view ----------
function heroSide(ctx, p) {
  const f = p.f == null ? 1 : p.f, Hr = HERO;
  const legs = p.legs || standLegs();
  const fk = l => {
    const K = add([0, 0], dn(l.th, f), Hr.thigh);
    const A = add(K, dn(l.th - l.kn, f), Hr.shin);
    const fa = l.fa || 0, c = Math.cos(fa), s = Math.sin(fa);
    const T = (x, y) => [A[0] + f * (x * c - y * s), A[1] + (x * s + y * c)];
    const boot = [T(-.042, .07), T(.03, .07), T(.06, .012), T(.15, -.02), T(.2, -.038), T(.21, -.066), T(-.048, -.07), T(-.058, -.028)];
    return { K, A, boot, low: Math.min(...boot.map(q => q[1])) };
  };
  let L = legs.map(fk);
  const hy = p.hipY != null ? p.hipY : (p.y || 0) - Math.min(L[0].low, L[1].low);
  const Hp = [p.x || 0, hy];
  L = L.map(l => ({ K: add(l.K, Hp), A: add(l.A, Hp), boot: l.boot.map(q => add(q, Hp)) }));
  const lean = p.lean == null ? -.03 : p.lean;
  const Sh = add(Hp, upv(lean, f), Hr.torso);
  const fw = q => (q[0] - Hp[0]) * f;
  const out = { Hp, Sh, L };

  let arms = p.arms || walkArms(0, 0);
  // sip: the cup hand goes to the mouth by IK; the cup tilts as he drinks
  const sipT = p.sipT || 0;
  if (sipT > 0) {
    const r = arms.R, J0 = add(Sh, [-.005 * f, -.035]);
    const E0 = add(J0, dn(r.sh, f), Hr.upper), W0 = add(E0, dn(r.sh + r.el, f), Hr.fore), H0 = add(W0, dn(r.sh + r.el + (r.wr || 0), f), .035);
    arms = Object.assign({}, arms, { R: heroArmIK(Sh, mix(H0, add(Sh, [.148 * f, .073]), E.io(sipT)), f) });
  }
  const sipOn = p.sip || sipT > .3;
  const armFK = a => {
    const J = add(Sh, [-.005 * f, -.035]);
    const El = add(J, dn(a.sh, f), Hr.upper);
    const Wr = add(El, dn(a.sh + a.el, f), Hr.fore);
    const Hc = add(Wr, dn(a.sh + a.el + (a.wr || 0), f), .035);
    return { J, El, Wr, Hc, d: dn(a.sh + a.el, f) };
  };
  const AR = armFK(arms.R), AL = armFK(arms.L);
  out.handR = AR.Hc; out.handL = AL.Hc;
  if (p.measure) return out;

  const drawLeg = (l, far, isLeft) => {
    limb(ctx, [Hp, l.K, l.A], .094, far ? Hr.trouDk : Hr.trou);
    if (isLeft && (p.leg != null ? p.leg : HS.leg) > 0) legSmears(ctx, l.K, l.A, p.leg != null ? p.leg : HS.leg);
    smooth(ctx, l.boot, true, .35); fs(ctx, far ? Hr.bootDk : Hr.boot);
    // sole + chelsea gusset
    ctx.beginPath(); ctx.moveTo(l.boot[5][0], l.boot[5][1]); ctx.lineTo(l.boot[6][0], l.boot[6][1]); st(ctx, OLW * 2.2, Hr.sole);
    const g0 = mix(l.boot[0], l.boot[1], .5), g1 = mix(l.boot[7], l.boot[2], .55);
    ctx.beginPath(); ctx.moveTo(g0[0], g0[1]); ctx.lineTo(g1[0], g1[1]); st(ctx, OLW * .8, 'rgba(0,0,0,.35)');
  };
  const umbDraw = (A) => {
    const u = p.umb || {};
    const ang = u.ang != null ? u.ang : -Math.PI / 2 + (u.swing || 0);
    drawUmbrella(ctx, u.at ? u.at[0] : A.Hc[0], u.at ? u.at[1] : A.Hc[1], ang, { open: u.open || 0, cs: u.cs != null ? u.cs : f, gripU: u.gripU || 0 });
  };
  const drawArm = (A, isR, far) => {
    const col = far ? Hr.coatDk : Hr.coat;
    if (!isR && p.umb !== false && !(p.umb && p.umb.hidden)) umbDraw(A);
    limb(ctx, [A.J, A.El, A.Wr], .084, col);
    // flared cuff
    const d = A.d, n = [-d[1], d[0]];
    const b0 = add(A.Wr, d, -.075), b1 = add(A.Wr, d, .012);
    P(ctx, [add(b0, n, .05), add(b1, n, .066), add(b1, n, -.066), add(b0, n, -.05)]); fs(ctx, col);
    // hand
    const ha = Math.atan2(d[1], d[0]);
    if (isR && p.cup !== false) {
      const cupHand = () => {
        const cp = p.cupAt || add(A.Hc, [.012 * f, .012]);
        drawCup(ctx, cp[0], cp[1], p.cupAng != null ? p.cupAng : (p.sip ? .45 * f : .45 * f * E.io(sipT)));
        ell(ctx, A.Hc[0] + .004 * f, A.Hc[1], .034, .03, 0); fs(ctx, far && !sipOn ? Hr.skinDk : Hr.skin);
        ctx.beginPath(); ctx.moveTo(A.Hc[0] + .02 * f, A.Hc[1] + .012); ctx.lineTo(A.Hc[0] + .022 * f, A.Hc[1] - .014); st(ctx, OLW * .7);
      };
      if (far && (sipOn || p.cupOver)) deferred.push(cupHand); else cupHand();
    } else {
      ell(ctx, A.Hc[0], A.Hc[1], .036, .03, ha); fs(ctx, far ? Hr.skinDk : Hr.skin);
    }
  };

  const nearR = f === -1;
  const deferred = [];
  if (p.shadow !== false) { const gy = p.gy != null ? p.gy : (p.y || 0); const low = Math.min(...L[0].boot.map(q => q[1]), ...L[1].boot.map(q => q[1])); const hgt = Math.max(0, low - gy); shadow(ctx, Hp[0] + .03 * f, gy + .005, .3 / (1 + hgt * 1.5), .2 / (1 + hgt * 3)); }
  // far arm
  if (nearR) drawArm(AL, false, true); else drawArm(AR, true, true);
  // legs (far first)
  const order = fw(L[0].A) > fw(L[1].A) ? [1, 0] : [0, 1];
  drawLeg(L[1], true, f === -1); drawLeg(L[0], false, f === 1);
  // neck
  const nb = add(Sh, [.02 * f, .02]), nt = add(Sh, [.045 * f, .13]);
  limb(ctx, [nb, nt], .044, Hr.skin);
  // shirt + tie
  const tw = p.tieWind || 0;
  const shirt = [add(Sh, [.02 * f, .085]), add(Sh, [.07 * f, .07]), add(mix(Sh, Hp, .3), [.09 * f, 0]), add(mix(Sh, Hp, .75), [.085 * f, 0]), add(Hp, [.08 * f, .0]), add(Hp, [-.02 * f, .0]), add(Sh, [-.03 * f, .03])];
  smooth(ctx, shirt, true, .35); fs(ctx, Hr.shirt);
  const t0 = add(Sh, [.075 * f, .055]), t1 = add(mix(Sh, Hp, .62), [(.097 - tw * .06) * f, tw * .05]);
  P(ctx, [add(t0, [-.012 * f, 0]), add(t0, [.012 * f, 0]), add(t1, [.014 * f, 0]), add(t1, [0, -.03]), add(t1, [-.012 * f, 0])]); fs(ctx, Hr.tie);
  // coat
  const kF = Math.max(fw(L[0].K), fw(L[1].K)), kB = Math.min(fw(L[0].K), fw(L[1].K));
  const fl = p.coatFlare || 0, cw = p.coatWind || 0, csh = p.coatShort || 0, clen = .63 * (1 - .55 * csh);
  const hemF = [Hp[0] + f * (lerp(Math.max(.14, kF + .085), .17, csh) - cw * .04), Hp[1] - clen + fl * .06 + Math.max(0, kF - .15) * .3 * (1 - csh)];
  const hemB = [Hp[0] + f * (Math.min(-.15, kB - .09) - fl * .26 - cw * .16), Hp[1] - clen + .02 + fl * .2 + cw * .1];
  const hemM = [lerp(hemF[0], hemB[0], .5), Math.min(hemF[1], hemB[1]) - .015];
  const coat = [add(Sh, [-.07 * f, .0]), add(Sh, [-.012 * f, .045]), add(Sh, [.055 * f, .02]), add(mix(Sh, Hp, .35), [.03 * f, 0]), add(Hp, [.065 * f, .1]), hemF, hemM, hemB, add(Hp, [-.11 * f - cw * .03 * f, .05]), add(mix(Sh, Hp, .45), [-.09 * f, 0])];
  smooth(ctx, coat, true, .38); fs(ctx, Hr.coat);
  ctx.save(); smooth(ctx, coat, true, .38); ctx.clip();
  const cg = ctx.createLinearGradient(Hp[0] - .2 * f, 0, Hp[0] + .12 * f, 0); cg.addColorStop(0, 'rgba(0,0,0,.28)'); cg.addColorStop(.55, 'rgba(0,0,0,0)'); cg.addColorStop(1, 'rgba(120,135,160,.10)');
  ctx.fillStyle = cg; ctx.fillRect(Hp[0] - 1, Hp[1] - 1, 2, 2.2); ctx.restore(); smooth(ctx, coat, true, .38); st(ctx);
  // back seam hint
  const sm0 = add(mix(Sh, Hp, .2), [-.07 * f, 0]), sm1 = add(Hp, [-.1 * f, -.1]);
  ctx.beginPath(); ctx.moveTo(sm0[0], sm0[1]); ctx.quadraticCurveTo(sm1[0], sm1[1] + .2, sm1[0] - .01 * f, sm1[1]); st(ctx, OLW * .7, 'rgba(255,255,255,.07)');
  // collar
  P(ctx, [add(Sh, [-.04 * f, .07]), add(Sh, [.035 * f, .1]), add(Sh, [.065 * f, .035]), add(Sh, [-.05 * f, .03])]); fs(ctx, Hr.coatDk);
  P(ctx, [add(Sh, [.03 * f, .1]), add(Sh, [.075 * f, .085]), add(Sh, [.06 * f, .06])]); fs(ctx, Hr.shirt, OLW * .8);
  // head
  const hc = add(nt, [.012 * f, .09]);
  out.head = hc;
  heroHeadSide(ctx, hc[0], hc[1], f, sipT > .8 ? Object.assign({}, p, { sip: 1 }) : p);
  deferred.forEach(fn => fn());
  // near arm
  if (nearR) drawArm(AR, true, false); else drawArm(AL, false, false);
  return out;
}

function heroHeadSide(ctx, x, y, f, p) {
  const Hr = HERO;
  local(ctx, x, y, 0); ctx.scale(f, 1); ctx.rotate(-(p.nod || 0));
  const hw = p.hairWind || 0;
  // back hair (behind head)
  const hairPts = [[.045, .06], [.118, .002], [.075, .075], [.128, .085], [.07, .125], [.075, .19], [.015, .15], [-.03, .205], [-.05, .15], [-.125, .17], [-.1, .105], [-.175, .07], [-.11, .045], [-.145, -.03], [-.098, -.002], [-.105, -.07], [-.066, -.03], [-.052, -.012], [-.04, .03], [.0, .02], [.012, .055], [.03, .012]];
  const wind = q => [q[0] - hw * Math.max(0, q[1] + .02) * .5 - hw * Math.max(0, -q[0]) * .2, q[1] + hw * .01];
  // ear + face
  ctx.beginPath();
  ctx.moveTo(-.02, .125); ctx.quadraticCurveTo(.075, .128, .088, .055);
  ctx.lineTo(.094, .03); ctx.lineTo(.132, -.012); ctx.lineTo(.098, -.032);
  ctx.quadraticCurveTo(.101, -.052, .094, -.068);
  ctx.quadraticCurveTo(.093, -.1, .07, -.122);
  ctx.quadraticCurveTo(.02, -.1, -.03, -.07);
  ctx.quadraticCurveTo(-.105, -.025, -.1, .045);
  ctx.quadraticCurveTo(-.085, .12, -.02, .125); ctx.closePath();
  fs(ctx, Hr.skin);
  // jaw shadow
  // ear
  ell(ctx, -.028, .0, .02, .032, .1); fs(ctx, Hr.skin);
  ctx.beginPath(); ctx.arc(-.026, .0, .012, -1.2, 1.4); st(ctx, OLW * .7);
  // eye
  const op = p.eyes == null ? .38 : p.eyes, blink = p.blink || 0, o = op * (1 - blink);
  const ex = .058, ey = .016;
  ctx.save();
  ctx.beginPath(); ctx.moveTo(ex - .018, ey); ctx.quadraticCurveTo(ex, ey + .02, ex + .02, ey + .004); ctx.quadraticCurveTo(ex + .004, ey - .014, ex - .018, ey); ctx.closePath();
  ctx.fillStyle = Hr.eyeW; ctx.fill(); ctx.clip();
  circ(ctx, ex + .01, ey + .001, .008); ctx.fillStyle = INK; ctx.fill();
  // lid
  const lidY = ey - .006 + .017 * o;
  ctx.fillStyle = Hr.skinDk; ctx.fillRect(ex - .03, lidY, .06, .04);
  ctx.restore();
  ctx.beginPath(); ctx.moveTo(ex - .02, lidY - .001 + .002); ctx.quadraticCurveTo(ex, lidY + .004, ex + .022, lidY - .002); st(ctx, OLW * 1.6);
  // under-eye bag (open arc, never a closed ring)
  ctx.beginPath(); ctx.moveTo(ex - .012, ey - .012); ctx.quadraticCurveTo(ex + .003, ey - .018, ex + .015, ey - .01); st(ctx, OLW * .55, 'rgba(90,50,40,.55)');
  // brow
  const br = p.brow || 0, sad = p.sad || 0;
  ctx.beginPath(); ctx.moveTo(ex - .022, ey + .03 + br * .01 - sad * .004); ctx.quadraticCurveTo(ex, ey + .038 + br * .012, ex + .026, ey + .03 + br * .008 + sad * .01); st(ctx, OLW * 2.1, Hr.hair);
  // mouth
  const m = p.mouth || 0;
  ctx.beginPath(); ctx.moveTo(.095, -.057); ctx.quadraticCurveTo(.083, -.058 - m * .006, .07, -.055 + m * .008); st(ctx, OLW * .9);
  if (p.sip) { ell(ctx, .095, -.055, .006, .006); ctx.fillStyle = INK; ctx.fill(); }
  // hair (in front)
  locks(ctx, hairPts.map(wind), .22); fs(ctx, Hr.hair);
  // stray strands
  ctx.beginPath(); ctx.moveTo(-.03, .18); ctx.quadraticCurveTo(-.03 - hw * .04, .235, .02 - hw * .05, .245); st(ctx, OLW * .7, Hr.hair);
  ctx.restore();
}

// ---------- front view ----------
function heroFront(ctx, p) {
  const Hr = HERO, x = p.x || 0, y = p.y || 0;
  const sp = p.spread == null ? .05 : p.spread, kn = p.knee || 0, sway = p.sway || 0;
  const hipY = y + (p.hipH == null ? 1.0 - kn * .25 : p.hipH);
  const hx = x + sway;
  const legs = p.flegs || [{ a: -sp, k: kn }, { a: sp, k: kn }]; // a: thigh angle outward(+ to screen right), k: knee bend
  const out = { hip: [hx, hipY] };
  const LEG = [];
  legs.forEach((l, i) => {
    const s = i ? 1 : -1; const H0 = [hx + s * .075, hipY];
    const K = add(H0, [Math.sin(l.a), -Math.cos(l.a)], Hr.thigh);
    const A = add(K, [Math.sin(l.a - s * l.k * .5), -Math.cos(l.a - s * l.k * .5)], Hr.shin);
    LEG.push({ H0, K, A, s });
  });
  // ground them if needed
  if (p.hipH == null) { const dy = y + .075 - Math.min(LEG[0].A[1], LEG[1].A[1]); if (Math.abs(dy) < .5) LEG.forEach(l => { l.K[1] += dy; l.A[1] += dy; l.H0[1] += dy; }); out.hip[1] += dy; }
  const hp = out.hip;
  if (p.shadow !== false && !p.measure) shadow(ctx, hx, y + .005, .34, .2);
  const Sh = [hx + (p.lean || 0) * .56, hp[1] + Hr.torso];
  out.Sh = Sh;
  // arms: R = screen left (s=-1), L = screen right (s=+1)
  let arms = p.farms || { R: { sh: .12, el: -.3 }, L: { sh: .07, el: .05 } };
  // sip: the coffee hand goes straight up to the mouth (IK), never across the body
  const sipT = p.sipT || 0;
  if (sipT > 0) {
    const r = arms.R, J = [Sh[0] - .165, Sh[1] - .03];
    const El0 = add(J, [-Math.sin(r.sh), -Math.cos(r.sh)], Hr.upper * (r.fu || 1)), Wr0 = add(El0, [-Math.sin(r.sh + r.el), -Math.cos(r.sh + r.el)], Hr.fore * (r.ff || 1));
    const headC = [Sh[0] + (p.headX || 0), Sh[1] + .23];
    arms = Object.assign({}, arms, { R: frontArmIK(Sh, mix(Wr0, [headC[0] - .012, headC[1] - .215], E.io(sipT)), -1) });
  }
  const armFK = (a, s) => {
    const J = [Sh[0] + s * .165, Sh[1] - .03];
    const El = add(J, [s * Math.sin(a.sh), -Math.cos(a.sh)], Hr.upper * (a.fu || 1));
    const Wr = add(El, [s * Math.sin(a.sh + a.el), -Math.cos(a.sh + a.el)], Hr.fore * (a.ff || 1));
    return { J, El, Wr, s };
  };
  const AR = armFK(arms.R, -1), AL = armFK(arms.L, 1);
  out.handR = AR.Wr; out.handL = AL.Wr;
  if (p.measure) return out;
  // legs
  LEG.forEach((l, li) => {
    limb(ctx, [l.H0, l.K, l.A], .098, Hr.trou);
    if (li === 1 && (p.leg != null ? p.leg : HS.leg) > 0) legSmears(ctx, l.K, l.A, p.leg != null ? p.leg : HS.leg);
    const b = l.A; const s = l.s;
    ctx.beginPath(); ctx.moveTo(b[0] - .05, b[1] + .07); ctx.lineTo(b[0] + .05, b[1] + .07); ctx.lineTo(b[0] + .06, b[1] - .03);
    ctx.quadraticCurveTo(b[0] + .065 + s * .01, b[1] - .075, b[0] + s * .005, b[1] - .078);
    ctx.quadraticCurveTo(b[0] - .065 + s * .01, b[1] - .075, b[0] - .06, b[1] - .03); ctx.closePath(); fs(ctx, Hr.boot);
    ctx.beginPath(); ctx.moveTo(b[0] - .058, b[1] - .07); ctx.lineTo(b[0] + .058, b[1] - .07); st(ctx, OLW * 1.8, Hr.sole);
  });
  // torso shirt
  const nt = [Sh[0], Sh[1] + .13];
  limb(ctx, [[Sh[0], Sh[1]], nt], .055, Hr.skin);
  P(ctx, [[Sh[0] - .1, Sh[1] + .04], [Sh[0] + .1, Sh[1] + .04], [hp[0] + .1, hp[1] - .05], [hp[0] - .1, hp[1] - .05]]); fs(ctx, Hr.shirt);
  // tie
  const tw = p.tieWind || 0;
  P(ctx, [[Sh[0] - .015, Sh[1] + .06], [Sh[0] + .015, Sh[1] + .06], [Sh[0] + .02 + tw * .05, hp[1] + .18], [Sh[0] + tw * .07, hp[1] + .13], [Sh[0] - .02 + tw * .05, hp[1] + .18]]); fs(ctx, Hr.tie);
  P(ctx, [[Sh[0] - .02, Sh[1] + .08], [Sh[0] + .02, Sh[1] + .08], [Sh[0] + .012, Sh[1] + .04], [Sh[0] - .012, Sh[1] + .04]]); fs(ctx, Hr.tie);
  // coat panels
  const fl = p.coatFlare || 0, cw = p.coatWind || 0, tw2 = p.coatTwist || 0;
  const hemY = hp[1] - .6 + fl * .12;
  const panel = s => {
    const o = [[Sh[0] + s * .05, Sh[1] + .08], [Sh[0] + s * .165, Sh[1] + .03], [Sh[0] + s * .18, Sh[1] - .1], [hp[0] + s * .16, hp[1]], [hp[0] + s * (.24 + fl * .22) + cw * .15 + tw2 * .2, hemY + (s * cw > 0 ? cw * .08 : 0)],
    [hp[0] + s * (.05 + fl * .12) + cw * .1 + tw2 * .15, hemY - .015], [hp[0] + s * (.004 + fl * .08), hp[1] + .05], [Sh[0] + s * .028, Sh[1] - .2]];
    smooth(ctx, o, true, .3); fs(ctx, Hr.coat);
    ctx.save(); smooth(ctx, o, true, .3); ctx.clip(); const g = ctx.createLinearGradient(hp[0] + s * .28, 0, hp[0] + s * .05, 0); g.addColorStop(0, 'rgba(0,0,0,.26)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(hp[0] - 1, hp[1] - 1, 2, 2.5); ctx.restore(); smooth(ctx, o, true, .3); st(ctx);
  };
  panel(-1); panel(1);
  // lapels
  [-1, 1].forEach(s => { P(ctx, [[Sh[0] + s * .05, Sh[1] + .085], [Sh[0] + s * .11, Sh[1] + .03], [Sh[0] + s * .065, Sh[1] - .16]]); fs(ctx, Hr.coatDk); });
  // collar points
  [-1, 1].forEach(s => { P(ctx, [[Sh[0] + s * .012, Sh[1] + .09], [Sh[0] + s * .045, Sh[1] + .105], [Sh[0] + s * .038, Sh[1] + .03]]); fs(ctx, Hr.shirt, OLW * .8); });
  const drawA = (A, isR) => {
    if (!isR && p.umb !== false) {
      const u = p.umb || {};
      drawUmbrella(ctx, A.Wr[0], A.Wr[1] - .01, u.ang != null ? u.ang : -Math.PI / 2 + (u.swing || 0), { open: u.open || 0, cs: u.cs != null ? u.cs : -1, gripU: u.gripU || 0 });
    }
    limb(ctx, [A.J, A.El, A.Wr], .086, Hr.coat);
    const d = [A.Wr[0] - A.El[0], A.Wr[1] - A.El[1]]; const l = Math.hypot(...d); const dd = [d[0] / l, d[1] / l], n = [-dd[1], dd[0]];
    const b0 = add(A.Wr, dd, -.07), b1 = add(A.Wr, dd, .012);
    P(ctx, [add(b0, n, .05), add(b1, n, .065), add(b1, n, -.065), add(b0, n, -.05)]); fs(ctx, Hr.coat);
    const hc = add(A.Wr, dd, .035);
    if (isR && p.cup !== false) {
      const cp = p.cupAt || [hc[0] + .01, hc[1] + .02];
      out.cup = cp;
      if (p.cupFront || sipT > .35) { frontDefer = () => { drawCup(ctx, cp[0], cp[1], .12 * sipT); ell(ctx, hc[0], hc[1], .034, .032); fs(ctx, Hr.skin); }; }
      else { drawCup(ctx, cp[0], cp[1], 0); ell(ctx, hc[0], hc[1], .034, .032); fs(ctx, Hr.skin); }
    } else { ell(ctx, hc[0], hc[1], .032, .036); fs(ctx, Hr.skin); }
    A.hc = hc;
  };
  let frontDefer = null;
  drawA(AR, true); drawA(AL, false);
  // head
  const hc = [nt[0] + (p.headX || 0), nt[1] + .1];
  out.head = hc;
  heroHeadFront(ctx, hc[0], hc[1], sipT > .8 ? Object.assign({}, p, { sipF: 1 }) : p);
  if (frontDefer) frontDefer();
  if (p.after) p.after(out);
  return out;
}

function heroHeadFront(ctx, x, y, p) {
  const Hr = HERO; const hw = p.hairWind || 0;
  local(ctx, x, y, p.tilt || 0);
  // ears
  [-1, 1].forEach(s => { ell(ctx, s * .087, -.005, .019, .03, s * .15); fs(ctx, Hr.skin); ctx.beginPath(); ctx.arc(s * .087, -.005, .01, s > 0 ? -1.3 : 1.8, s > 0 ? 1.3 : 4.4); st(ctx, OLW * .6); });
  // face
  ctx.beginPath(); ctx.moveTo(0, .125);
  ctx.bezierCurveTo(.075, .125, .09, .08, .088, .02);
  ctx.bezierCurveTo(.086, -.04, .06, -.085, .0, -.132);
  ctx.bezierCurveTo(-.06, -.085, -.086, -.04, -.088, .02);
  ctx.bezierCurveTo(-.09, .08, -.075, .125, 0, .125); ctx.closePath(); fs(ctx, Hr.skin);
  // cheek shading
  ctx.fillStyle = 'rgba(170,95,75,.10)'; ell(ctx, -.055, -.04, .016, .008); ctx.fill(); ell(ctx, .055, -.04, .016, .008); ctx.fill();
  // eyes
  const op = p.eyes == null ? .38 : p.eyes, o = op * (1 - (p.blink || 0));
  const lookX = p.lookX || 0, lookY = p.lookY || 0;
  [-1, 1].forEach(s => {
    const ex = s * .038, ey = .012;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(ex - .022, ey); ctx.quadraticCurveTo(ex, ey + .02, ex + .022, ey); ctx.quadraticCurveTo(ex, ey - .016, ex - .022, ey); ctx.closePath();
    ctx.fillStyle = Hr.eyeW; ctx.fill(); ctx.clip();
    circ(ctx, ex + lookX * .01, ey - .002 + lookY * .006, .0085); ctx.fillStyle = INK; ctx.fill();
    const lidY = ey - .007 + .018 * o;
    ctx.fillStyle = Hr.skinDk; ctx.fillRect(ex - .03, lidY, .06, .04);
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(ex - .024, lidY - .002 + .002); ctx.quadraticCurveTo(ex, lidY + .004, ex + .024, lidY - .001); st(ctx, OLW * 1.7);
    ctx.beginPath(); ctx.moveTo(ex - .014, ey - .013); ctx.quadraticCurveTo(ex, ey - .019, ex + .014, ey - .013); st(ctx, OLW * .55, 'rgba(90,50,40,.5)');
    // brows
    const br = p.brow || 0, sad = p.sad || 0;
    ctx.beginPath(); ctx.moveTo(ex - s * .022, ey + .03 + br * .01 + sad * .012); ctx.quadraticCurveTo(ex, ey + .038 + br * .012 + sad * .004, ex + s * .026, ey + .028 + br * .008 - sad * .006); st(ctx, OLW * 2.1, Hr.hair);
  });
  // nose
  ctx.beginPath(); ctx.moveTo(.002, .005); ctx.lineTo(-.009, -.032); ctx.lineTo(.006, -.036); st(ctx, OLW * .85);
  ctx.fillStyle = 'rgba(160,90,70,.18)'; P(ctx, [[.002, .005], [-.009, -.032], [-.002, -.03]]); ctx.fill();
  // mouth
  const m = p.mouth || 0;
  if (p.sipF) { ell(ctx, 0, -.072, .008, .006); ctx.fillStyle = INK; ctx.fill(); }
  else { ctx.beginPath(); ctx.moveTo(-.02, -.072 + m * .005); ctx.quadraticCurveTo(0, -.075 - m * .008, .02, -.072 + m * .005 + (p.smirk || 0) * .006); st(ctx, OLW * .95); }
  // tear / raindrop on cheek
  if (p.tear) { const [tx, ty, ta] = p.tear, tsc = p.tearSc || 1; ctx.save(); ctx.globalAlpha = ta; ctx.translate(tx, ty); ctx.scale(tsc, tsc); ctx.translate(-tx, -ty); ctx.beginPath(); ctx.moveTo(tx, ty + .012); ctx.quadraticCurveTo(tx + .007, ty - .002, tx, ty - .007); ctx.quadraticCurveTo(tx - .007, ty - .002, tx, ty + .012); ctx.fillStyle = 'rgba(210,230,245,.9)'; ctx.fill(); st(ctx, OLW * .5, 'rgba(90,120,150,.8)'); ctx.fillStyle = '#fff'; circ(ctx, tx - .002, ty + .0, .0018); ctx.fill(); ctx.restore(); }
  // hair
  const w = q => [q[0] + hw * Math.max(0, q[1]) * .45, q[1]];
  const hair = [[-.075, .05], [-.104, -.03], [-.095, .05], [-.15, .03], [-.108, .1], [-.15, .13], [-.075, .15], [-.07, .205], [-.02, .168], [.025, .212], [.05, .16], [.125, .16], [.1, .105], [.158, .05], [.098, .05], [.102, -.024], [.076, .045],
  [.058, .004], [.04, .055], [.02, .016], [.0, .06], [-.028, -.028], [-.04, .055], [-.064, .01]];
  locks(ctx, hair.map(w), .2); fs(ctx, Hr.hair);
  ctx.beginPath(); ctx.moveTo(.0, .2); ctx.quadraticCurveTo(.03 + hw * .03, .245, .07 + hw * .04, .235); st(ctx, OLW * .7, Hr.hair);
  ctx.restore();
}

// ---------- back view ----------
function heroBack(ctx, p) {
  const Hr = HERO, x = p.x || 0, y = p.y || 0;
  const ph = p.phase || 0, walking = p.walk || 0;
  const hipY = y + 1.0 + (walking ? .015 * Math.cos(TAU * ph * 2) : 0);
  const out = {};
  // legs
  [-1, 1].forEach((s, i) => {
    const lift = walking ? Math.max(0, Math.sin(TAU * (ph + i * .5))) * .1 : 0;
    const H0 = [x + s * .085, hipY], A = [x + s * .09, y + .075 + lift];
    const K = [x + s * .09, lerp(A[1], hipY, .5)];
    limb(ctx, [H0, K, A], .11, Hr.trou);
    if (i === 0 && HS.leg > 0) legSmears(ctx, K, A, HS.leg);
    ctx.beginPath(); rrect(ctx, A[0] - .055, A[1] - .075, .11, .13, .03); fs(ctx, Hr.boot);
    ctx.beginPath(); ctx.moveTo(A[0] - .05, A[1] - .07); ctx.lineTo(A[0] + .05, A[1] - .07); st(ctx, OLW * 1.8, Hr.sole);
  });
  const Sh = [x, hipY + Hr.torso];
  // arms (behind coat edges)
  const arms = p.barms || { L: { sh: .1, el: 0 }, R: { sh: .1, el: 0 } };
  // hands held in front of him (umbrella, coffee): from behind only the upper arms show, angled forward
  if (p.hideHands) [-1, 1].forEach(s => { const J = [x + s * .19, hipY + Hr.torso - .03]; limb(ctx, [J, [x + s * .225, hipY + Hr.torso - .27]], .095, Hr.coatDk); });
  // coat
  const fl = p.coatFlare || 0;
  const hemY = hipY - .6 + fl * .08;
  const sw = walking ? Math.sin(TAU * ph) * .03 : 0;
  smooth(ctx, [[Sh[0] - .075, Sh[1] + .085], [Sh[0] - .21, Sh[1] + .02], [Sh[0] - .22, Sh[1] - .12], [x - .22 - fl * .1 + sw, hemY], [x + sw, hemY - .025], [x + .22 + fl * .1 + sw, hemY], [Sh[0] + .22, Sh[1] - .12], [Sh[0] + .21, Sh[1] + .02], [Sh[0] + .075, Sh[1] + .085]], true, .3);
  fs(ctx, Hr.coat);
  ctx.beginPath(); ctx.moveTo(x, Sh[1] - .1); ctx.lineTo(x + sw * .6, hemY + .01); st(ctx, OLW * .8, 'rgba(0,0,0,.45)');
  P(ctx, [[Sh[0] - .1, Sh[1] + .05], [Sh[0] - .075, Sh[1] + .16], [Sh[0] + .075, Sh[1] + .16], [Sh[0] + .1, Sh[1] + .05]]); fs(ctx, Hr.coatDk);
  // arms: L on screen left in back view (umbrella), R on screen right (coffee)
  const armFK = (a, s) => { const J = [Sh[0] + s * .19, Sh[1] - .03]; const El = add(J, [s * Math.sin(a.sh), -Math.cos(a.sh)], Hr.upper); const Wr = add(El, [s * Math.sin(a.sh + a.el), -Math.cos(a.sh + a.el)], Hr.fore); return { J, El, Wr }; };
  const AL = armFK(arms.L, -1), AR = armFK(arms.R, 1);
  out.handL = AL.Wr; out.handR = AR.Wr;
  if (!p.hideHands) [AL, AR].forEach(A => { limb(ctx, [A.J, A.El, A.Wr], .095, Hr.coat); ell(ctx, A.Wr[0], A.Wr[1] - .02, .032, .035); fs(ctx, Hr.skin); });
  else [-1, 1].forEach(s => { ctx.beginPath(); ctx.moveTo(Sh[0] + s * .2, Sh[1] - .02); ctx.quadraticCurveTo(Sh[0] + s * .235, Sh[1] - .15, Sh[0] + s * .215, Sh[1] - .28); st(ctx, OLW * .9, 'rgba(0,0,0,.5)'); });
  // neck + head (back)
  const hc = [x, Sh[1] + .23];
  limb(ctx, [[Sh[0], Sh[1] + .12], [Sh[0], Sh[1] + .16]], .05, Hr.skin);
  [-1, 1].forEach(s => { ell(ctx, hc[0] + s * .085, hc[1] + .005, .014, .024, s * .15); fs(ctx, Hr.skinDk); });
  ell(ctx, hc[0], hc[1], .09, .125); fs(ctx, Hr.hair);
  const hw = p.hairWind || 0;
  locks(ctx, [[-.08, .02], [-.152, .058], [-.105, .1], [-.142, .152], [-.07, .15], [-.058, .214], [-.02, .17], [.032, .222], [.05, .16], [.122, .172], [.1, .11], [.156, .072], [.098, .05], [.105, -.03], [.08, -.02], [.06, -.085], [.035, -.04], [.0, -.1], [-.025, -.045], [-.055, -.085], [-.075, -.03], [-.105, -.03]].map(q => [hc[0] + q[0] + hw * Math.max(0, q[1]) * .4, hc[1] + (q[1] < -.02 ? q[1] * 1.25 - .015 : q[1])]), .2); fs(ctx, Hr.hair);
  out.head = hc; out.Sh = Sh;
  return out;
}

// ---------- helpers ----------
// 2-bone IK in the "angle from straight down, + = forward" convention.
// target (fx forward, dy up) relative to the root joint. returns [a, b]: a = root angle, b = relative bend (+ = forward, like an elbow)
function ik2(fx, dy, l1, l2, knee = false) {
  let d = Math.hypot(fx, dy); d = clamp(d, Math.abs(l1 - l2) + 1e-4, l1 + l2 - 1e-4);
  const at = Math.atan2(fx, -dy);
  const al = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const be = Math.acos(clamp((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2), -1, 1));
  return knee ? [at + al, Math.PI - be] : [at - al, Math.PI - be];
}
// arm IK for the side-view hero: target world point for the hand, given shoulder world point & facing
function heroArmIK(Sh, target, f) {
  const J = add(Sh, [-.005 * f, -.035]);
  const fx = (target[0] - J[0]) * f, dy = target[1] - J[1];
  const [sh, el] = ik2(fx, dy, HERO.upper, HERO.fore + .03);
  return { sh, el, wr: 0 };
}
// arm IK for the front-view hero (s = -1 screen-left arm, +1 screen-right arm); target = wrist
function frontArmIK(Sh, target, s, elbowDown = true) {
  const J = [Sh[0] + s * .165, Sh[1] - .03];
  const r = ik2((target[0] - J[0]) * s, target[1] - J[1], HERO.upper, HERO.fore);
  // ik2 gives one of the two elbow solutions; mirror it about the shoulder-hand line if the elbow ends up high
  const fx = (target[0] - J[0]) * s, dy = target[1] - J[1], at = Math.atan2(fx, -dy);
  const alt = [2 * at - r[0], -r[1]];
  const elbowY = a => -Math.cos(a) * HERO.upper;
  const pick = elbowDown ? (elbowY(r[0]) <= elbowY(alt[0]) ? r : alt) : (elbowY(r[0]) >= elbowY(alt[0]) ? r : alt);
  return { sh: pick[0], el: pick[1] };
}
// legs by travelled distance (so feet never slide); spd 0..1 blends toward standing
function legsByDist(d, spd = 1, A = .34) {
  const ph = d / (2 * STRIDE(A));
  const w = walkLegs(ph, A), s = standLegs();
  const k = clamp(spd);
  return w.map((l, i) => ({ th: lerp(s[i].th, l.th, k), kn: lerp(s[i].kn, l.kn, k), fa: lerp(0, l.fa, k) }));
}
function armsByDist(d, spd = 1, A = .34) { const ph = d / (2 * STRIDE(A)); return walkArms(ph, clamp(spd)); }
// umbrella tip (side view: grip at hand centre)
const UL = .87;
// where the coffee goes so it never meets the umbrella hand: low in front when the umbrella hand is up, high in front when it is low
const CUP_LOW = { sh: .25, el: .6, wr: 0 }, CUP_HIGH = { sh: .45, el: 1.35, wr: 0 };
const blendArm = (a, b, k) => ({ sh: lerp(a.sh, b.sh, k), el: lerp(a.el, b.el, k), wr: 0 });
function umbTip(hand, ang, gu = 0) { return [hand[0] + (UL - gu) * Math.cos(ang), hand[1] + (UL - gu) * Math.sin(ang)]; }
// put the umbrella tip on a world point (side view). returns arm + angle; call after a measure pass
function aimTip(base, tip, f = 1, off = [.32, -.2]) {
  const anchor = add(base.Sh, [off[0] * f, off[1]]);
  const d = [tip[0] - anchor[0], tip[1] - anchor[1]], L = Math.hypot(d[0], d[1]) || 1;
  const hand = [tip[0] - d[0] / L * UL, tip[1] - d[1] / L * UL];
  return { arm: heroArmIK(base.Sh, hand, f), hand };
}
function dropping(ctx, x, y, rot = 0, sc = 1) {
  // a falling bird dropping: lumpy white blob with a grey-green core and a short tail (reads at phone size)
  local(ctx, x, y, 0, sc);
  const r = .042;
  smooth(ctx, [[-r, -.1 * r], [-.75 * r, .6 * r], [-.15 * r, .9 * r], [.2 * r, 1.7 * r], [.32 * r, .85 * r], [.9 * r, .45 * r], [r, -.3 * r], [.35 * r, -.9 * r], [-.5 * r, -.75 * r]], true, .6); fs(ctx, '#f2f0e8', OLW * .9);
  ell(ctx, .05 * r, -.05 * r, .42 * r, .34 * r, .5); ctx.fillStyle = 'rgba(96,104,70,.85)'; ctx.fill();
  ctx.fillStyle = '#fff'; circ(ctx, -.45 * r, .35 * r, .16 * r); ctx.fill();
  ctx.restore();
}

