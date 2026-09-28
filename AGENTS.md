# Working on The Umbrella Walk

A 76-second, 19-shot 2D cartoon drawn entirely in code: plain JavaScript on an HTML canvas, 1920×1080, 24 fps. There are no image, video or audio assets. Every frame comes from `FILM.renderFrame(ctx, t)`, and every sound is synthesised by a small physical model in Python.

This file is the map for anyone (human or agent) who wants to change the film. The deeper guides are:

- [`docs/ANIMATION.md`](docs/ANIMATION.md): characters, props, sets, how a shot is built and animated
- [`docs/SOUND.md`](docs/SOUND.md): what makes a sound in this film, and why, and the sound models
- [`docs/MUSIC.md`](docs/MUSIC.md): the guide score, using your own music (e.g. from Suno), and re-timing the cuts to it
- [`docs/STUDIO.md`](docs/STUDIO.md): the studio page, where people pose, re-time, annotate and draw on the film; and how to apply the brief it produces

## Setup

```bash
pip install -r requirements.txt
python3 -m playwright install chromium     # add --with-deps on a fresh Linux box
# ffmpeg must be on PATH
```

No local machine? Push your change to GitHub: the **Render film** workflow (Actions tab) renders the film with sound and attaches the MP4 to the run.

## How it fits together

```
timeline.json ─────────┬──────────────────────┬─────────────────────────┐
 shots + named moments │                      │                         │
                       ▼                      ▼                         ▼
src/*.js ──build.py──► dist/film.js      guide_track.py            sfx_track.py ◄── audio/steps.json
 (the drawing)          │                 (music sketch)           (effects)            ▲
                        │                      │                         │         probe_motion.py
                        ▼                      ▼                         ▼         (footfalls, measured
                 render_film.py          audio/guide.wav ──mixed──► audio/guide_sfx.wav  from the picture)
                        │                                                │
                        └──────────────► out/umbrella_walk.mp4 ◄─────────┘
```

**`timeline.json` is the spine.** It holds each shot's first and last frame and its *named moments* (`T_HOOK: 1.86`, "the crook hooks the rail"). The drawing reads them (`const { T_HOOK } = MOMENTS('Wet concrete')`), the effects hang on them (`M(9, 'T_HOOK')` in `tools/sfx_track.py`), and so do the music hits (`tools/guide_track.py`). Move a moment in `timeline.json` and the drawing, its sound and its music hit move together. The cue sheet shows all of it:

```bash
python3 tools/timeline.py              # every shot, its moments, and the sounds and hits on each
python3 tools/timeline.py --shot 9     # one shot
```

## Commands

| Task | Command |
|------|---------|
| The cue sheet: shots, moments, sounds | `python3 tools/timeline.py [--shot N]` |
| Stills of one shot, every 0.25 s | `python3 tools/preview.py --shot 6 --every 0.25` → `out/preview.jpg` |
| Stills at chosen seconds | `python3 tools/preview.py --shot 9 --at 1.9 2.2 2.9` |
| Re-render just some shots | `python3 tools/render_film.py --shots 6 9` (to `out/shots/`) |
| Rebuild the sound | `python3 tools/probe_motion.py && python3 tools/guide_track.py && python3 tools/sfx_track.py` |
| Render the whole film with sound | `python3 tools/render_film.py --audio audio/guide_sfx.wav` |
| Effects under your own music | `python3 tools/sfx_track.py --music my_score.wav` → `audio/my_score_sfx.wav` |
| Hear one sound model | `python3 tools/sound_lab.py meow d=1.1` → `out/sounds/meow.wav`; `--list` shows them all |
| Ask the machine ear what it hears | `python3 tools/ear.py --shot 7 --from 3.4 --to 4.5`, or `--model growl --takes 12 --want Growling` |
| Fit the cuts to new music | `python3 tools/fit_music.py my_score.wav` (add `--write` to apply) |
| Build `dist/film.js` only | `python3 tools/build.py` (the other tools do this for you) |
| Build the studio (click, pose, note, brief) | `python3 tools/build_studio.py` → `out/studio.html` (`--ui` when only `studio/` changed) |

A preview takes seconds; a full render ~3 minutes on 4 cores. **Always open `out/preview.jpg` and look at it** after a change: most mistakes in this film are visual.

## What to change for what

