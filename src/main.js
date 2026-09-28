// ===== timeline =====
const DUR = CUTS[CUTS.length - 1] / 24;
function renderFrame(ctx, T) {
  T = clamp(T, 0, DUR - 1e-4);
  let sh = SHOTS.find(s => T >= s.t0 && T < s.t1) || SHOTS[SHOTS.length - 1];
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  OLW = sh.olw || 2.4;
  resetHS();
  sh.draw(ctx, T - sh.t0, T, sh);
  ctx.restore();
  post(ctx, T, sh.vign == null ? .26 : sh.vign);
  // fade out at the very end
  if (T > DUR - .3) { ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.fillStyle = `rgba(8,9,12,${E.i(seg(T, DUR - .3, DUR))})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  return sh;
}
const FILM = { renderFrame, SHOTS, DUR, W, H, FPS };
if (typeof window !== 'undefined') window.FILM = FILM;
