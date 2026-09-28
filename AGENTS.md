# Working on The Umbrella Walk

A 76 s, 19-shot 2D cartoon drawn entirely in code (canvas 2D, 1920×1080, 24 fps). There are no image or video assets: every frame comes from `FILM.renderFrame(ctx, t)`.

## Setup

```bash
pip install -r requirements.txt
python3 -m playwright install chromium     # add --with-deps on a fresh Linux box
# ffmpeg must be on PATH
```

## Commands

| Task | Command |
|------|---------|
| Build `dist/film.js` from `src/` | `python3 tools/build.py` (the other tools do this for you) |
| Stills of one shot, every 0.25 s | `python3 tools/preview.py --shot 6 --every 0.25` |
| Stills at chosen seconds | `python3 tools/preview.py --shot 9 --at 1.9 2.2 2.9` |
| Re-render just some shots | `python3 tools/render_film.py --shots 6 9` (to `out/shots/`) |
| Render the whole film | `python3 tools/render_film.py` (to `out/umbrella_walk.mp4`) |
| Temp soundtrack with the hit points | `python3 tools/guide_track.py`, then `render_film.py --audio audio/guide.wav` |

`preview.py` writes `out/preview.jpg`. **Always open that image and look at it** after a change. Most mistakes in this film are visual, and only show up in the picture. A full render takes ~3 minutes on 4 cores; a preview takes seconds.

If `audio/soundtrack.*` exists the render muxes it in. It is not in the repo (see README → Sound), so a silent render is normal.

## How the code works

- `tools/build.py` concatenates `src/` into one global script in this order: `core, hero, cast, props, lib, s1, s2, s3, main`. There are no modules or imports; later files use earlier globals.
- **World units are metres, y points up.** `camera(ctx, cx, cy, pxPerMetre)` frames a shot (for example `camera(ctx, .2, 1.1, 420)`). `px(n)` converts screen pixels to world units, which is what line widths use.
- **A shot** is registered in `s1.js`/`s2.js`/`s3.js` as `shot('Name', ...CUT(n), (ctx, t, T) => { ... }, { notes })`. Here `t` is the time in seconds since the shot started, and `T` is the time in the whole film. `notes` describes the shot in plain English. Keep it true when you change the shot.
- **Timing:** `audio/cuts.json` is the only source of shot boundaries, in frames. `build.py` writes it into `src/core.js`. The cuts sit one frame before a beat in `audio/beats.json`. If you change a shot's length, move a cut to another beat and give the time to a neighbour, so that the total stays 1,839 frames.
- **Animation:** `kf(t, [[time, value, ease], ...])` does keyframes (values may be numbers or `[x, y]`). `seg(t, a, b)` maps to 0..1. `E.io`, `E.o`, `E.i` are the easings. `rng(seed)` is deterministic randomness, so never use `Math.random()`; every frame must render the same way every time.
- **The hero:** `heroSide`, `heroFront`, `heroBack` in `hero.js`.
  - Call a rig with `measure: 1` first to get joint positions (`Sh`, `handL`, legs) without drawing anything.
  - To put the umbrella tip somewhere, use `aimTip(base, tipTarget, f, anchorOffset)`, which returns the arm pose. The angle is `atan2(tip - handL)`.
  - `heroArmIK(Sh, handTarget, f)` places the hand directly.
  - `legsByDist(distance, speed)` and `armsByDist(...)` give walking poses.
- **Continuity:** each shot sets the global `HS` at its top. It holds `HS.tip` (dropping on the tip), `HS.leg` (the smear on his trouser leg, shots 6-14), `HS.sausage` (a sausage on the tip, shots 6-7), and similar. When something gets dirty or clean, it has to show in the next shots too.
- `CAST` in `lib.js` holds the supporting characters' looks. `personSide` and `personFront` in `cast.js` draw them.

## The rules this film follows

These came from the director's notes. Check every change against them:

1. **Cause and consequence you can see.** Nothing happens without a visible reason (a gust, a bark, a phone the kid is staring at), and everything touched stays changed: the pot keeps the smear, the trousers keep it until the taxi water, and the sausages add up (dog 1, cat 1, butcher 6).
2. **The fix beats the failure.** The solution has to be smarter than what would have happened anyway. Nobody loses momentum, and one move often does two jobs.
3. **Readable on a phone.** Key props and actions must be big and held long enough. Keep it short where nothing happens, and move closer where it matters.
4. **Drawing sanity.** Check each of these:
   - Umbrella in his left hand, coffee in his right. They never merge into one fist (use `CUP_LOW` when the umbrella hand is up, `CUP_HIGH` when it is low), and the coffee stays level.
   - No limb, umbrella or prop passes through a body or face.
   - Nothing floats unsupported.
   - Nothing pops between frames.
   - Everyone has the right number of hands.
5. **Screen direction:** he travels left to right in every shot.

## Before you finish

- Preview every shot you touched at 0.1–0.25 s steps and look at the images for the problems in rule 4.
- Re-render the changed shots (`--shots`), then the whole film when asked.
- Don't commit `out/`, `dist/` or any audio file.
- Text in the film (shop signs, "WOOF!") uses Georgia or DejaVu fonts. On machines without them it falls back to another font, which is harmless.
