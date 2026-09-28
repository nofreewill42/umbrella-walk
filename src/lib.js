// ===== shared cast, sets and helpers for the shots =====
const FR = n => n / 24;
const CAST = {
  dandy: { h: 1.76, skin: '#f0c7a8', hair: '#8e8274', style: 'fringe', top: '#7a5a3c', topLen: 'hip', bottom: '#5a4a3c', shoes: '#18181b', moustache: '#4a3a2f', coatOpen: '#f1ede4', tie: '#1a1a1d', browC: '#6d6155' },
  scootKid: { h: 1.1, kid: 1, skin: '#c98d62', hair: '#2b1d16', style: 'curly', top: '#3f8f5a', bottom: '#3a5f96', shoes: '#ece7dc' },
  postman: { h: 1.78, skin: '#e6b08a', hair: '#4a3a2e', style: 'short', top: '#2b3a57', bottom: '#2b3a57', shoes: '#1c1c1f', hat: { type: 'postcap', color: '#2b3a57' } },
  butcher: { h: 1.72, skin: '#efbfa0', hair: '#5a4030', style: 'short', top: '#dfe7ef', bottom: '#2a2c30', shoes: '#1d1d1f', belly: .55, build: 1.3, apron: '#2d3b5a', apronStripe: '#e9e6de', hat: { type: 'cap', color: '#4b4b52' } },
  catGirl: { h: 1.02, kid: 1, skin: '#8a5a3c', hair: '#1c1412', style: 'puffs', top: '#2f8f8c', topLen: 'hip', bottom: '#2f8f8c', legC: '#e46a5a', shoes: '#d8453b' },
  pondBoy: { h: 1.14, kid: 1, skin: '#f0c8a8', hair: '#6b4a2e', style: 'short', glasses: 1, top: '#3d6fa8', bottom: '#2e3f5a', shoes: '#dddad2' },
  pondGirl: { h: 1.1, kid: 1, skin: '#e8b894', hair: '#c9973e', style: 'ponytail', top: '#c9483f', bottom: '#34405a', shoes: '#f0ebe0' },
  worker: { h: 1.8, skin: '#d6a07c', hair: '#3a2a22', style: 'short', top: '#3b4a60', bottom: '#2d3a50', shoes: '#4a3a2e', hiviz: 1, hat: { type: 'hardhat', color: '#f2c230' } },
};


CAST.reader = { h: 1.76, skin: '#dcae8e', hair: '#5b4636', style: 'side', top: '#6a7d5a', topLen: 'hip', bottom: '#3b3f47', shoes: '#2a2a2a' };

let OFF = null;
function offscreen() { if (!OFF) { OFF = document.createElement('canvas'); OFF.width = W; OFF.height = H; } const o = OFF.getContext('2d'); o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, W, H); return o; }
function reflect(ctx, oc, yw, T, alpha = .42, amp = 3) {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = alpha;
  for (let y = Math.floor(yw); y < H; y += 2) {
    const sy = 2 * yw - y; if (sy < 0) break;
    const k = (y - yw) / 300, off = Math.sin(y * .09 + T * 5) * amp * (0.3 + k) + Math.sin(y * .031 - T * 3) * amp * .6 * k;
    ctx.drawImage(oc.canvas, 0, sy, W, 2, off, y, W, 2);
  }
  ctx.restore();
}
// the open umbrella's rim (side view): centre, radius and the two rim ends in world coords
function umbRim(hand, ang, open = 1) {
  const beta = lerp(.14, 1.28, E.o(open)), ru = .79 - .57 * Math.cos(beta), rv = .57 * Math.sin(beta);
  const d = [Math.cos(ang), Math.sin(ang)], n = [-Math.sin(ang), Math.cos(ang)], c = add(hand, d, ru);
  return { c, rv, a: add(c, n, rv), b: add(c, n, -rv) };
}