| You want to change… | Edit | Then |
|---|---|---|
| **when** something happens (a hit, a catch, a sip) | its moment in `timeline.json` | preview the shot; rebuild the sound; `timeline.py --shot N` shows what else hangs on it |
| how a **character looks** (clothes, hair, colours, build, height) | `CAST.<name>` in `src/lib.js` (the fields are listed in `docs/ANIMATION.md`) | preview the shots they are in |
| how **the hero** looks | `HERO` in `src/hero.js` (colours, limb lengths), `heroSide/heroFront/heroBack` for shape | preview a few shots |
| how an **object** looks (hat, van, taxi, scooter, pots…) | its function in `src/props.js` | preview |
| an **animal** (dog, cat, pigeon) | `bulldog`, `cat`, `pigeon` in `src/cast.js` | preview |
| how someone **moves** in a shot | the shot's code: `shot('Name', …)` in `src/s1.js` (1-5), `s2.js` (6-10), `s3.js` (11-19), mostly `kf()` keyframes | preview at 0.1 s steps, re-run `probe_motion.py` if feet move |
| a shot's **length** or a **cut** | `from`/`to` in `timeline.json` (cuts sit one frame before a beat, see `docs/MUSIC.md`) | preview, rebuild the sound, render |
| **what a moment sounds like** | its `put(…)` line in `tools/sfx_track.py` (model, settings, loudness `L`, pan) | `sound_lab.py`, rebuild, `ear.py --shot N` |
| what **every** meow/splash/step sounds like | the model's defaults in `tools/sfxanimals.py` or `tools/sfxworld.py` | `sound_lab.py MODEL`, rebuild |
| **footsteps** | nothing: they follow the feet (`probe_motion.py`). Shoe types are `SHOES` in `sfx_track.py` | re-run `probe_motion.py` |
| a place's **acoustics** | `SPACES` in `sfx_track.py`; which space a shot is in: `space` in `timeline.json` | rebuild the sound |
| the **music** | `tools/guide_track.py` (the sketch), or bring your own: `docs/MUSIC.md` | rebuild, render with `--audio` |

To add a new event: give it a moment in `timeline.json`, add the name to that shot's `const { … } = MOMENTS('…')` line, use it in the drawing, and hang its sound on it with `M(shot, 'NAME')` in `sfx_track.py`.

## When you get a studio brief

A brief starts with "# Changes to The Umbrella Walk" and names a checkpoint commit. It lists, shot by shot, pose keyframes, moved moments, sound edits, notes, drawings and attachments, each with the file or line it concerns. Notes are the intent; poses and drawings are sketches of it. Implement them as real animation and sound under the rules below, then rebuild the studio so the next round starts from your version. Details: [`docs/STUDIO.md`](docs/STUDIO.md).

## How the code works

- `tools/build.py` concatenates `src/` into one global script in this order: `core, hero, cast, props, lib, s1, s2, s3, main`, and writes `timeline.json` into it. There are no modules or imports; later files use earlier globals.
- **World units are metres, y points up.** `camera(ctx, cx, cy, pxPerMetre)` frames a shot (for example `camera(ctx, .2, 1.1, 420)`). `px(n)` converts screen pixels to world units, which is what line widths use.
- **A shot** is `shot('Name', ...CUT(n), (ctx, t, T) => { ... }, { notes })`. `t` is seconds since the shot started, `T` is the time in the whole film. `notes` describes the shot in plain English: keep it true when you change the shot.
- **Animation:** `kf(t, [[time, value, ease], ...])` does keyframes (values may be numbers or `[x, y]`). `seg(t, a, b)` maps to 0..1. `E.io`, `E.o`, `E.i` are the easings. `rng(seed)` is deterministic randomness: never use `Math.random()`, every frame must render the same way every time.
- **The hero:** `heroSide`, `heroFront`, `heroBack` in `hero.js`.
  - Call a rig with `measure: 1` first to get joint positions (`Sh`, `handL`, legs) without drawing anything.
  - To put the umbrella tip somewhere, use `aimTip(base, tipTarget, f, anchorOffset)`, which returns the arm pose. The angle is `atan2(tip - handL)`.
  - `heroArmIK(Sh, handTarget, f)` places the hand directly.
  - `legsByDist(distance, speed)` and `armsByDist(...)` give walking poses.
- **Continuity:** each shot sets the global `HS` at its top. It holds `HS.tip` (dropping on the tip), `HS.leg` (the smear on his trouser leg, shots 6-14), `HS.sausage` (a sausage on the tip, shots 6-7), and similar. When something gets dirty or clean, it has to show in the next shots too.
- **Sound:** `put(sound, time, L, pan, far)` in `sfx_track.py` places one sound: `L` is a loudness target in dB (footsteps sit around -40, a splash around -15), `pan` -1..1 is left..right on screen, `far` 0..1 dulls and wets it. Every sound goes through its shot's room.

## The rules this film follows

These came from the director's notes. Check every change against them:

1. **Cause and consequence you can see.** Nothing happens without a visible reason (a gust, a bark, a phone the kid is staring at), and everything touched stays changed: the pot keeps the smear, the trousers keep it until the taxi water, and the sausages add up (dog 1, cat 1, butcher 6). The same goes for sound: nothing is heard that you can't see a cause for.
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
- If you changed timing or movement, rebuild the sound (`probe_motion.py`, `guide_track.py`, `sfx_track.py`) and check `timeline.py --shot N`.
- You can't listen? Use `tools/ear.py` on the shots you changed, and say in your summary that no one has listened yet.
- Re-render the changed shots (`--shots`), then the whole film when asked.
- Don't commit `out/`, `dist/` or any audio file (`audio/steps.json` and `audio/beats.json` are data, and are committed).
- Text in the film (shop signs, "WOOF!") uses Georgia or DejaVu fonts. On machines without them it falls back to another font, which is harmless.
