// ===== supporting cast: one construction system for everybody =====
// spec: {h, kid, build, belly, skin, hair, style, top, topLen:'waist'|'hip'|'coat', bottom, skirt, shoes, hat, extras...}

// ---- faces (head-local, normalised: head height = 1, origin = head centre) ----
function faceSide(ctx, sp, ex) {
  const k = sp.kid, rx = k ? .47 : .41;
  const eyeX = k ? .22 : .2, eyeY = k ? -.02 : .05;
  // ear
  ell(ctx, -.06, -.02, .09, .13); fs(ctx, sp.skin);
  // head
  ctx.beginPath();
  if (k) { ell(ctx, 0, 0, rx, .5); }
  else {
    ctx.moveTo(-.05, .5); ctx.quadraticCurveTo(.38, .52, .4, .12); ctx.quadraticCurveTo(.42, -.25, .28, -.44);
    ctx.quadraticCurveTo(.1, -.56, -.12, -.44); ctx.quadraticCurveTo(-.42, -.28, -.4, .08); ctx.quadraticCurveTo(-.38, .48, -.05, .5); ctx.closePath();
  }
  fs(ctx, sp.skin);
  ctx.beginPath(); ctx.arc(-.06, -.02, .05, -1.3, 1.5); st(ctx, OLW * .6);
  // nose
  const nz = sp.nose || (k ? 'button' : 'round');
  if (nz === 'button') { circ(ctx, rx + .02, -.08, .07); fs(ctx, sp.skin); }
  else if (nz === 'long') { P(ctx, [[.36, .08], [.56, -.1], [.38, -.13]]); fs(ctx, sp.skin); }
  else { ell(ctx, .43, -.06, .1, .09); fs(ctx, sp.skin); }
  // cheek
  if (k || sp.blush) { ctx.fillStyle = 'rgba(225,110,100,.25)'; ell(ctx, .2, -.2, .09, .06); ctx.fill(); }
  // eye
  const e = ex.eyes || 'open';
  ctx.fillStyle = INK;
  if (e === 'open' || e === 'wide') {
    const r = (k ? .075 : .058) * (e === 'wide' ? 1.25 : 1);
    if (e === 'wide') { ell(ctx, eyeX, eyeY, r * 1.5, r * 1.6); fs(ctx, '#fbf8f2', OLW * .7); }
    ell(ctx, eyeX + .01 + (ex.lookX || 0) * .03, eyeY + (ex.lookY || 0) * .03, r * .8, r); ctx.fillStyle = INK; ctx.fill();
    if (k) { ctx.fillStyle = '#fff'; circ(ctx, eyeX + .03, eyeY + .03, r * .3); ctx.fill(); }
  } else if (e === 'happy') { ctx.beginPath(); ctx.moveTo(eyeX - .07, eyeY - .02); ctx.quadraticCurveTo(eyeX, eyeY + .08, eyeX + .07, eyeY - .02); st(ctx, OLW * 1.3); }
  else if (e === 'closed' || e === 'cry') { ctx.beginPath(); ctx.moveTo(eyeX - .07, eyeY + .02); ctx.quadraticCurveTo(eyeX, eyeY - .06, eyeX + .07, eyeY + .02); st(ctx, OLW * 1.3); }
  else if (e === 'sad') { ell(ctx, eyeX + .01, eyeY - .01, .045, .06); ctx.fill(); }
  if (e === 'cry') { ctx.fillStyle = 'rgba(150,200,240,.9)'; ell(ctx, eyeX + .03, eyeY - .16, .035, .06); ctx.fill(); }
  // brow
  const b = ex.brow || 0;
  if (!sp.noBrow) { ctx.beginPath(); ctx.moveTo(eyeX - .08, eyeY + .15 + b * .04 - (ex.sadBrow ? .03 : 0)); ctx.lineTo(eyeX + .08, eyeY + .16 + b * .05 + (ex.sadBrow ? .03 : 0)); st(ctx, OLW * (k ? 1.1 : 1.5), sp.browC || sp.hair); }
  // mouth
  const m = ex.mouth || 'flat', mx = k ? .3 : .3, my = k ? -.25 : -.27;
  if (m === 'smile') { ctx.beginPath(); ctx.moveTo(mx - .1, my + .02); ctx.quadraticCurveTo(mx, my - .06, mx + .08, my + .04); st(ctx, OLW); }
  else if (m === 'grin') { ctx.beginPath(); ctx.moveTo(mx - .12, my + .03); ctx.quadraticCurveTo(mx, my - .14, mx + .1, my + .05); ctx.closePath(); fs(ctx, '#7a2e2a', OLW * .9); }
  else if (m === 'o') { ell(ctx, mx + .03, my, .05, .07); fs(ctx, '#6d2a27', OLW * .8); }
  else if (m === 'cry') { ctx.beginPath(); ctx.moveTo(mx - .12, my + .02); ctx.quadraticCurveTo(mx, my + .1, mx + .1, my); ctx.quadraticCurveTo(mx + .02, my - .14, mx - .12, my + .02); fs(ctx, '#6d2a27', OLW * .9); }
  else if (m === 'frown') { ctx.beginPath(); ctx.moveTo(mx - .08, my - .02); ctx.quadraticCurveTo(mx, my + .04, mx + .08, my - .03); st(ctx, OLW); }
  else if (m === 'chew') { ctx.beginPath(); ctx.moveTo(mx - .06, my); ctx.lineTo(mx + .08, my + .01); st(ctx, OLW); }
  else { ctx.beginPath(); ctx.moveTo(mx - .07, my); ctx.lineTo(mx + .07, my + .005); st(ctx, OLW * .9); }
  // moustache / glasses
  if (sp.moustache) { ctx.beginPath(); ctx.moveTo(.2, -.18); ctx.quadraticCurveTo(.38, -.1, .48, -.2); ctx.quadraticCurveTo(.4, -.26, .3, -.2); ctx.quadraticCurveTo(.25, -.24, .2, -.18); fs(ctx, sp.moustache, OLW * .7); }
  if (sp.glasses) { ctx.beginPath(); ctx.arc(eyeX + .02, eyeY, .1, 0, TAU); st(ctx, OLW * .9); ctx.beginPath(); ctx.moveTo(eyeX - .08, eyeY + .02); ctx.lineTo(-.05, .05); st(ctx, OLW * .8); }
}