Object.assign(CAST, {
  iceKid: { h: 1.0, kid: 1, skin: '#6e4630', hair: '#15110f', style: 'curly', top: '#c2413b', topLen: 'hip', buttons: '#efdcae', bottom: '#34405a', shoes: '#2d6fb0' },
  vendor: { h: 1.68, skin: '#f0c6a6', hair: '#b8482f', style: 'ponytail', top: '#f4f1ea', bottom: '#34405a', shoes: '#333', blush: 1 },
  painter: { h: 1.72, skin: '#eec4a4', hair: '#d6d1c9', style: 'fringe', top: '#7b5a3e', bottom: '#50463d', shoes: '#3a2c22', browC: '#bdb6aa' },
  thief: { h: 1.78, skin: '#d9a883', hair: '#2a2320', style: 'short', top: '#8f949b', bottom: '#3e4a5e', shoes: '#ececec', hat: { type: 'hood', color: '#8f949b' } },
  lady: { h: 1.58, skin: '#f1cfb4', hair: '#d9d6d2', style: 'bun', top: '#9b6f86', topLen: 'coat', bottom: '#9b6f86', legC: '#c9b5a8', shoes: '#3a2c2a', glasses: 1, skirt: 1 },
  b1: { h: 1.8, skin: '#c68e6a', hair: '#222', style: 'short', top: '#3d4452', topLen: 'hip', bottom: '#3d4452', tie: '#7a2e2e', shoes: '#1b1b1b' },
  b2: { h: 1.66, skin: '#f2cfb3', hair: '#8a4b2a', style: 'bun', top: '#3f6e5a', topLen: 'coat', bottom: '#3f6e5a', legC: '#3a3a40', shoes: '#2a2a2a', skirt: 1 },
  b3: { h: 1.6, skin: '#f0cdb5', hair: '#dcd8d2', style: 'curly', top: '#a8845a', topLen: 'coat', bottom: '#a8845a', legC: '#c8b4a4', shoes: '#4a3a2e', skirt: 1 },
  b4: { h: 1.62, skin: '#a8704f', hair: '#1a1411', style: 'short', top: '#d88a2f', bottom: '#2c3346', shoes: '#f0f0f0' },
});


// colours shared by the real view, the canvas and the palette
const LDN = { sky: '#bfcad1', river: '#98adb8', bldg: '#a3acb4', gold: '#c2a574', dark: '#4d545c', white: '#efeadf' };
function canvasLondon(ctx, x, y, w, h, pr) {
  const C = (u, v) => [x + u * w, y + v * h];
  canvasPainting(ctx, x, y, w, h, {});
  ctx.save(); rect(ctx, x, y, w, h); ctx.clip();
  const reveal = (u0, v0, u1, v1, draw) => { ctx.save(); rect(ctx, x + u0 * w, y + v0 * h, (u1 - u0) * w, (v1 - v0) * h); ctx.clip(); draw(); ctx.restore(); };
  // sky: left-to-right, loose horizontal strokes
  if (pr.sky > 0) reveal(0, .3, pr.sky, 1, () => {
    ctx.fillStyle = LDN.sky; ctx.fillRect(x, y + .3 * h, w, .7 * h);
    ctx.strokeStyle = shade(LDN.sky, .25); ctx.lineWidth = h * .025; ctx.lineCap = 'round';
    [[.08, .86, .5], [.3, .7, .8], [.55, .9, .95], [.1, .6, .35]].forEach(([u0, v, u1]) => { ctx.beginPath(); ctx.moveTo(...C(u0, v)); ctx.lineTo(...C(u1, v + .02)); ctx.stroke(); });
  });
  // river
  if (pr.river > 0) reveal(0, 0, pr.river, .31, () => {
    ctx.fillStyle = LDN.river; ctx.fillRect(x, y, w, .31 * h);
    ctx.strokeStyle = shade(LDN.river, .3); ctx.lineWidth = h * .018; ctx.lineCap = 'round';
    [[.1, .2, .3], [.45, .12, .7], [.2, .07, .38], [.6, .23, .85]].forEach(([u0, v, u1]) => { ctx.beginPath(); ctx.moveTo(...C(u0, v)); ctx.lineTo(...C(u1, v)); ctx.stroke(); });
    ctx.fillStyle = LDN.dark; ctx.fillRect(x, y + .29 * h, w, .022 * h);
  });
  // the Palace of Westminster, long and pinnacled
  if (pr.bldg > 0) reveal(0, .28, pr.bldg * .72, 1, () => {
    ctx.fillStyle = LDN.bldg;
    ctx.fillRect(...C(.02, .31), .68 * w, .15 * h);
    for (let u = .03; u < .7; u += .045) { P(ctx, [C(u, .46), C(u + .012, .54), C(u + .024, .46)]); ctx.fill(); }
    ctx.fillRect(...C(.05, .31), .1 * w, .42 * h); for (let i = 0; i < 4; i++) ctx.fillRect(...C(.05 + i * .028, .73), .014 * w, .04 * h);
    ctx.fillRect(...C(.37, .31), .04 * w, .26 * h); P(ctx, [C(.365, .57), C(.415, .57), C(.39, .66)]); ctx.fill();
    ctx.fillStyle = LDN.dark; for (let u = .18; u < .68; u += .05) { ctx.fillRect(...C(u, .36), .012 * w, .05 * h); }
  });
  // the clock tower, painted bottom to top in gold
  if (pr.tower > 0) reveal(.7, .28, .84, .28 + pr.tower * .7, () => {
    ctx.fillStyle = LDN.gold; ctx.fillRect(...C(.725, .31), .07 * w, .52 * h);
    P(ctx, [C(.715, .83), C(.805, .83), C(.76, .97)]); ctx.fill();
    ctx.fillStyle = shade(LDN.gold, -.25); ctx.fillRect(...C(.725, .66), .07 * w, .012 * h); ctx.fillRect(...C(.725, .8), .07 * w, .012 * h);
  });
  if (pr.clock > 0) { const c = C(.76, .735); circ(ctx, c[0], c[1], .026 * w * pr.clock); ctx.fillStyle = LDN.white; ctx.fill(); if (pr.clock > .8) { seg2(ctx, c, [c[0], c[1] + .016 * w], 1.2, LDN.dark); seg2(ctx, c, [c[0] + .012 * w, c[1] - .004 * w], 1.2, LDN.dark); } }
  ctx.restore();
}

