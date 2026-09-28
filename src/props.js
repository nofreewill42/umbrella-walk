// ===== sets & props =====
const BGI = 'rgba(40,38,40,.42)';
function fsb(ctx, fill, w = 1.4) { fs(ctx, fill, w, BGI); }

function skyFill(ctx, top, bot) {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, top); g.addColorStop(1, bot);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}
// ashlar stone wall
function stoneWall(ctx, x0, x1, y0, y1, base, o = {}) {
  const bh = o.bh || .32, bw = o.bw || .7, r = rng(o.seed || 3);
  ctx.fillStyle = base; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip();
  let row = 0;
  for (let y = y0; y < y1; y += bh, row++) {
    const off = (row % 2) * bw * .5;
    for (let x = x0 - bw + off; x < x1; x += bw) {
      const v = (r() - .5) * .07;
      ctx.fillStyle = shade(base, v); ctx.fillRect(x + .008, y + .008, bw - .016, bh - .016);
    }
  }
  ctx.strokeStyle = o.joint || 'rgba(90,80,70,.28)'; ctx.lineWidth = px(1.3);
  row = 0;
  for (let y = y0; y < y1; y += bh, row++) {
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
    const off = (row % 2) * bw * .5;
    for (let x = x0 - bw + off; x < x1; x += bw) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + bh); ctx.stroke(); }
  }
  ctx.restore();
}
function brickWall(ctx, x0, x1, y0, y1, base, o = {}) { stoneWall(ctx, x0, x1, y0, y1, base, Object.assign({ bh: .075, bw: .23, joint: 'rgba(230,220,200,.18)' }, o)); }