function faceFront(ctx, sp, ex) {
  const k = sp.kid, rx = k ? .46 : .4;
  [-1, 1].forEach(s => { ell(ctx, s * rx, -.03, .08, .12); fs(ctx, sp.skin); });
  ctx.beginPath();
  if (k || sp.round) ell(ctx, 0, 0, rx, .5);
  else { ctx.moveTo(0, .5); ctx.bezierCurveTo(.4, .5, .42, .1, .4, -.08); ctx.bezierCurveTo(.36, -.4, .18, -.52, 0, -.52); ctx.bezierCurveTo(-.18, -.52, -.36, -.4, -.4, -.08); ctx.bezierCurveTo(-.42, .1, -.4, .5, 0, .5); ctx.closePath(); }
  fs(ctx, sp.skin);
  if (k || sp.blush) { ctx.fillStyle = 'rgba(225,110,100,.25)'; ell(ctx, -.25, -.18, .09, .06); ctx.fill(); ell(ctx, .25, -.18, .09, .06); ctx.fill(); }
  const e = ex.eyes || 'open', ey = k ? -.02 : .04, exs = k ? .17 : .16;
  [-1, 1].forEach(s => {
    const x = s * exs; ctx.fillStyle = INK;
    if (e === 'open' || e === 'wide') { const r = (k ? .07 : .055) * (e === 'wide' ? 1.25 : 1); if (e === 'wide') { ell(ctx, x, ey, r * 1.5, r * 1.6); fs(ctx, '#fbf8f2', OLW * .7); } ell(ctx, x + (ex.lookX || 0) * .03, ey + (ex.lookY || 0) * .03, r * .8, r); ctx.fillStyle = INK; ctx.fill(); if (k) { ctx.fillStyle = '#fff'; circ(ctx, x + .02, ey + .03, r * .3); ctx.fill(); } }
    else if (e === 'happy') { ctx.beginPath(); ctx.moveTo(x - .07, ey - .02); ctx.quadraticCurveTo(x, ey + .08, x + .07, ey - .02); st(ctx, OLW * 1.3); }
    else { ctx.beginPath(); ctx.moveTo(x - .07, ey + .02); ctx.quadraticCurveTo(x, ey - .06, x + .07, ey + .02); st(ctx, OLW * 1.3); }
    if (e === 'cry') { ctx.fillStyle = 'rgba(150,200,240,.9)'; ell(ctx, x + s * .04, ey - .16, .035, .06); ctx.fill(); }
    if (!sp.noBrow) { const b = ex.brow || 0; ctx.beginPath(); ctx.moveTo(x - s * .07, ey + .14 + b * .04 + (ex.sadBrow ? .04 : 0)); ctx.lineTo(x + s * .08, ey + .15 + b * .04 - (ex.sadBrow ? .02 : 0)); st(ctx, OLW * (k ? 1.1 : 1.5), sp.browC || sp.hair); }
    if (sp.glasses) { circ(ctx, x, ey, .1); st(ctx, OLW * .9); }
  });
  if (sp.glasses) { ctx.beginPath(); ctx.moveTo(-exs + .1, ey); ctx.lineTo(exs - .1, ey); st(ctx, OLW * .8); }
  // nose
  ctx.beginPath(); if (k) { ctx.arc(0, -.1, .05, Math.PI * .1, Math.PI * .9); } else { ctx.moveTo(.0, .0); ctx.quadraticCurveTo(-.06, -.12, .02, -.14); } st(ctx, OLW * .8);
  if (sp.moustache) { ctx.beginPath(); ctx.moveTo(0, -.2); ctx.quadraticCurveTo(-.14, -.14, -.22, -.26); ctx.quadraticCurveTo(-.1, -.24, 0, -.24); ctx.quadraticCurveTo(.1, -.24, .22, -.26); ctx.quadraticCurveTo(.14, -.14, 0, -.2); fs(ctx, sp.moustache, OLW * .7); }
  const m = ex.mouth || 'flat', my = k ? -.26 : -.3;
  if (m === 'smile') { ctx.beginPath(); ctx.moveTo(-.1, my + .03); ctx.quadraticCurveTo(0, my - .07, .1, my + .03); st(ctx, OLW); }
  else if (m === 'grin' || m === 'laugh') { ctx.beginPath(); ctx.moveTo(-.12, my + .03); ctx.quadraticCurveTo(0, my - .16, .12, my + .03); ctx.closePath(); fs(ctx, '#7a2e2a', OLW * .9); }
  else if (m === 'o') { ell(ctx, 0, my, .055, .075); fs(ctx, '#6d2a27', OLW * .8); }
  else if (m === 'cry') { ctx.beginPath(); ctx.moveTo(-.12, my - .03); ctx.quadraticCurveTo(0, my + .1, .12, my - .03); ctx.quadraticCurveTo(0, my - .12, -.12, my - .03); fs(ctx, '#6d2a27', OLW * .9); }
  else if (m === 'frown') { ctx.beginPath(); ctx.moveTo(-.08, my - .02); ctx.quadraticCurveTo(0, my + .04, .08, my - .02); st(ctx, OLW); }
  else { ctx.beginPath(); ctx.moveTo(-.07, my); ctx.lineTo(.07, my); st(ctx, OLW * .9); }
}