const PARK = { grass: '#7fa464', tree: '#5d8a4c', trunk: '#6d5540' };

CAST.driver = { h: 1.76, skin: '#d9a47f', hair: '#3a2a22', style: 'short', top: '#4a5566', bottom: '#2f3440', shoes: '#222', hat: { type: 'cap', color: '#34404f' } };

// ---------- shared street for S14 / S17 ----------
function streetBack(ctx, T, wet) {
  ctx.fillStyle = '#cdd2d6'; ctx.fillRect(-8, .45, 16, 6);
  for (let i = -3; i <= 3; i++) { rect(ctx, i * 2.2 - .9, .45, 1.9, 4.6); ctx.fillStyle = i % 2 ? '#c7ccd0' : '#c2c8cc'; ctx.fill(); for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) { rect(ctx, i * 2.2 - .7 + c * .85, 1.4 + r * 1.2, .5, .8); ctx.fillStyle = '#aab3ba'; ctx.fill(); } }
  fogBand(ctx, -8, 8, .45, 5, '#dde0e2', .55, .25);
}
function bystanders(ctx, t, mode) {
  // mode 'splash' (S14) or 'rain' (S17)
  const rain = mode === 'rain';
  const clap = !rain && t > 1.25 ? Math.abs(Math.sin((t - 1.25) * 12)) : 0;
  // the two women on the right see the wave coming at them, flinch, and stay dry
  const fear = t > .45 && t < .86, flinch = t >= .86 && t < 1.22, relief = t >= 1.22;
  const exR = rain ? null : fear ? { eyes: 'wide', mouth: 'o', brow: 1.4 } : flinch ? { eyes: 'closed', mouth: 'frown', brow: 1 } : relief ? { eyes: 'happy', mouth: 'laugh' } : { eyes: 'open', mouth: 'flat', lookX: -1 };
  const armsR = rain ? null : flinch ? { l: { sh: .6, el: -2.2 }, r: { sh: .6, el: -2.2 } } : relief ? { l: { sh: .45, el: -1.8 + clap * .4 }, r: { sh: .45, el: -1.8 + clap * .4 } } : { l: { sh: .12, el: .1 }, r: { sh: .12, el: .1 } };
  let B = [];
  B.push(() => personFront(ctx, CAST.b1, { x: -1.9, y: .36, ex: rain ? { eyes: 'closed', mouth: 'frown' } : { eyes: t > .6 ? (relief ? 'happy' : 'wide') : 'open', mouth: t > .6 ? (relief ? 'grin' : 'o') : 'flat', brow: t > .6 ? 1 : 0 }, farms: rain ? { l: { sh: 2.7, el: .5 }, r: { sh: 2.7, el: .5 } } : relief ? { l: { sh: .45, el: -1.8 + clap * .4 }, r: { sh: .1, el: .1 } } : { l: { sh: .1, el: .1 }, r: { sh: .15, el: .1 } }, hold: { r: (c, w) => { if (rain) { rect(c, w[0] - .35, w[1] + .02, .42, .1); fs(c, '#5a3a28'); } else { rrect(c, w[0] - .05, w[1] - .25, .3, .22, .02); fs(c, '#5a3a28'); } } } }));
  B.push(() => personFront(ctx, CAST.b4, { x: -1.2, y: .4, ex: rain ? { eyes: 'closed', mouth: 'flat' } : { eyes: t > .7 ? (relief ? 'happy' : 'wide') : 'open', mouth: relief ? 'grin' : t > .7 ? 'o' : 'flat' }, farms: relief && !rain ? { l: { sh: .45, el: -1.8 + clap * .4 }, r: { sh: .45, el: -1.8 + clap * .4 } } : { l: { sh: .1, el: .1 }, r: { sh: .1, el: .1 } } }));
  B.push(() => personFront(ctx, CAST.b2, { x: rain ? 1.9 : 1.14, y: .38, ex: rain ? { eyes: 'open', mouth: 'smile', lookY: 1 } : exR, farms: rain ? { l: { sh: .3, el: -.4 }, r: { sh: .6, el: 2.0 } } : armsR, hold: { r: (c, w) => { if (rain) { seg2(c, w, add(w, [0, .55]), 2.5, '#333'); c.beginPath(); c.moveTo(w[0] - .45, w[1] + .45); c.quadraticCurveTo(w[0], w[1] + .85, w[0] + .45, w[1] + .45); c.closePath(); fs(c, '#c7423a'); } } } }));
  B.push(() => personFront(ctx, CAST.b3, { x: rain ? 2.45 : 1.96, y: .34, ex: rain ? { eyes: 'closed', mouth: 'frown' } : Object.assign({}, exR, relief ? { mouth: 'smile' } : {}), farms: rain ? { l: { sh: .12, el: .1 }, r: { sh: .12, el: .1 } } : Object.assign({}, armsR, relief ? { l: { sh: .3, el: -2.4 }, r: { sh: .12, el: .1 } } : {}), tilt: rain ? -.1 : 0 }));
  if (mode === 'rain') { CAST.b4.hat = { type: 'hood', color: '#c47a26' }; } else { delete CAST.b4.hat; }
  B.forEach(f => f());
  delete CAST.b4.hat;
}