function sashWindow(ctx, x, y, w, h, o = {}) {
  const frame = o.frame || '#efece6', glass = o.glass || '#6f7f8d';
  // reveal
  rect(ctx, x - .05, y - .05, w + .1, h + .1); fsb(ctx, o.reveal || shade(o.wall || '#cfc6b8', -.12));
  rect(ctx, x, y, w, h); fsb(ctx, frame);
  const g = ctx.createLinearGradient(x, y + h, x + w, y);
  g.addColorStop(0, shade(glass, -.1)); g.addColorStop(.55, glass); g.addColorStop(.6, shade(glass, .18)); g.addColorStop(1, shade(glass, .05));
  const pad = .05, mid = y + h / 2;
  [[y + pad, mid - pad * .4], [mid + pad * .4, y + h - pad]].forEach(([a, b]) => {
    const cols = o.cols || 2, cw = (w - 2 * pad) / cols;
    for (let i = 0; i < cols; i++) { rect(ctx, x + pad + i * cw + .012, a, cw - .024, b - a); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = BGI; ctx.lineWidth = px(1); ctx.stroke(); }
  });
  // sill
  if (o.sill !== false) { rect(ctx, x - .1, y - .09, w + .2, .07); fsb(ctx, o.sillC || '#e2ddd3'); }
}
function door(ctx, x, y, w, h, color, o = {}) {
  rect(ctx, x - .08, y, w + .16, h + .1); fsb(ctx, o.surround || '#ece8e0');
  ctx.beginPath(); ctx.rect(x, y, w, h); fsb(ctx, color);
  // panels
  const p = .07;
  [[x + p, y + h * .52, w / 2 - p * 1.5, h * .4], [x + w / 2 + p * .5, y + h * .52, w / 2 - p * 1.5, h * .4], [x + p, y + p, w / 2 - p * 1.5, h * .38], [x + w / 2 + p * .5, y + p, w / 2 - p * 1.5, h * .38]].forEach(([a, b, c, d]) => { rect(ctx, a, b, c, d); ctx.strokeStyle = shade(color, -.3); ctx.lineWidth = px(1.6); ctx.stroke(); ctx.fillStyle = shade(color, .05); ctx.fill(); });
  if (o.letterbox) { rrect(ctx, x + w / 2 - .13, y + h * .44, .26, .055, .01); fsb(ctx, '#c9a445'); rect(ctx, x + w / 2 - .1, y + h * .44 + .018, .2, .02); ctx.fillStyle = '#1a1612'; ctx.fill(); }
  if (o.knob) { circ(ctx, x + w * .82, y + h * .47, .025); fsb(ctx, '#c9a445'); }
  if (o.fanlight) { ctx.beginPath(); ctx.arc(x + w / 2, y + h + .02, w / 2, 0, Math.PI); fsb(ctx, '#7d8b96'); }
}
function railings(ctx, x0, x1, y0, h, o = {}) {
  const gap = o.gap || .13, c = o.c || '#1d1f24';
  ctx.fillStyle = c;
  ctx.fillRect(x0, y0 + h * .12, x1 - x0, .025); ctx.fillRect(x0, y0 + h * .86, x1 - x0, .025);
  for (let x = x0; x < x1; x += gap) {
    ctx.fillRect(x - .009, y0, .018, h);
    ctx.beginPath(); ctx.moveTo(x - .022, y0 + h); ctx.lineTo(x, y0 + h + .07); ctx.lineTo(x + .022, y0 + h); ctx.closePath(); ctx.fill();
  }
}
function lamppost(ctx, x, y, sc = 1, lit = 0) {
  local(ctx, x, y, 0, sc);
  const c = '#1c1e23';
  P(ctx, [[-.12, 0], [.12, 0], [.08, .35], [-.08, .35]]); fs(ctx, c, 1.4);
  rect(ctx, -.045, .3, .09, 3.2); ctx.fillStyle = c; ctx.fill();
  rect(ctx, -.07, 1.0, .14, .06); ctx.fill(); rect(ctx, -.06, 2.2, .12, .05); ctx.fill();
  // lantern
  P(ctx, [[-.06, 3.5], [.06, 3.5], [.16, 3.62], [.12, 3.95], [-.12, 3.95], [-.16, 3.62]]); fs(ctx, c, 1.4);
  P(ctx, [[-.1, 3.62], [.1, 3.62], [.085, 3.9], [-.085, 3.9]]); ctx.fillStyle = lit ? '#f3d98a' : '#b9c2c9'; ctx.fill();
  P(ctx, [[-.16, 3.95], [.16, 3.95], [0, 4.1]]); ctx.fillStyle = c; ctx.fill();
  ctx.restore();
}
function phoneBox(ctx, x, y, sc = 1, o = {}) {
  local(ctx, x, y, 0, sc);
  const red = '#c3302a', rd = '#9e231f';
  rect(ctx, -.5, 0, 1.0, .12); fsb(ctx, rd);
  rect(ctx, -.46, .12, .92, 2.25); fsb(ctx, red);
  // windows grid
  for (let r = 0; r < 6; r++) for (let c = 0; c < 3; c++) { rect(ctx, -.32 + c * .215, .62 + r * .225, .19, .2); ctx.fillStyle = o.glass || '#a9b8c2'; ctx.fill(); }
  rect(ctx, -.38, .56, .76, 1.4); ctx.strokeStyle = rd; ctx.lineWidth = .03; ctx.stroke();
  // sign band
  rect(ctx, -.44, 2.1, .88, .16); ctx.fillStyle = '#f2efe6'; ctx.fill();
  txt(ctx, 'TELEPHONE', 0, 2.18, .1, '#222', '700 {S}px "DejaVu Sans", Arial, sans-serif');
  // roof
  ctx.beginPath(); ctx.moveTo(-.5, 2.37); ctx.lineTo(.5, 2.37); ctx.quadraticCurveTo(.48, 2.62, 0, 2.66); ctx.quadraticCurveTo(-.48, 2.62, -.5, 2.37); fsb(ctx, red);
  circ(ctx, 0, 2.55, .06); ctx.fillStyle = '#e7c95a'; ctx.fill();
  ctx.restore();
}
function pavement(ctx, x0, x1, yb, yt, color, o = {}) {
  ctx.fillStyle = color; ctx.fillRect(x0, yb, x1 - x0, yt - yb);
  ctx.strokeStyle = o.joint || 'rgba(70,65,60,.22)'; ctx.lineWidth = px(1.2);
  const rows = o.rows || 2, sw = o.slab || .9;
  for (let i = 1; i < rows; i++) { const y = lerp(yb, yt, i / rows); ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); }
  for (let r = 0; r < rows; r++) {
    const a = lerp(yb, yt, r / rows), b = lerp(yb, yt, (r + 1) / rows), off = (r % 2) * sw / 2;
    for (let x = Math.floor(x0 / sw) * sw + off; x < x1; x += sw) { ctx.beginPath(); ctx.moveTo(x + (r - rows / 2) * .02, a); ctx.lineTo(x + (r + 1 - rows / 2) * .02, b); ctx.stroke(); }
  }
}
function kerb(ctx, x0, x1, y, h = .14, c = '#b9b3aa') { rect(ctx, x0, y - h, x1 - x0, h); ctx.fillStyle = c; ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x0, y - .025, x1 - x0, .025); }
function road(ctx, x0, x1, y0, y1, c = '#4f5359', lines = true) {
  ctx.fillStyle = c; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  if (lines) { ctx.fillStyle = '#d9c35a'; ctx.fillRect(x0, y1 - .12, x1 - x0, .035); ctx.fillRect(x0, y1 - .19, x1 - x0, .035); }
}
function tree(ctx, x, y, sc = 1, o = {}) {
  const r = rng(o.seed || 11), leaf = o.leaf || '#6f8f5a', trunk = o.trunk || '#5a4a3e';
  local(ctx, x, y, 0, sc);
  P(ctx, [[-.14, 0], [.14, 0], [.09, 2.2], [-.09, 2.2]]); fsb(ctx, trunk);
  ctx.beginPath(); ctx.moveTo(0, 1.8); ctx.lineTo(-.6, 2.5); ctx.moveTo(.02, 2.0); ctx.lineTo(.5, 2.7); ctx.strokeStyle = trunk; ctx.lineWidth = .08; ctx.stroke();
  const blobs = o.blobs || [[0, 3.0, 1.1], [-.8, 2.6, .8], [.8, 2.7, .85], [-.3, 3.6, .8], [.45, 3.5, .8]];
  ctx.beginPath(); blobs.forEach(([bx, by, br]) => { ctx.moveTo(bx + br, by); ctx.arc(bx, by, br, 0, TAU); }); ctx.fillStyle = leaf; ctx.fill();
  if (!o.flat) { ctx.save(); ctx.beginPath(); blobs.forEach(([bx, by, br]) => { ctx.moveTo(bx + br, by); ctx.arc(bx, by, br, 0, TAU); }); ctx.clip(); ctx.beginPath(); blobs.forEach(([bx, by, br]) => { ctx.moveTo(bx - br * .1 + br * .55, by + br * .3); ctx.arc(bx - br * .1, by + br * .3, br * .55, 0, TAU); }); ctx.fillStyle = 'rgba(255,255,230,.10)'; ctx.fill(); ctx.restore(); }
  ctx.restore();
}
function bench(ctx, x, y, o = {}) {
  const wood = o.wood || '#7b5b3f', iron = '#23252a';
  local(ctx, x, y, 0, o.sc || 1);
  [-.7, .7].forEach(s => { P(ctx, [[s - .05, 0], [s + .05, 0], [s + .06, .45], [s + .08, .9], [s - .02, .9], [s - .04, .45]]); fs(ctx, iron, 1.4); });
  for (let i = 0; i < 2; i++) { rrect(ctx, -.85, .42 + i * .07, 1.7, .055, .01); fsb(ctx, i ? shade(wood, .08) : wood); }
  for (let i = 0; i < 3; i++) { rrect(ctx, -.85, .6 + i * .1, 1.7, .07, .01); fsb(ctx, shade(wood, .04 * i)); }
  ctx.restore();
}
function planterTree(ctx, x, y, o = {}) {
  // a clipped bay tree in a square shop planter. origin: ground at planter centre. soil top at y + .56
  local(ctx, x, y, 0, o.sc || 1);
  const box = '#2f3a36';
  // trunk + crown (behind the planter rim)
  limb(ctx, [[0, .5], [.01, 1.2], [-.005, 1.78]], .035, '#6b5140');
  ctx.beginPath(); [[0, 2.02, .34], [-.2, 1.9, .2], [.2, 1.92, .21], [0, 2.26, .2]].forEach(([bx, by, br]) => { ctx.moveTo(bx + br, by); ctx.arc(bx, by, br, 0, TAU); }); fs(ctx, '#4f7a45');
  ctx.save(); ctx.beginPath(); [[0, 2.02, .34], [-.2, 1.9, .2], [.2, 1.92, .21], [0, 2.26, .2]].forEach(([bx, by, br]) => { ctx.moveTo(bx + br, by); ctx.arc(bx, by, br, 0, TAU); }); ctx.clip();
  const r = rng(71); ctx.fillStyle = 'rgba(255,255,220,.13)'; for (let i = 0; i < 26; i++) { ell(ctx, -.3 + r() * .6, 1.75 + r() * .6, .05, .025, r() * 3); ctx.fill(); }
  ctx.fillStyle = 'rgba(0,30,0,.12)'; for (let i = 0; i < 20; i++) { ell(ctx, -.3 + r() * .6, 1.72 + r() * .6, .045, .02, r() * 3); ctx.fill(); }
  ctx.restore();
  // planter box
  P(ctx, [[-.27, .54], [.27, .54], [.24, 0], [-.24, 0]]); fsb(ctx, box);
  rect(ctx, -.3, .5, .6, .07); fsb(ctx, shade(box, .12));
  ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = px(1.2); for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * .12, .48); ctx.lineTo(i * .11, .03); ctx.stroke(); }
  // soil surface (seen a little from above)
  ell(ctx, 0, .57, .25, .028); ctx.fillStyle = '#4a3527'; ctx.fill();
  if (o.onSoil) o.onSoil(ctx, [0, .57]);
  ctx.restore();
}
function seatedReader(ctx, sp, x, y, o = {}) {
  // front view on a bench, newspaper up (peek 0..1 lowers it)
  const peek = o.peek || 0;
  // the arms end exactly at the hands on the paper's edges (two hands, not four)
  const D = dims(sp), m0 = personFront(ctx, sp, { x, y, hipH: .47, measure: 1 }), Sh0 = m0.Sh;
  const top0 = lerp(Sh0[1] + .2, Sh0[1] - .15, peek);
  const armTo = s2 => { const J = [Sh0[0] + s2 * D.bw * .55, Sh0[1] - D.limbW * .5], tg = [Sh0[0] + s2 * .335, top0 - .22]; const r = ik2((tg[0] - J[0]) * s2, tg[1] - J[1], D.up, D.fo); return { sh: r[0], el: r[1] }; };
  return personFront(ctx, sp, { x, y, hipH: .47, farms: { l: armTo(-1), r: armTo(1) }, ex: o.ex || { eyes: 'open', mouth: 'flat', lookY: -.6 }, tilt: peek * .08,
    post: (c, q) => { const top = lerp(q.Sh[1] + .2, q.Sh[1] - .15, peek); rect(c, q.Sh[0] - .33, top - .42, .66, .42); fs(c, '#f1ede2', 1.6); c.strokeStyle = 'rgba(60,60,60,.35)'; c.lineWidth = px(1.2); for (let i = 0; i < 7; i++) { c.beginPath(); c.moveTo(q.Sh[0] - .28, top - .08 - i * .045); c.lineTo(q.Sh[0] - .03, top - .08 - i * .045); c.moveTo(q.Sh[0] + .03, top - .08 - i * .045); c.lineTo(q.Sh[0] + .28, top - .08 - i * .045); c.stroke(); } seg2(c, [q.Sh[0], top], [q.Sh[0], top - .42], 1, 'rgba(60,60,60,.5)'); txt(c, 'THE DAILY', q.Sh[0] - .15, top - .045, .035, '#333', '700 {S}px Georgia, serif'); [-1, 1].forEach(s => { circ(c, q.Sh[0] + s * .335, top - .22, dims(sp).limbW * .6); fs(c, sp.skin); }); if (o.turn > 0 && o.turn < 1) { c.beginPath(); c.moveTo(q.Sh[0], top); c.quadraticCurveTo(q.Sh[0] + .3 * Math.cos(Math.PI * o.turn), top + .08 * Math.sin(Math.PI * o.turn), q.Sh[0] + .3 * Math.cos(Math.PI * o.turn), top - .21); c.quadraticCurveTo(q.Sh[0] + .3 * Math.cos(Math.PI * o.turn), top - .42 + .05 * Math.sin(Math.PI * o.turn), q.Sh[0], top - .42); c.closePath(); fs(c, '#f7f3e9', 1.4); } } });
}
function tophat(ctx, x, y, rot = 0, sq = 1, under = 0, spin = null) {
  // origin: centre of the brim. under 0..1 = seen from below (the opening shows). spin: phase (rad) of a spin about its own axis
  local(ctx, x, y, rot);
  ctx.scale(sq, 2 - sq);
  const c = '#1b1c21';
  const body = () => {
    P(ctx, [[-.1, .01], [.1, .01], [.105, .19], [-.105, .19]]); fs(ctx, c);
    ell(ctx, 0, .19, .105, .018 * (1 - under * .8)); fs(ctx, '#26282e');
    rect(ctx, -.1, .02, .2, .035); ctx.fillStyle = '#7e2a30'; ctx.fill();
    if (spin == null) { ctx.fillStyle = 'rgba(255,255,255,.1)'; rect(ctx, -.07, .06, .03, .12); ctx.fill(); }
    else {
      // the bow on the band and a sheen strip travel round the crown as it spins
      // a red band with gold studs that sweep round, and a sheen strip on the crown
      rect(ctx, -.1, .02, .2, .035); ctx.fillStyle = '#9b2f35'; ctx.fill();
      for (let k = 0; k < 4; k++) { const a = spin + k * Math.PI / 2, cz = Math.cos(a); if (cz <= 0) continue; const bx = .1 * Math.sin(a); ctx.fillStyle = '#e8c860'; rect(ctx, bx - .012 * cz, .024, .024 * cz, .027); ctx.fill(); }
      [0, Math.PI].forEach(o => { const a = spin + o + .8, cz = Math.cos(a); if (cz <= 0) return; ctx.fillStyle = `rgba(255,255,255,${.22 * cz})`; rect(ctx, .1 * Math.sin(a) - .015 * cz, .06, .03 * cz, .12); ctx.fill(); });
    }
  };
  if (under < .05) { ell(ctx, 0, 0, .15, .025); fs(ctx, c); body(); }
  else {
    body();
    ell(ctx, 0, 0, .15, .025 + .014 * under); fs(ctx, c);
    ell(ctx, 0, -.002, .1, .006 + .016 * under); ctx.fillStyle = '#5b2630'; ctx.fill();
    ell(ctx, 0, .0, .088, .004 + .013 * under); ctx.fillStyle = '#0b0b0d'; ctx.fill();
  }
  ctx.restore();
}
function scooter(ctx, x, y, f = 1, rot = 0, sc = 1) {
  sub(ctx, x, y, rot * f, f * sc, sc, () => {
    const red = '#d23a33';
    circ(ctx, -.25, .05, .05); fs(ctx, '#2a2a2e'); circ(ctx, .28, .05, .05); fs(ctx, '#2a2a2e');
    rrect(ctx, -.3, .07, .52, .045, .02); fs(ctx, red);
    limb(ctx, [[.28, .06], [.24, .66]], .03, red);
    limb(ctx, [[.2, .66], [.3, .66]], .025, '#2a2a2e');
  });
}
function letter(ctx, x, y, rot = 0, sc = 1, flip = 1) {
  local(ctx, x, y, rot, sc * flip, sc);
  rect(ctx, -.11, -.07, .22, .14); fs(ctx, '#f5f1e8', OLW * .8);
  ctx.beginPath(); ctx.moveTo(-.11, .07); ctx.lineTo(0, 0); ctx.lineTo(.11, .07); st(ctx, OLW * .6, 'rgba(60,50,40,.5)');
  rect(ctx, .06, .025, .03, .03); ctx.fillStyle = '#c0453d'; ctx.fill();
  ctx.restore();
}
function geraniumPot(ctx, x, y, rot = 0, o = {}) {
  local(ctx, x, y, rot);
  // origin: bottom centre of pot
  const r = rng(5);
  for (let i = 0; i < 7; i++) { const a = -1.2 + i * .4; ell(ctx, Math.sin(a) * .16, .3 + Math.cos(a) * .1, .09, .06, a); fs(ctx, '#4f7a3c', OLW * .7); }
  const fl = [[-.1, .42], [.05, .47], [.14, .38], [-.02, .36], [-.16, .33]];
  fl.forEach(([fx, fy]) => { for (let k = 0; k < 5; k++) { circ(ctx, fx + Math.cos(k * 1.26) * .025, fy + Math.sin(k * 1.26) * .025, .028); ctx.fillStyle = '#d93a3f'; ctx.fill(); } circ(ctx, fx, fy, .012); ctx.fillStyle = '#f2c84b'; ctx.fill(); });
  P(ctx, [[-.14, .24], [.14, .24], [.105, 0], [-.105, 0]]); fs(ctx, '#bf6a3f');
  rect(ctx, -.155, .2, .31, .055); fs(ctx, '#c9744a');
  if (o.smear > 0) { ctx.save(); ctx.globalAlpha = Math.min(1, o.smear); smear(ctx, .07, .06, .085, .6); ctx.restore(); }
  ctx.restore();
}
function sausageChain(ctx, pts, n = 7, o = {}) {
  // pts: polyline; place n sausages along it
  const Ls = []; let tot = 0;
  for (let i = 0; i < pts.length - 1; i++) { const d = dist(pts[i], pts[i + 1]); Ls.push(d); tot += d; }
  const at = s => { let a = s * tot; for (let i = 0; i < Ls.length; i++) { if (a <= Ls[i] || i === Ls.length - 1) { const u = Ls[i] ? a / Ls[i] : 0; return [mix(pts[i], pts[i + 1], clamp(u)), Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0])]; } a -= Ls[i]; } };
  for (let i = 0; i < n; i++) {
    const [p, a] = at((i + .5) / n);
    const len = Math.min(.15, tot / n * 1.05);
    ell(ctx, p[0], p[1], len / 2, .037, a); fs(ctx, o.color || '#b4542f', OLW * .9);
    ctx.fillStyle = 'rgba(255,230,210,.45)'; ell(ctx, p[0] + Math.cos(a + 1.6) * .012, p[1] + Math.sin(a + 1.6) * .012, len * .3, .009, a); ctx.fill();
    if (i < n - 1) { const [q] = at((i + 1) / n); circ(ctx, q[0], q[1], .01); ctx.fillStyle = '#8a3a2a'; ctx.fill(); }
  }
}
function sailboat(ctx, x, y, sc = 1, fill = 1, rock = 0, wind = 1) {
  local(ctx, x, y, rock, sc);
  P(ctx, [[-.26, .06], [.28, .06], [.2, -.04], [-.2, -.04]]); fs(ctx, '#b4552f');
  rect(ctx, -.26, .04, .54, .03); ctx.fillStyle = '#f0e9dd'; ctx.fill();
  seg2(ctx, [0, .06], [0, .72], OLW * 1.2, '#5a4030');
  // two sails: hanging slack in folds with no wind, both taut and full with it
  const F = lerp(.3, 1, fill);
  // main (aft of the mast)
  ctx.beginPath(); ctx.moveTo(-.012, .7); ctx.lineTo(-.012, .1); ctx.lineTo(-.25 * F, .1); ctx.quadraticCurveTo(-.2 * F + .14 * fill, .45, -.012, .7); fs(ctx, '#f6f2ea');   // full: the leech is blown forward, same way as the jib
  // jib (forward of the mast)
  ctx.beginPath(); ctx.moveTo(.012, .66); ctx.lineTo(.02, .12); ctx.lineTo(.24 * F, .1); ctx.quadraticCurveTo(.16 * F + .09 * fill, .4, .012, .66); fs(ctx, '#ece6da');
  if (fill < .5) { ctx.strokeStyle = 'rgba(120,110,95,.5)'; ctx.lineWidth = px(1.2); for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-.02 - i * .02, .6 - i * .06); ctx.lineTo(-.03 - i * .02, .14); ctx.moveTo(.03 + i * .02, .55 - i * .08); ctx.lineTo(.04 + i * .02, .14); ctx.stroke(); } }
  else { ctx.strokeStyle = 'rgba(120,110,95,.35)'; ctx.lineWidth = px(1.2); ctx.beginPath(); ctx.moveTo(-.03, .5); ctx.quadraticCurveTo(-.06 * F, .28, -.19 * F, .16); ctx.moveTo(.03, .42); ctx.quadraticCurveTo(.1 * F, .35, .17 * F, .2); ctx.stroke(); }
  if (wind > .3) { P(ctx, [[0, .72], [.08 * wind, .69 + .01 * Math.sin(Date.now ? 0 : 0)], [0, .66]]); } else { P(ctx, [[0, .72], [.012, .63], [-.008, .64]]); }
  ctx.fillStyle = '#c93b35'; ctx.fill();
  ctx.restore();
}
function cone(ctx, x, y, rot = 0, scoops = 2, sc = 1) {
  // origin: cone tip
  local(ctx, x, y, rot, sc);
  if (scoops >= 1) { smooth(ctx, [[-.055, .15], [-.06, .19], [-.03, .215], [.02, .22], [.058, .195], [.055, .15]], true, .6); fs(ctx, '#6b3f2a'); }
  if (scoops >= 2) { smooth(ctx, [[-.05, .21], [-.052, .25], [-.02, .275], [.025, .27], [.05, .245], [.048, .21]], true, .6); fs(ctx, '#f4ead3'); }
  P(ctx, [[-.05, .155], [.05, .155], [0, 0]]); fs(ctx, '#d9a45e');
  ctx.strokeStyle = 'rgba(120,70,30,.45)'; ctx.lineWidth = px(1);
  ctx.beginPath(); ctx.moveTo(-.035, .12); ctx.lineTo(.02, .04); ctx.moveTo(-.01, .15); ctx.lineTo(.035, .09); ctx.moveTo(.035, .13); ctx.lineTo(-.02, .06); ctx.stroke();
  ctx.restore();
}
function scoop(ctx, x, y, kind, rot = 0, squash = 0) {
  local(ctx, x, y, rot, 1 + squash * .6, 1 - squash * .5);
  smooth(ctx, [[-.052, -.02], [-.055, .02], [-.025, .045], [.022, .046], [.052, .024], [.05, -.02], [0, -.03]], true, .6); fs(ctx, kind === 'choc' ? '#6b3f2a' : '#f4ead3');
  ctx.restore();
}
function handbag(ctx, x, y, rot = 0, sc = 1) {
  // origin: top of handle loop
  local(ctx, x, y, rot, sc);
  ctx.beginPath(); ctx.moveTo(-.07, -.11); ctx.quadraticCurveTo(-.07, 0, 0, 0); ctx.quadraticCurveTo(.07, 0, .07, -.11); st(ctx, OLW * 2.6, INK); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-.07, -.11); ctx.quadraticCurveTo(-.07, 0, 0, 0); ctx.quadraticCurveTo(.07, 0, .07, -.11); st(ctx, OLW * 1.3, '#7a4a2b');
  rrect(ctx, -.15, -.33, .3, .23, .04); fs(ctx, '#8d5a34');
  rect(ctx, -.15, -.17, .3, .03); ctx.fillStyle = '#76492a'; ctx.fill();
  circ(ctx, 0, -.155, .012); ctx.fillStyle = '#d9b957'; ctx.fill();
  ctx.restore();
}
function taxi(ctx, x, y, f = 1, wheel = 0, o = {}) {
  sub(ctx, x, y, 0, f, 1, () => {
    const c = '#15161a';
    // body (side, facing +x), length 4.6
    smooth(ctx, [[-2.3, .35], [-2.32, .85], [-1.95, .95], [-1.55, 1.58], [.55, 1.62], [1.15, 1.0], [2.2, .9], [2.32, .55], [2.25, .3], [-2.25, .3]], true, .2); fs(ctx, c);
    // windows
    P(ctx, [[-1.45, 1.02], [-1.2, 1.5], [-.35, 1.5], [-.35, 1.02]]); ctx.fillStyle = '#8994a0'; ctx.fill();
    P(ctx, [[-.25, 1.02], [-.25, 1.5], [.45, 1.52], [.95, 1.02]]); ctx.fillStyle = '#8994a0'; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.25)'; P(ctx, [[-1.1, 1.45], [-.9, 1.45], [-1.2, 1.05], [-1.35, 1.05]]); ctx.fill();
    rect(ctx, -.35, .35, .02, 1.2); ctx.fillStyle = '#2d2f35'; ctx.fill();
    // roof sign
    rrect(ctx, -.35, 1.6, .5, .12, .03); fs(ctx, '#e9c349', 1.4);
    // wheels
    [-1.45, 1.45].forEach(wx => { ctx.beginPath(); ctx.arc(wx, .33, .4, 0, Math.PI); ctx.fillStyle = '#0c0c0e'; ctx.fill(); circ(ctx, wx, .33, .33); fs(ctx, '#1a1a1d', 1.4); circ(ctx, wx, .33, .18); ctx.fillStyle = '#9fa3aa'; ctx.fill(); for (let k = 0; k < 5; k++) { const a = wheel + k * TAU / 5; seg2(ctx, [wx, .33], [wx + Math.cos(a) * .16, .33 + Math.sin(a) * .16], 2, '#5b5f66'); } });
    // lights
    rect(ctx, 2.18, .62, .1, .12); ctx.fillStyle = '#f1e4b0'; ctx.fill();
    rect(ctx, -2.3, .62, .07, .14); ctx.fillStyle = '#b83a30'; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(-2.1, .8, 4.1, .04);
  });
}
function distantCity(ctx, x0, x1, y0, color, seed = 9, hMax = 4) {
  const r = rng(seed); ctx.fillStyle = color;
  for (let x = x0; x < x1;) { const w = .8 + r() * 1.6, h = 1.5 + r() * hMax; ctx.fillRect(x, y0, w, h); if (r() > .6) { ctx.fillRect(x + w * .3, y0 + h, w * .15, .5 + r() * .6); } x += w + r() * .3; }
}
function parliament(ctx, x, y, sc, color, o = {}) {
  local(ctx, x, y, 0, sc);
  ctx.fillStyle = color;
  ctx.fillRect(-6, 0, 12, 1.6);
  for (let i = -6; i < 6; i += .5) { ctx.fillRect(i, 1.6, .12, .35); P(ctx, [[i - .02, 1.95], [i + .14, 1.95], [i + .06, 2.15]]); ctx.fill(); }
  // clock tower
  ctx.fillStyle = o.tower || color;
  ctx.fillRect(4.2, 0, 1, 5.6); P(ctx, [[4.1, 5.6], [5.3, 5.6], [4.7, 7.4]]); ctx.fill();
  ctx.fillRect(4.05, 4.4, 1.3, .2); ctx.fillRect(4.05, 5.35, 1.3, .25);
  ctx.fillStyle = o.face || shade(color, .12); circ(ctx, 4.7, 4.9, .34); ctx.fill();
  if (o.face) { ctx.strokeStyle = shade(o.tower || color, -.35); ctx.lineWidth = .06; ctx.beginPath(); ctx.moveTo(4.7, 4.9); ctx.lineTo(4.7, 5.12); ctx.moveTo(4.7, 4.9); ctx.lineTo(4.86, 4.84); ctx.stroke(); }
  // victoria tower
  ctx.fillStyle = color; ctx.fillRect(-5.8, 0, 1.4, 5.0); for (let i = 0; i < 4; i++) ctx.fillRect(-5.85 + i * .45, 5.0, .15, .4);
  ctx.fillRect(-.3, 1.6, .6, 1.8); P(ctx, [[-.35, 3.4], [.35, 3.4], [0, 4.4]]); ctx.fill();
  ctx.restore();
}
function iceCart(ctx, x, y, o = {}) {
  local(ctx, x, y, 0);
  // wheels + body (origin: ground at cart centre)
  circ(ctx, -.35, .14, .14); fs(ctx, '#2c2e33'); circ(ctx, -.35, .14, .05); ctx.fillStyle = '#aaa'; ctx.fill();
  rrect(ctx, -.55, .15, 1.1, .78, .05); fs(ctx, '#f3efe4');
  rect(ctx, -.55, .6, 1.1, .08); ctx.fillStyle = '#5bb3b0'; ctx.fill();
  txt(ctx, 'ICES', 0, .42, .16, '#d05a5f', '700 {S}px Georgia, "DejaVu Serif", serif');
  rect(ctx, -.6, .9, 1.2, .06); fs(ctx, '#d9d2c2');
  // poles + canopy
  seg2(ctx, [-.5, .95], [-.5, 1.85], OLW * 1.6, '#8a8f98'); seg2(ctx, [.5, .95], [.5, 1.85], OLW * 1.6, '#8a8f98');
  ctx.beginPath(); ctx.moveTo(-.7, 1.82); ctx.lineTo(.7, 1.82); ctx.lineTo(.5, 2.05); ctx.lineTo(-.5, 2.05); ctx.closePath(); fsb(ctx, '#f7f3ea');
  ctx.save(); ctx.clip(); for (let i = -4; i < 4; i++) { rect(ctx, i * .18, 1.8, .09, .3); ctx.fillStyle = '#d05a5f'; ctx.fill(); } ctx.restore();
  for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.arc(-.7 + .0875 + i * .175, 1.82, .0875, Math.PI, 0); ctx.fillStyle = i % 2 ? '#d05a5f' : '#f7f3ea'; ctx.fill(); }
  // tip jar
  const jx = o.jarX == null ? -.385 : o.jarX;
  if (o.jar !== false) { rrect(ctx, jx - .065, .96, .13, .16, .02); fs(ctx, 'rgba(210,230,240,.55)', 1.4); txt(ctx, 'TIPS', jx, 1.05, .035, '#445', '700 {S}px Arial, sans-serif'); if (o.coins) { for (let i = 0; i < o.coins; i++) { ell(ctx, jx - .015 + (i % 3) * .03 - .015, .985 + Math.floor(i / 3) * .012, .02, .007); ctx.fillStyle = '#c9a445'; ctx.fill(); } } }
  ctx.restore();
}
function easel(ctx, x, y, o = {}) {
  local(ctx, x, y, 0);
  const w = '#8a6a4a';
  limb(ctx, [[-.3, 0], [0, 1.65]], .035, w); limb(ctx, [[.3, 0], [0, 1.65]], .035, w); limb(ctx, [[.05, 0], [0, 1.6]], .03, shade(w, -.15));
  rect(ctx, -.34, .78, .68, .04); fs(ctx, w);
  ctx.restore();
}
function canvasPainting(ctx, x, y, w, h, o = {}) {
  // origin bottom-left
  rect(ctx, x - .015, y - .015, w + .03, h + .03); fs(ctx, '#e9e2d2');
  ctx.save(); rect(ctx, x, y, w, h); ctx.clip();
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#dde3e6'); g.addColorStop(1, '#bfcad1'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#7fa464'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + h * .32); ctx.quadraticCurveTo(x + w * .5, y + h * .42, x + w, y + h * .3); ctx.lineTo(x + w, y); ctx.fill();
  ctx.fillStyle = '#5d8a4c'; circ(ctx, x + w * .25, y + h * .45, h * .13); ctx.fill(); circ(ctx, x + w * .75, y + h * .42, h * .1); ctx.fill();
  ctx.fillStyle = '#6d5540'; ctx.fillRect(x + w * .245, y + h * .2, w * .015, h * .15); ctx.fillRect(x + w * .745, y + h * .22, w * .012, h * .12);
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ell(ctx, x + w * .35, y + h * .78, w * .12, h * .04); ctx.fill();
  if (o.bird) { const b = o.bird; ctx.beginPath(); const bx = x + w * .6, by = y + h * .72, s = w * .07; const pts = [[bx - s, by + s * .35], [bx - s * .4, by + s * .45], [bx, by], [bx + s * .45, by + s * .5], [bx + s, by + s * .4]]; const n = Math.max(2, Math.ceil(b * 5)); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < n; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.lineWidth = w * .018; ctx.strokeStyle = '#2b2b30'; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(); }
  ctx.restore();
}
function van(ctx, x, y, o = {}) {
  // side view, cab at the LEFT (UK kerb side). origin ground at van centre. o.door 0 (closed) .. 1 (open, slid right). o.bounce
  local(ctx, x, y + (o.bounce || 0), 0);
  const wht = '#eef0ef', sh = '#d5d9da';
  smooth(ctx, [[-2.6, .38], [-2.62, .95], [-2.3, 1.12], [-1.75, 1.9], [-1.5, 2.3], [2.5, 2.32], [2.6, 2.2], [2.6, .38]], true, .15); fs(ctx, wht);
  ctx.fillStyle = sh; ctx.fillRect(-2.6, .38, 5.2, .2);
  // cab window
  P(ctx, [[-2.15, 1.3], [-1.62, 2.05], [-1.2, 2.05], [-1.2, 1.3]]); fs(ctx, '#7e8c97', 1.4);
  if (o.cab) { ctx.save(); P(ctx, [[-2.15, 1.3], [-1.62, 2.05], [-1.2, 2.05], [-1.2, 1.3]]); ctx.clip(); o.cab(ctx); ctx.fillStyle = 'rgba(200,215,225,.25)'; ctx.fillRect(-2.2, 1.3, 1.1, .8); ctx.restore(); P(ctx, [[-2.15, 1.3], [-1.62, 2.05], [-1.2, 2.05], [-1.2, 1.3]]); st(ctx, 1.4, BGI); }
  rect(ctx, -1.2, .6, .02, 1.65); ctx.fillStyle = BGI; ctx.fill();
  // doorway (dark interior)
  const dx0 = -1.0, dx1 = .25;
  rect(ctx, dx0, .6, dx1 - dx0, 1.55); ctx.fillStyle = '#3b3f45'; ctx.fill();
  if (o.inside) o.inside(ctx, dx0, dx1);
  // sliding door panel
  const d = clamp(o.door == null ? 1 : o.door);
  const px0 = lerp(dx0, dx0 + 1.3, d);
  rect(ctx, px0, .6, dx1 - dx0, 1.55); fs(ctx, wht, 1.6, BGI);
  rect(ctx, px0 + .05, 1.35, dx1 - dx0 - .1, .6); ctx.fillStyle = d > .5 ? '#e6e9e8' : '#e6e9e8'; ctx.fill();
  rrect(ctx, px0 + (dx1 - dx0) - .2, 1.2, .14, .05, .02); fs(ctx, '#2c2e33', 1.2);
  rrect(ctx, px0 + .04, 1.1, .05, .2, .02); fs(ctx, '#2c2e33', 1.2);
  // rear
  rect(ctx, 2.45, .7, .15, .4); ctx.fillStyle = '#c4473d'; ctx.fill();
  // wheels
  [-1.7, 1.75].forEach(wx => { ctx.beginPath(); ctx.arc(wx, .38, .45, 0, Math.PI); ctx.fillStyle = '#2b2d31'; ctx.fill(); circ(ctx, wx, .36, .34); fs(ctx, '#1d1e22', 1.4); circ(ctx, wx, .36, .16); ctx.fillStyle = '#a9adb3'; ctx.fill(); });
  ctx.restore();
}
function box(ctx, x, y, w, h, rot = 0) {
  local(ctx, x, y, rot);
  rect(ctx, -w / 2, 0, w, h); fs(ctx, '#c79a63', OLW * .9);
  ctx.fillStyle = '#e0cfae'; ctx.fillRect(-w * .12, h - .005, w * .24, -h * .5);
  ctx.strokeStyle = 'rgba(90,60,30,.35)'; ctx.lineWidth = px(1); ctx.beginPath(); ctx.moveTo(-w / 2, h * .55); ctx.lineTo(w / 2, h * .55); ctx.stroke();
  ctx.restore();
}
function puddle(ctx, x, y, w, d, c = 'rgba(120,135,150,.55)') { ell(ctx, x, y, w, d); ctx.fillStyle = c; ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.18)'; ell(ctx, x - w * .2, y + d * .2, w * .4, d * .25); ctx.fill(); }
function cone_traffic(ctx, x, y, sc = 1) {
  local(ctx, x, y, 0, sc);
  rect(ctx, -.2, 0, .4, .05); fs(ctx, '#d9581f', 1.4);
  P(ctx, [[-.14, .05], [.14, .05], [.03, .7], [-.03, .7]]); fs(ctx, '#ec6a26', 1.4);
  P(ctx, [[-.1, .25], [.1, .25], [.075, .4], [-.075, .4]]); ctx.fillStyle = '#f4f1ea'; ctx.fill();
  ctx.restore();
}