// ---- hair & hats (head-local normalised) ----
function hairSide(ctx, sp, front) {
  const c = sp.hair, st_ = sp.style;
  if (st_ === 'short') { locks(ctx, [[.25, .3], [.36, .22], [.3, .42], [.1, .56], [-.2, .52], [-.44, .3], [-.42, -.05], [-.35, .1], [-.24, .02], [-.2, .28], [.05, .38]], .12); fs(ctx, c); }
  else if (st_ === 'curly') { const pts = [[.3, .32], [.1, .52], [-.18, .52], [-.4, .36], [-.48, .08], [-.4, -.12], [-.2, .1], [0, .3]]; ctx.beginPath(); pts.forEach(([x, y], i) => { circ(ctx, x, y, .15); }); ctx.fillStyle = c; pts.forEach(([x, y]) => { circ(ctx, x, y, .16); fs(ctx, c, OLW * .8); }); ctx.fillStyle = c; ell(ctx, -.08, .3, .34, .22); ctx.fill(); }
  else if (st_ === 'bun') { circ(ctx, -.38, .38, .17); fs(ctx, c); ctx.beginPath(); ctx.moveTo(.32, .3); ctx.quadraticCurveTo(.2, .55, -.1, .52); ctx.quadraticCurveTo(-.42, .45, -.42, .05); ctx.quadraticCurveTo(-.3, .02, -.2, .12); ctx.quadraticCurveTo(-.1, .3, .32, .3); fs(ctx, c); }
  else if (st_ === 'puffs') { circ(ctx, -.3, .5, .2); fs(ctx, c); ctx.beginPath(); ctx.moveTo(.35, .25); ctx.quadraticCurveTo(.2, .52, -.1, .5); ctx.quadraticCurveTo(-.46, .4, -.45, .0); ctx.quadraticCurveTo(-.3, .0, -.25, .15); ctx.quadraticCurveTo(0, .32, .35, .25); fs(ctx, c); }
  else if (st_ === 'ponytail') { ctx.beginPath(); ctx.moveTo(-.38, .25); ctx.quadraticCurveTo(-.75, .1, -.62, -.35); ctx.quadraticCurveTo(-.55, -.05, -.35, .05); fs(ctx, c); ctx.beginPath(); ctx.moveTo(.36, .22); ctx.quadraticCurveTo(.25, .55, -.1, .52); ctx.quadraticCurveTo(-.46, .42, -.44, .02); ctx.quadraticCurveTo(-.3, .0, -.22, .14); ctx.quadraticCurveTo(0, .3, .36, .22); fs(ctx, c); }
  else if (st_ === 'fringe') { ctx.beginPath(); ctx.moveTo(-.1, .2); ctx.quadraticCurveTo(-.45, .25, -.42, -.12); ctx.quadraticCurveTo(-.3, -.1, -.22, .02); ctx.quadraticCurveTo(-.2, .15, -.1, .2); fs(ctx, c); }
  else if (st_ === 'side') { ctx.beginPath(); ctx.moveTo(.36, .26); ctx.quadraticCurveTo(.3, .55, -.05, .54); ctx.quadraticCurveTo(-.45, .48, -.44, .0); ctx.quadraticCurveTo(-.3, -.02, -.24, .12); ctx.quadraticCurveTo(-.05, .36, .36, .26); fs(ctx, c); }
  // hats
  const hat = sp.hat;
  if (!hat) return;
  if (hat.type === 'tophat') { /* drawn separately (it flies) */ }
  else if (hat.type === 'cap') { ctx.beginPath(); ctx.moveTo(.5, .2); ctx.quadraticCurveTo(.35, .3, .1, .52); ctx.quadraticCurveTo(-.35, .55, -.44, .2); ctx.lineTo(.5, .2); fs(ctx, hat.color); }
  else if (hat.type === 'postcap') { rrect(ctx, -.42, .28, .82, .3, .06); fs(ctx, hat.color); P(ctx, [[.3, .3], [.62, .22], [.58, .18], [.28, .24]]); fs(ctx, '#1a1c20'); rrect(ctx, -.42, .28, .82, .06, .02); fs(ctx, shade(hat.color, -.3)); circ(ctx, .15, .45, .05); fs(ctx, '#d8c070', OLW * .6); }
  else if (hat.type === 'hardhat') { ctx.beginPath(); ctx.moveTo(-.48, .26); ctx.quadraticCurveTo(-.45, .7, .05, .7); ctx.quadraticCurveTo(.46, .7, .48, .26); ctx.closePath(); fs(ctx, hat.color); P(ctx, [[-.52, .28], [.62, .28], [.6, .2], [-.5, .2]]); fs(ctx, shade(hat.color, -.1)); }
  else if (hat.type === 'hood') { ctx.beginPath(); ctx.moveTo(.42, .3); ctx.quadraticCurveTo(.3, .7, -.12, .66); ctx.quadraticCurveTo(-.62, .55, -.58, -.1); ctx.quadraticCurveTo(-.55, -.55, -.2, -.6); ctx.lineTo(-.1, -.4); ctx.quadraticCurveTo(-.35, -.3, -.38, .0); ctx.quadraticCurveTo(-.3, .38, .0, .42); ctx.quadraticCurveTo(.25, .44, .42, .3); fs(ctx, hat.color); }
  else if (hat.type === 'trilby') { P(ctx, [[-.55, .3], [.62, .3], [.6, .24], [-.52, .24]]); fs(ctx, hat.color); ctx.beginPath(); ctx.moveTo(-.38, .3); ctx.quadraticCurveTo(-.38, .7, .0, .68); ctx.quadraticCurveTo(.38, .7, .38, .3); fs(ctx, hat.color); rrect(ctx, -.38, .3, .76, .08, .02); fs(ctx, '#2a2a2a', OLW * .6); }
  else if (hat.type === 'beanie') { ctx.beginPath(); ctx.moveTo(-.46, .22); ctx.quadraticCurveTo(-.45, .72, .02, .72); ctx.quadraticCurveTo(.45, .72, .44, .22); ctx.closePath(); fs(ctx, hat.color); rrect(ctx, -.47, .18, .92, .14, .04); fs(ctx, shade(hat.color, -.15)); }
}
function hairFront(ctx, sp) {
  const c = sp.hair, st_ = sp.style;
  if (st_ === 'short' || st_ === 'side') { ctx.beginPath(); ctx.moveTo(-.44, .05); ctx.quadraticCurveTo(-.48, .55, 0, .56); ctx.quadraticCurveTo(.48, .55, .44, .05); ctx.quadraticCurveTo(.35, .3, .1, .32); ctx.quadraticCurveTo(-.1, .4, -.3, .26); ctx.quadraticCurveTo(-.4, .2, -.44, .05); fs(ctx, c); }
  else if (st_ === 'curly') { [[-.4, .2], [-.3, .42], [-.08, .52], [.15, .5], [.36, .38], [.44, .15]].forEach(([x, y]) => { circ(ctx, x, y, .17); fs(ctx, c, OLW * .8); }); ctx.fillStyle = c; ell(ctx, 0, .32, .36, .18); ctx.fill(); }
  else if (st_ === 'bun') { circ(ctx, 0, .56, .16); fs(ctx, c); ctx.beginPath(); ctx.moveTo(-.44, .0); ctx.quadraticCurveTo(-.48, .52, 0, .5); ctx.quadraticCurveTo(.48, .52, .44, .0); ctx.quadraticCurveTo(.34, .3, 0, .32); ctx.quadraticCurveTo(-.34, .3, -.44, .0); fs(ctx, c); }
  else if (st_ === 'puffs') { circ(ctx, -.42, .45, .2); fs(ctx, c); circ(ctx, .42, .45, .2); fs(ctx, c); ctx.beginPath(); ctx.moveTo(-.46, .05); ctx.quadraticCurveTo(-.48, .52, 0, .52); ctx.quadraticCurveTo(.48, .52, .46, .05); ctx.quadraticCurveTo(.3, .32, 0, .3); ctx.quadraticCurveTo(-.3, .32, -.46, .05); fs(ctx, c); }
  else if (st_ === 'ponytail') { ctx.beginPath(); ctx.moveTo(-.46, .0); ctx.quadraticCurveTo(-.48, .54, 0, .54); ctx.quadraticCurveTo(.48, .54, .46, .0); ctx.quadraticCurveTo(.4, .28, .05, .3); ctx.quadraticCurveTo(-.2, .22, -.46, .0); fs(ctx, c); }
  else if (st_ === 'fringe') { [-1, 1].forEach(s => { ctx.beginPath(); ctx.moveTo(s * .38, .25); ctx.quadraticCurveTo(s * .5, .1, s * .44, -.12); ctx.quadraticCurveTo(s * .38, -.05, s * .36, .08); fs(ctx, c); }); }
  const hat = sp.hat; if (!hat) return;
  if (hat.type === 'trilby') { P(ctx, [[-.62, .3], [.62, .3], [.58, .24], [-.58, .24]]); fs(ctx, hat.color); ctx.beginPath(); ctx.moveTo(-.4, .3); ctx.quadraticCurveTo(-.4, .72, 0, .7); ctx.quadraticCurveTo(.4, .72, .4, .3); fs(ctx, hat.color); rrect(ctx, -.4, .3, .8, .08, .02); fs(ctx, '#2a2a2a', OLW * .6); }
  else if (hat.type === 'hood') { ctx.beginPath(); ctx.moveTo(-.4, -.3); ctx.quadraticCurveTo(-.66, .1, -.5, .45); ctx.quadraticCurveTo(-.3, .78, 0, .78); ctx.quadraticCurveTo(.3, .78, .5, .45); ctx.quadraticCurveTo(.66, .1, .4, -.3); ctx.quadraticCurveTo(.46, .2, .3, .4); ctx.quadraticCurveTo(0, .55, -.3, .4); ctx.quadraticCurveTo(-.46, .2, -.4, -.3); fs(ctx, hat.color); }
  else if (hat.type === 'beanie') { ctx.beginPath(); ctx.moveTo(-.46, .22); ctx.quadraticCurveTo(-.45, .74, 0, .74); ctx.quadraticCurveTo(.45, .74, .46, .22); ctx.closePath(); fs(ctx, hat.color); rrect(ctx, -.48, .16, .96, .14, .04); fs(ctx, shade(hat.color, -.15)); }
  else if (hat.type === 'cap') { ctx.beginPath(); ctx.moveTo(-.46, .24); ctx.quadraticCurveTo(-.4, .62, 0, .6); ctx.quadraticCurveTo(.42, .62, .48, .24); ctx.closePath(); fs(ctx, hat.color); }
}