function streetTree(ctx, x, y, sc) {
  local(ctx, x, y, 0, sc);
  const bark = '#5d544c';
  P(ctx, [[-.13, 0], [.13, 0], [.08, 2.6], [-.08, 2.6]]); fsb(ctx, bark);
  ctx.beginPath(); ctx.moveTo(.05, 2.05); ctx.quadraticCurveTo(.5, 2.1, .95, 2.28); ctx.lineTo(.95, 2.2); ctx.quadraticCurveTo(.5, 1.98, .06, 1.92); ctx.closePath(); fsb(ctx, bark);
  ctx.beginPath(); [[0, 3.3, .95], [-.7, 2.95, .6], [.6, 3.05, .65], [-.2, 3.95, .7], [.4, 3.8, .6]].forEach(([bx, by, br]) => { ctx.moveTo(bx + br, by); ctx.arc(bx, by, br, 0, TAU); }); ctx.fillStyle = '#6f8062'; ctx.fill();
  ctx.restore();
}

// visible wind: white swoosh lines (with a soft grey edge so they read on pale skies) that race across the frame.
// specs: [t0, y, x0, len, speed, curl]; dir: +1 blows to the right, -1 to the left
function windStreaks(ctx, t, specs, dir = 1) {
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  specs.forEach(([t0, y, x0, len, speed, curl = 0], i) => {
    const u = t - t0, life = 5.5 / speed; if (u < 0 || u > life) return;
    const a = Math.sin(Math.PI * clamp(u / life)) ** .5;
    const hx = x0 + dir * u * speed, pts = [];
    for (let k = 0; k <= 16; k++) { const f = k / 16, x = hx - dir * len * (1 - f), yy = y + Math.sin(f * 5 + u * 9 + i) * .03 + (curl ? curl * Math.pow(Math.max(0, f - .72) / .28, 2) : 0); pts.push([x - (curl ? dir * curl * .6 * Math.pow(Math.max(0, f - .8) / .2, 2) : 0), yy]); }
    const path = () => { ctx.beginPath(); pts.forEach((q, k) => k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); };
    path(); ctx.strokeStyle = `rgba(110,122,134,${.4 * a})`; ctx.lineWidth = px(12); ctx.stroke();
    path(); ctx.strokeStyle = `rgba(255,255,255,${.95 * a})`; ctx.lineWidth = px(7); ctx.stroke();
  });
  ctx.restore();
}