// ---- body: side ----
function dims(sp) {
  const h = sp.h, k = sp.kid;
  return {
    leg: (k ? .4 : .47) * h, torso: (k ? .27 : .3) * h, head: (k ? .23 : .135) * h, neck: (k ? .01 : .03) * h,
    up: (k ? .16 : .17) * h, fo: (k ? .15 : .16) * h, bw: (sp.build || 1) * (k ? .115 : .11) * h, limbW: (k ? .055 : .05) * h * (sp.limb || 1), shoe: (k ? .15 : .14) * h,
  };
}
function personSide(ctx, sp, p) {
  const D = dims(sp), f = p.f == null ? 1 : p.f;
  const legs = p.legs || standLegs(.05, .03);
  const th = D.leg / 2;
  const fk = l => {
    const K = add([0, 0], dn(l.th, f), th), A = add(K, dn(l.th - l.kn, f), th);
    const fa = l.fa || 0, c = Math.cos(fa), s = Math.sin(fa), L = D.shoe, hh = D.shoe * .35;
    const T = (x, y) => [A[0] + f * (x * c - y * s), A[1] + (x * s + y * c)];
    const shoe = [T(-.25 * L, hh * .5), T(.2 * L, hh * .6), T(.75 * L, -hh * .1), T(.78 * L, -hh * .7), T(-.3 * L, -hh * .7), T(-.32 * L, -hh * .1)];
    return { K, A, shoe, low: Math.min(...shoe.map(q => q[1]), (K[1] - D.limbW * .5)) };
  };
  let L = legs.map(fk);
  const hy = p.hipY != null ? p.hipY : (p.y || 0) - Math.min(L[0].low, L[1].low);
  const Hp = [p.x || 0, hy];
  L = L.map(l => ({ K: add(l.K, Hp), A: add(l.A, Hp), shoe: l.shoe.map(q => add(q, Hp)) }));
  const lean = p.lean || 0;
  const Sh = add(Hp, upv(lean, f), D.torso);
  const out = { Hp, Sh, f };
  if (p.measure) { const a0 = p.arms || { near: { sh: .05, el: .1 }, far: { sh: -.05, el: .1 } }; const fk2 = a => { const J = add(Sh, [0, -D.limbW * .5]); const El = add(J, dn(a.sh, f), D.up); return add(El, dn(a.sh + a.el, f), D.fo); }; out.handN = fk2(a0.near); out.handF = fk2(a0.far); out.head = add(Sh, [(D.bw * .1 + (p.headFwd || 0)) * f, D.neck + D.head * .45]); out.L = L; return out; }
  const arms = p.arms || { near: { sh: .05, el: .1 }, far: { sh: -.05, el: .1 } };
  const armFK = a => { const J = add(Sh, [0, -D.limbW * .5]); const El = add(J, dn(a.sh, f), D.up); const Wr = add(El, dn(a.sh + a.el, f), D.fo); return { J, El, Wr }; };
  const AN = armFK(arms.near), AF = armFK(arms.far);
  out.handN = AN.Wr; out.handF = AF.Wr;
  const sleeve = sp.sleeve || sp.top, trou = sp.bottom;
  const drawArm = (A, far, key) => {
    limb(ctx, [A.J, A.El, A.Wr], D.limbW * (sp.armW || 1), far ? shade(sleeve, -.12) : sleeve);
    if (sp.shortSleeve) { limb(ctx, [mix(A.J, A.El, .6), A.El, A.Wr], D.limbW * .8, far ? shade(sp.skin, -.08) : sp.skin); }
    circ(ctx, A.Wr[0], A.Wr[1], D.limbW * .55); fs(ctx, far ? shade(sp.skin, -.08) : sp.skin);
    if (p.hold && p.hold[key]) p.hold[key](ctx, A.Wr, out);
  };
  const drawLeg = (l, far) => {
    if (!sp.skirt || true) limb(ctx, [Hp, l.K, l.A], D.limbW * 1.1, far ? shade(sp.legC || trou, -.12) : (sp.legC || trou));
    smooth(ctx, l.shoe, true, .3); fs(ctx, far ? shade(sp.shoes, -.15) : sp.shoes);
  };
  if (p.pre) p.pre(ctx, out);
  if (p.shadow !== false) { const gy = p.y || 0; shadow(ctx, Hp[0], gy + .005, .17 * sp.h, .18); }
  drawArm(AF, true, 'far');
  drawLeg(L[1], true); drawLeg(L[0], false);
  // torso
  const bw = D.bw, bel = (sp.belly || 0) * D.bw;
  const low = sp.topLen === 'coat' ? D.leg * .45 : sp.topLen === 'hip' ? D.leg * .12 : 0;
  const tp = [add(Sh, [-bw * .5 * f, 0]), add(Sh, [bw * .45 * f, 0]), add(mix(Sh, Hp, .55), [(bw * .55 + bel) * f, 0]), add(Hp, [(bw * .55 + bel * .7) * f, -low]), add(Hp, [-bw * .55 * f, -low]), add(mix(Sh, Hp, .5), [-bw * .55 * f, 0])];
  if (sp.skirt) { tp[3] = add(Hp, [bw * .75 * f, -D.leg * .45]); tp[4] = add(Hp, [-bw * .75 * f, -D.leg * .45]); }
  smooth(ctx, tp, true, .25); fs(ctx, sp.top);
  if (sp.hiviz) { ctx.save(); smooth(ctx, tp, true, .25); ctx.clip(); ctx.fillStyle = '#f07a1e'; ctx.fillRect(Hp[0] - 1, Hp[1] - .05, 2, D.torso * .95); ctx.fillStyle = '#e8eef0'; ctx.fillRect(Hp[0] - 1, Hp[1] + D.torso * .25, 2, .025); ctx.fillRect(Hp[0] - 1, Hp[1] + D.torso * .5, 2, .025); ctx.restore(); smooth(ctx, tp, true, .25); st(ctx); }
  if (sp.vest) { const v = [add(Sh, [-bw * .3 * f, -.02]), add(Sh, [bw * .3 * f, -.02]), add(mix(Sh, Hp, .55), [(bw * .55 + bel) * f, 0]), add(Hp, [(bw * .55 + bel * .7) * f, .02]), add(Hp, [-bw * .5 * f, .02])]; smooth(ctx, v, true, .2); fs(ctx, sp.vest); }
  if (sp.apron) { const a = [add(Sh, [(bw * .42) * f, -.06]), add(mix(Sh, Hp, .5), [(bw * .56 + bel) * f, 0]), add(Hp, [(bw * .6 + bel * .75) * f, -.05]), add(Hp, [(bw * .5 + bel * .5) * f, -D.leg * .48]), add(Hp, [(bw * .02) * f, -D.leg * .5]), add(Hp, [(-bw * .1) * f, 0]), add(mix(Sh, Hp, .3), [(-bw * .0) * f, 0])]; smooth(ctx, a, true, .2); fs(ctx, sp.apron); ctx.save(); smooth(ctx, a, true, .2); ctx.clip(); ctx.fillStyle = sp.apronStripe || '#f4f1ea'; for (let k = -6; k < 6; k++) { ctx.fillRect(Hp[0] + k * .045, Hp[1] - 1, .014, 2); } ctx.restore(); smooth(ctx, a, true, .2); st(ctx); }
  if (sp.tie) { const t0 = add(Sh, [bw * .42 * f, -.01]); P(ctx, [t0, add(t0, [.012 * f, -D.torso * .45]), add(t0, [-.012 * f, -D.torso * .42])]); fs(ctx, sp.tie, OLW * .6); }
  if (p.mid) p.mid(ctx, out);
  // neck + head
  const hc = add(Sh, [(D.bw * .1 + (p.headFwd || 0)) * f, D.neck + D.head * .45]);
  limb(ctx, [add(Sh, [0, -.01]), add(hc, [0, -D.head * .3])], D.limbW * .9, sp.skin);
  out.head = hc;
  const hf = p.headF || f;
  sub(ctx, hc[0], hc[1], (p.nod || 0) * -hf, hf * D.head, D.head, () => {
    if (sp.hat && sp.hat.type === 'hood') hairSide(ctx, { hat: { type: 'none' }, style: 'none' });
    faceSide(ctx, sp, p.ex || {});
    hairSide(ctx, sp);
  });
  if (p.post) p.post(ctx, out);
  drawArm(AN, false, 'near');
  return out;
}

// ---- body: front ----
function personFront(ctx, sp, p) {
  const D = dims(sp), x = p.x || 0, y = p.y || 0;
  const hipY = y + (p.hipH != null ? p.hipH : D.leg + D.shoe * .1);
  const sw = p.sway || 0;
  const Hp = [x + sw, hipY], Sh = [x + sw * 1.3, hipY + D.torso];
  const out = { Hp, Sh };
  if (p.measure) { out.head = [Sh[0] + (p.headX || 0), Sh[1] + D.neck + D.head * .45]; return out; }
  const lw = D.limbW * 1.1, hx = D.bw * .32;
  if (p.shadow !== false) shadow(ctx, x, y + .005, .18 * sp.h, .18);
  // legs
  const lg = p.flegs || [0, 0];
  [-1, 1].forEach((s, i) => {
    const H0 = [Hp[0] + s * hx, hipY], A = [x + s * (hx + lg[i]), y + D.shoe * .28];
    limb(ctx, [H0, A], lw, sp.legC || sp.bottom);
    ctx.beginPath(); ell(ctx, A[0] + s * .005, A[1] - D.shoe * .08, D.shoe * .38, D.shoe * .24); fs(ctx, sp.shoes);
  });
  // arms
  const arms = p.farms || { l: { sh: .12, el: .05 }, r: { sh: .12, el: .05 } }; // l = screen left
  const armFK = (a, s) => { const J = [Sh[0] + s * D.bw * .55, Sh[1] - D.limbW * .5]; const El = add(J, [s * Math.sin(a.sh), -Math.cos(a.sh)], D.up); const Wr = add(El, [s * Math.sin(a.sh + a.el), -Math.cos(a.sh + a.el)], D.fo); return { J, El, Wr }; };
  const AL = armFK(arms.l, -1), AR = armFK(arms.r, 1);
  out.handL = AL.Wr; out.handR = AR.Wr;
  const drawArm = (A, key) => { limb(ctx, [A.J, A.El, A.Wr], D.limbW * (sp.armW || 1), sp.sleeve || sp.top); if (sp.shortSleeve) limb(ctx, [mix(A.J, A.El, .6), A.El, A.Wr], D.limbW * .8, sp.skin); circ(ctx, A.Wr[0], A.Wr[1], D.limbW * .55); fs(ctx, sp.skin); if (p.hold && p.hold[key]) p.hold[key](ctx, A.Wr, out); };
  if (p.armsBehind) { drawArm(AL, 'l'); drawArm(AR, 'r'); }
  // torso
  const bw = D.bw * (sp.frontW || 1.05), bel = (sp.belly || 0) * D.bw;
  const low = sp.topLen === 'coat' ? D.leg * .45 : sp.topLen === 'hip' ? D.leg * .12 : 0;
  let tp = [[Sh[0] - bw * .55, Sh[1]], [Sh[0] + bw * .55, Sh[1]], [Hp[0] + bw * .58 + bel, lerp(Sh[1], Hp[1], .5)], [Hp[0] + bw * .6 + bel * .6, Hp[1] - low], [Hp[0] - bw * .6 - bel * .6, Hp[1] - low], [Hp[0] - bw * .58 - bel, lerp(Sh[1], Hp[1], .5)]];
  if (sp.skirt) { tp[3] = [Hp[0] + bw * .78, Hp[1] - D.leg * .45]; tp[4] = [Hp[0] - bw * .78, Hp[1] - D.leg * .45]; }
  smooth(ctx, tp, true, .25); fs(ctx, sp.top);
  if (sp.coatOpen) { P(ctx, [[Sh[0] - bw * .12, Sh[1]], [Sh[0] + bw * .12, Sh[1]], [Sh[0] + bw * .05, Hp[1] - low * .2], [Sh[0] - bw * .05, Hp[1] - low * .2]]); fs(ctx, sp.coatOpen); }
  if (sp.buttons) { for (let i = 0; i < 3; i++) { circ(ctx, Sh[0] + bw * .08, lerp(Sh[1], Hp[1] - low, .2 + i * .22), D.limbW * .12); ctx.fillStyle = sp.buttons; ctx.fill(); } }
  if (sp.tie) { P(ctx, [[Sh[0], Sh[1] - .005], [Sh[0] + .014, Sh[1] - D.torso * .45], [Sh[0], Sh[1] - D.torso * .5], [Sh[0] - .014, Sh[1] - D.torso * .45]]); fs(ctx, sp.tie, OLW * .6); }
  if (p.mid) p.mid(ctx, out);
  if (!p.armsBehind) { drawArm(AL, 'l'); drawArm(AR, 'r'); }
  const hc = [Sh[0] + (p.headX || 0), Sh[1] + D.neck + D.head * .45];
  limb(ctx, [[Sh[0], Sh[1] - .01], [hc[0], hc[1] - D.head * .3]], D.limbW * .9, sp.skin);
  out.head = hc;
  sub(ctx, hc[0], hc[1], p.tilt || 0, D.head, D.head, () => {
    if (sp.hat && sp.hat.type === 'hood') { ctx.beginPath(); ctx.moveTo(-.5, -.5); ctx.quadraticCurveTo(-.7, .2, -.45, .55); ctx.quadraticCurveTo(0, .85, .45, .55); ctx.quadraticCurveTo(.7, .2, .5, -.5); ctx.closePath(); fs(ctx, shade(sp.hat.color, -.25)); }
    faceFront(ctx, sp, p.ex || {});
    hairFront(ctx, sp);
  });
  if (p.post) p.post(ctx, out);
  return out;
}

// a greasy sheen (sausage fat) on a hand or similar
function greaseSheen(ctx, w, r, a = 1) {
  if (a <= 0) return;
  ell(ctx, w[0], w[1], r, r * .75, .3); ctx.fillStyle = `rgba(214,120,62,${.45 * a})`; ctx.fill();
  ell(ctx, w[0] - r * .25, w[1] + r * .3, r * .38, r * .14, .3); ctx.fillStyle = `rgba(255,244,222,${.9 * a})`; ctx.fill();
  circ(ctx, w[0] + r * .35, w[1] - r * .25, r * .1); ctx.fill();
}
function smellLines(ctx, p, t, a = 1, col = 'rgba(150,95,55,.75)', w = 2) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = px(w); ctx.lineCap = 'round';
  for (let k = -1; k <= 1; k++) { const x0 = p[0] + k * .03, ph = t * 7 + k * 1.7; ctx.beginPath(); for (let i = 0; i <= 8; i++) { const u = i / 8, y = p[1] + u * .16 + (k === 0 ? .02 : 0); const x = x0 + Math.sin(ph + u * 6) * .012; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
  ctx.restore();
}
// an open hand, palm up / towards something (drawn over the plain round hand)
function palm(ctx, w, ang, sp, sc = 1, f = 1) {
  const r = dims(sp).limbW * .62 * sc;
  local(ctx, w[0], w[1], ang); if (f < 0) ctx.scale(-1, 1);
  smooth(ctx, [[-r * .6, -r * .6], [r * .9, -r * .55], [r * 1.9, -r * .35], [r * 2.0, r * .1], [r * 1.2, r * .45], [r * .5, r * .9], [r * .1, r * 1.1], [-r * .2, r * .6], [-r * .7, r * .5]], true, .5); fs(ctx, sp.skin, OLW * .8);
  ctx.beginPath(); [.25, .75, 1.25].forEach(k => { ctx.moveTo(r * (1.0 + k * .2), -r * .5 + k * .3 * r); ctx.lineTo(r * (1.7 + k * .1), -r * .3 + k * .28 * r); }); st(ctx, OLW * .5, 'rgba(90,50,40,.5)');
  ctx.restore();
}
// ===== animals =====
function pigeon(ctx, x, y, f, o = {}) {
  // o.flap: 0..1 wing phase (null = folded), o.peck 0..1, o.walk phase, sc
  const sc = o.sc || 1;
  sub(ctx, x, y, o.rot || 0, f * sc, sc, () => {
    const fl = o.flap;
    const leg = o.walk != null ? Math.sin(TAU * o.walk) * .02 : 0;
    if (fl == null) { seg2(ctx, [-.01 + leg, .06], [-.01 + leg, 0], OLW * 1.6, '#c96b73'); seg2(ctx, [.02 - leg, .06], [.02 - leg, 0], OLW * 1.6, '#c96b73'); }
    // far wing (flapping)
    if (fl != null) { const a = Math.sin(TAU * fl); P(ctx, [[.0, .16], [-.1, .16 + a * .22], [-.22, .14 + a * .14], [-.06, .12]]); fs(ctx, '#8a93a3'); }
    // tail
    P(ctx, [[-.08, .12], [-.2, .09], [-.2, .06], [-.06, .09]]); fs(ctx, '#6f7888');
    // body
    ell(ctx, 0, .12, .1, .065, -.15); fs(ctx, '#aab2bf');
    const pk = (o.peck || 0), lk = o.look == null ? 1 : o.look;
    const hx = lk > 0 ? .08 + pk * .05 : .055, hy = .19 - pk * .12 + (lk < 0 ? .01 : 0);
    // neck
    P(ctx, [[.03, .15], [hx - .02, hy], [hx + .03, hy - .01], [.08, .1]]); fs(ctx, '#7f9a8f');
    ctx.fillStyle = 'rgba(160,110,170,.6)'; ell(ctx, .06, .14, .025, .03); ctx.fill();
    // head (lk = -1: looking back over its shoulder); o.glare: an angry brow
    sub(ctx, hx, hy, (o.headTilt || 0) * lk, lk, 1, () => {
      circ(ctx, 0, 0, .035); fs(ctx, '#9aa3b2');
      P(ctx, [[.03, .005], [.065, -.01], [.03, -.012]]); fs(ctx, '#3a3434', OLW * .6);
      circ(ctx, .012, .008, .009); ctx.fillStyle = '#e07a2a'; ctx.fill(); circ(ctx, .013, .008, .004); ctx.fillStyle = INK; ctx.fill();
      if (o.glare) { ctx.beginPath(); ctx.moveTo(-.006, .03); ctx.lineTo(.03, .016); st(ctx, OLW * 1.6); }
    });
    // near wing
    if (fl != null) { const a = Math.sin(TAU * fl + .4); P(ctx, [[.03, .15], [-.05, .15 + a * .26], [-.2, .13 + a * .16], [-.08, .1]]); fs(ctx, '#9aa3b2'); }
    else { ell(ctx, -.03, .13, .075, .04, -.2); fs(ctx, '#959eae'); ctx.beginPath(); ctx.moveTo(-.06, .12); ctx.lineTo(-.02, .12); ctx.moveTo(-.07, .105); ctx.lineTo(-.03, .108); st(ctx, OLW * .7, '#4a5260'); }
    if (o.splat) { const k = Math.min(1, o.splat), big = Math.max(1, o.splat); ctx.save(); ctx.translate(0, .17); ctx.scale(big, big); ctx.translate(0, -.17); smooth(ctx, [[-.06, .17], [-.03, .19 * k + .17 * (1 - k)], [.02, .19], [.05, .175], [.04, .15], [.0, .16], [-.04, .15]], true, .6); fs(ctx, '#f4f2ea', OLW * .7); circ(ctx, .065, .205, .012 * k); ctx.fillStyle = '#f4f2ea'; ctx.fill(); circ(ctx, -.08, .15, .009 * k); ctx.fill(); ctx.restore(); }
  });
}

function bulldog(ctx, x, y, f, o = {}) {
  const ph = o.run || 0, sc = o.sc || 1, run = o.running ? 1 : 0;
  sub(ctx, x, y, (o.rot || 0) * f, f * sc, sc, () => {
    const c = '#b07a4f', c2 = '#e9dccb';
    const lg = (a, x0, far) => { const s = Math.sin(TAU * (ph + a)) * .12 * run; const kx = x0 + s; limb(ctx, [[x0, .22], [kx, .08], [kx + .02, .015]], .055, far ? shade(c, -.2) : c); ell(ctx, kx + .03, .015, .035, .018); fs(ctx, far ? shade(c2, -.15) : c2); };
    lg(.5, .16, true); lg(0, -.16, true);
    // tail
    const tw = Math.sin(TAU * ph * 3) * .03 * (o.wag || 0);
    ctx.beginPath(); ctx.moveTo(-.2, .27); ctx.quadraticCurveTo(-.27, .32 + tw, -.25, .36 + tw); st(ctx, OLW * 4, INK); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-.2, .27); ctx.quadraticCurveTo(-.27, .32 + tw, -.25, .36 + tw); st(ctx, OLW * 2.4, c);
    // body
    smooth(ctx, [[-.22, .3], [-.12, .36], [.1, .36], [.2, .33], [.22, .2], [.1, .15], [-.1, .16], [-.23, .2]], true, .5); fs(ctx, c);
    smooth(ctx, [[.08, .2], [.2, .22], [.18, .15], [.08, .15]], true, .5); ctx.fillStyle = c2; ctx.fill();
    if (o.greasy) { const g = o.greasy; ctx.save(); smooth(ctx, [[-.22, .3], [-.12, .36], [.1, .36], [.2, .33], [.22, .2], [.1, .15], [-.1, .16], [-.23, .2]], true, .5); ctx.clip();
      ctx.beginPath(); ctx.moveTo(-.2, .34); ctx.quadraticCurveTo(-.05, .39, .16, .35); ctx.lineWidth = .05; ctx.strokeStyle = `rgba(214,120,62,${.5 * g})`; ctx.stroke();
      ctx.fillStyle = `rgba(255,240,215,${.8 * g})`; [[-.12, .352, .03], [.02, .362, .022], [.12, .352, .016]].forEach(([a, b, r]) => { ell(ctx, a, b, r, .006, .05); ctx.fill(); }); ctx.restore(); }
    lg(0, .12, false); lg(.5, -.18, false);
    // head
    const hb = o.headBob || 0;
    sub(ctx, .26, .33 + hb, (o.headRot || 0), 1, 1, () => {
      smooth(ctx, [[-.08, .06], [.02, .12], [.12, .1], [.16, .02], [.15, -.06], [.06, -.1], [-.05, -.07], [-.1, 0]], true, .5); fs(ctx, c);
      smooth(ctx, [[.06, .02], [.17, .02], [.18, -.06], [.08, -.1], [.02, -.06]], true, .5); fs(ctx, c2);
      ell(ctx, .17, .015, .025, .018); fs(ctx, '#2a2320', OLW * .6);
      ctx.beginPath(); ctx.moveTo(.08, -.06); ctx.quadraticCurveTo(.12, -.08, .16, -.05); st(ctx, OLW * .8);
      circ(ctx, .09, .05, .014); ctx.fillStyle = INK; ctx.fill();
      ctx.beginPath(); ctx.moveTo(.06, .075); ctx.lineTo(.11, .07); st(ctx, OLW * 1.2);
      P(ctx, [[-.04, .09], [-.1, .13], [-.08, .04]]); fs(ctx, shade(c, -.25));
      if (o.tongue) { ell(ctx, .13, -.1, .025, .035, .3); fs(ctx, '#d86a78', OLW * .7); }
      if (o.mouthItem) o.mouthItem(ctx, [.16, -.07]);
    });
  });
}

function cat(ctx, x, y, f, o = {}) {
  // o.pose: 'crouch' | 'walk' | 'loaf' (lying) | 'sit' | 'leap' ; o.ph walk phase ; o.eyes open|wide|happy|half ; o.tongue ; o.sniff ; o.meow
  const c = '#e3893a', cd = '#b85f20', cl = '#f6d9b8', sc = o.sc || 1;
  sub(ctx, x, y, (o.rot || 0) * f, f * sc, sc, () => {
    const ph = o.ph || 0, pose = o.pose || 'walk';
    const loaf = pose === 'loaf', sit = pose === 'sit', leap = pose === 'leap';
    const crouch = pose === 'crouch' || loaf ? 1 : 0;
    const tw = o.tail || 0;
    const stripes = path => { ctx.save(); path(); ctx.clip(); ctx.strokeStyle = cd; ctx.lineWidth = .018; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * .07 - .02, .45); ctx.lineTo(i * .07 + .03, -.05); ctx.stroke(); } ctx.restore(); };
    const tailStroke = (pts) => { ctx.beginPath(); ctx.moveTo(...pts[0]); ctx.bezierCurveTo(...pts[1], ...pts[2], ...pts[3]); ctx.lineWidth = .045 + 2 * OLW / S; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineWidth = .045; ctx.strokeStyle = c; ctx.stroke(); };
    let hx = .22, hy;
    if (sit) {
      tailStroke([[-.1, .03], [-.2, .0], [-.05, -.01 + tw * .02], [.1, .015]]);
      const body = () => smooth(ctx, [[-.15, .04], [-.14, .15], [-.04, .25], [.08, .29], [.15, .2], [.12, .05], [-.02, 0]], true, .5);
      limb(ctx, [[.05, .16], [.04, .02]], .04, cd); ell(ctx, .055, .015, .022, .014); fs(ctx, shade(cl, -.15));
      body(); fs(ctx, c); stripes(body);
      ell(ctx, -.06, .08, .09, .075, -.2); fs(ctx, c);
      limb(ctx, [[.1, .16], [.1, .02]], .04, c); ell(ctx, .115, .015, .022, .014); fs(ctx, cl);
      hx = .12; hy = .33;
    } else {
      const lg = (x0, a, far, front) => {
        let s = pose === 'walk' ? Math.sin(TAU * (ph + a)) * .05 : 0;
        let l = crouch ? .07 : .15, fx = 0;
        if (leap) { fx = front ? .09 : -.1; l = .13; }
        if (loaf) return;
        limb(ctx, [[x0, l + .01], [x0 + s + fx, .02]], .04, far ? cd : c); ell(ctx, x0 + s + fx + .012, .015, .022, .014); fs(ctx, far ? shade(cl, -.15) : cl);
      };
      lg(.12, .5, true, true); lg(-.12, 0, true, false);
      const bh = loaf ? .085 : crouch ? .1 : .17;
      // tail
      if (o.tailDown) tailStroke([[-.17, bh - .02], [-.24, bh - .1], [-.2 + tw * .06, bh - .25], [-.24 + tw * .1, bh - .38]]);
      else tailStroke([[-.17, bh - .01 - crouch * .05], [-.32, bh - .02], [-.34 + tw * .1, bh + .13], [-.28 + tw * .15, bh + .21 - crouch * .15]]);
      const body = () => smooth(ctx, [[-.19, bh + .04], [-.05, bh + .07], [.12, bh + .06], [.2, bh + .02], [.18, bh - .07], [.02, bh - .08], [-.16, bh - .06]], true, .5);
      body(); fs(ctx, c); stripes(body);
      if (loaf) { ell(ctx, .15, bh - .065, .05, .02); fs(ctx, cl); ell(ctx, .07, bh - .07, .045, .018); fs(ctx, shade(cl, -.1)); }
      lg(.14, 0, false, true); lg(-.1, .5, false, false);
      hy = bh + .07;
      if (loaf) { hx = .2; hy = bh + .05; }
    }
    if (o.puff) { ctx.strokeStyle = INK; ctx.lineWidth = px(1.6); const bh2 = sit ? .15 : loaf ? .085 : crouch ? .1 : .17; for (let k = 0; k < 11; k++) { const u = k / 10, xx = lerp(-.18, .16, u), yy = bh2 + .065 + Math.sin(Math.PI * u) * .02; ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + .012, yy + .035 * o.puff); ctx.stroke(); } }
    // head
    sub(ctx, hx + (o.headX || 0), hy + (o.headY || 0), o.headRot || 0, 1, 1, () => {
      if (o.earsBack) { P(ctx, [[-.05, .04], [-.1, .085], [.0, .05]]); fs(ctx, c); P(ctx, [[.02, .05], [-.03, .1], [.07, .03]]); fs(ctx, c); }
      else { P(ctx, [[-.05, .04], [-.035, .11], [.0, .05]]); fs(ctx, c); P(ctx, [[.02, .05], [.06, .11], [.07, .03]]); fs(ctx, c); }
      ell(ctx, .01, 0, .075, .06); fs(ctx, c);
      ell(ctx, .05, -.02, .035, .025); ctx.fillStyle = cl; ctx.fill();
      const e = o.eyes || 'open';
      if (e === 'happy') { ctx.beginPath(); ctx.arc(.035, .012, .014, 0, Math.PI); st(ctx, OLW * 1.1); }
      else {
        ell(ctx, .035, .01, .012, e === 'wide' ? .02 : .015); ctx.fillStyle = '#2b3a1f'; ctx.fill(); ctx.fillStyle = INK; ell(ctx, .037, .01, e === 'wide' ? .007 : .004, .012); ctx.fill();
        if (e === 'half') { ctx.fillStyle = c; ctx.fillRect(.018, .009, .036, .03); ctx.beginPath(); ctx.moveTo(.021, .01); ctx.lineTo(.05, .012); st(ctx, OLW * 1.1); }
      }
      const nx = o.sniff ? Math.sin(o.sniff * 40) * .004 : 0;
      P(ctx, [[.075 + nx, -.005], [.085 + nx, -.005], [.08 + nx, -.013]]); ctx.fillStyle = '#c45b62'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(.06, -.02); ctx.lineTo(.12, -.01); ctx.moveTo(.06, -.025); ctx.lineTo(.12, -.035); st(ctx, OLW * .5, 'rgba(60,40,30,.6)');
      if (o.sniff) { ctx.beginPath(); ctx.arc(.1, 0, .018, -.6, .6); ctx.moveTo(.125, .012); ctx.arc(.1, 0, .028, .4, -.4, true); st(ctx, OLW * .5, 'rgba(60,40,30,.5)'); }
      if (o.meow) { ell(ctx, .065, -.035, .012, .014 * o.meow); ctx.fillStyle = '#6d2a27'; ctx.fill(); }
      if (o.tongue) { ell(ctx, .078, -.04 - .012 * o.tongue, .011, .015 * o.tongue + .004, .4); fs(ctx, '#e5838c', OLW * .6); }
      ctx.strokeStyle = cd; ctx.lineWidth = .01; ctx.beginPath(); ctx.moveTo(-.02, .055); ctx.lineTo(-.01, .035); ctx.moveTo(.01, .06); ctx.lineTo(.012, .04); ctx.stroke();
      if (o.feather) { local(ctx, .075, -.035, -.5); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(.04, .02, .08, .0); ctx.quadraticCurveTo(.04, -.012, 0, 0); fs(ctx, '#b9c0cb', OLW * .5); ctx.restore(); }
    });
  });
}

function gull(ctx, x, y, sc, ph) {
  const a = Math.sin(TAU * ph) * .5;
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
  ctx.beginPath(); ctx.moveTo(-1, a * .6); ctx.quadraticCurveTo(-.5, .25 + a * .3, 0, 0); ctx.quadraticCurveTo(.5, .25 + a * .3, 1, a * .6);
  ctx.lineWidth = .16; ctx.strokeStyle = '#3d4450'; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.restore();
}
