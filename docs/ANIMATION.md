# The picture: characters, objects, shots and movement

Everything you see is drawn by JavaScript on a canvas, one frame at a time, from nothing but code. This guide explains how the drawing is organised so you can change any part of it. The short version of the commands is in [`AGENTS.md`](../AGENTS.md).

## The rules of the drawing

- **Deterministic.** A frame depends only on its time. `renderFrame(ctx, t)` finds the shot that is playing and calls its draw function with `t` (seconds into the shot). There is no state carried between frames, and all randomness comes from `rng(seed)`. That is what lets any frame be rendered on its own, in any order, on any machine.
- **World units.** Every shot sets a camera with `camera(ctx, cx, cy, pxPerMetre)`. After that you draw in metres with y pointing up; the ground is usually y = 0. A person is about 1.75 high, the umbrella 0.87 long. `px(n)` is n screen pixels in world units, for line widths.
- **One look.** Thick dark outlines (`INK`), flat fills with one shade, a grain pass on top (`post` in `core.js`). Use `fs(ctx, colour)` (fill and stroke) and the shape helpers in `core.js` (`ell`, `circ`, `rect`, `rrect`, `smooth`, `P`, `limb`) so new things match.

## Files

| File | What's in it |
|---|---|
| `src/core.js` | maths, easing `E`, keyframes `kf`, `seg`, `rng`, the camera, drawing helpers, the grain, `TIMELINE`/`MOMENTS`, the shot registry |
| `src/hero.js` | the hero: `HERO` (colours and proportions), `heroSide`, `heroFront`, `heroBack`, walking (`legsByDist`, `armsByDist`), arm IK, the umbrella, the coffee cup, continuity marks (`HS`, smears) |
| `src/cast.js` | everyone else: the person builder (`personSide`, `personFront`, faces, hair), and the animals (`pigeon`, `bulldog`, `cat`, `gull`) |
| `src/props.js` | objects and set pieces: walls, windows, doors, railings, lamppost, phone box, pavement, road, trees, bench, top hat, scooter, letters, flowerpot, sausages, sailboat, ice-cream cone and cart, handbag, taxi, van, easel, the Houses of Parliament… |
| `src/lib.js` | `CAST` (the looks of the supporting characters), shared scenery (`streetBack`, `bystanders`, `streetTree`), `windStreaks`, the London painting |
| `src/s1.js` `s2.js` `s3.js` | the shots: 1-5, 6-10, 11-19 |
| `src/main.js` | `renderFrame(ctx, t)`: picks the shot, draws it, adds the grain |
| `timeline.json` | when each shot starts and ends, and its named moments |

`tools/build.py` joins the files in the order `core, hero, cast, props, lib, s1, s2, s3, main` into `dist/film.js`, so a file can use anything defined in the files before it.

## Characters

### The supporting cast

Every person except the hero is built from a *spec*: a small object of looks in `CAST` (`src/lib.js`). Change the spec and the person changes in every shot they appear in.

```js
butcher: { h: 1.72, skin: '#efbfa0', hair: '#5a4030', style: 'short', top: '#dfe7ef', bottom: '#2a2c30',
           shoes: '#1d1d1f', belly: .55, build: 1.3, apron: '#2d3b5a', apronStripe: '#e9e6de',
           hat: { type: 'cap', color: '#4b4b52' } },
```

| Field | Meaning |
|---|---|
| `h` | height in metres (children ~1.0-1.15, set `kid: 1` for child proportions) |
| `build`, `belly`, `limb`, `frontW` | width of the body, a belly (0..1), limb thickness, width seen from the front |
| `skin`, `hair`, `browC` | colours |
| `style` | hair: `short`, `side`, `fringe`, `curly`, `puffs`, `ponytail`, `bun` |
| `top`, `topLen` | top colour and length: `waist`, `hip`, `coat` |
| `bottom`, `skirt`, `legC`, `shoes` | trousers (or a skirt with `skirt: 1`, legs `legC`), shoe colour |
| `hat` | `{ type, color }`; type is one of `cap`, `postcap`, `hardhat`, `beanie`, `hood`, `trilby`, `tophat` |
| extras | `glasses`, `moustache`, `tie`, `apron`/`apronStripe`, `hiviz`, `vest`, `blush`, `coatOpen`, `buttons`, `shortSleeve`, `nose`, `round` |

Who is who, and where they appear:

| Spec | Character | Shot |
|---|---|---|
| `dandy` | the gentleman whose hat blows off | 1 Top hat |
| `scootKid` | the kid on the scooter | 2 Scooter |
| `postman` | the postman | 3 Postman |
| `reader` | the man reading on the bench | 5 Flowerpot |
| `butcher` | the butcher | 6 Butcher |
| `catGirl` | the girl who wants the cat | 7 Cat, 10 Ice cream |
| `pondBoy`, `pondGirl` | the kids at the pond | 8 Pond |
| `worker` | the site worker | 9 Wet concrete |
| `iceKid`, `vendor` | the kid with the cone, the ice-cream seller | 10 Ice cream |
| `painter` | the painter | 11 Painter |
| `driver` | the van driver | 12 Van |
| `thief`, `lady` | the bag thief, the old lady | 13 Handbag |
| `b1`-`b4` | the four bystanders | 14 Taxi, 17 Stance |

A person is drawn with `personSide(ctx, CAST.name, pose)` (profile, `f: 1` facing right, `-1` left) or `personFront(ctx, CAST.name, pose)`. The pose object carries position (`x`, `y`), legs (`legs`, e.g. `walkLegs(phase, amplitude)`), arms (`arms: { near, far }` for side, `farms: { l, r }` for front, each `{ sh, el }` shoulder and elbow angles in radians), `lean`, `nod`, things in the hands (`hold`), and the face `ex: { eyes, mouth, brow, lookX, lookY }`. Eyes: `open`, `wide`, `happy`, `closed`, `sad`, `cry`. Mouths: `smile`, `grin`, `laugh`, `o`, `frown`, `chew`, `cry`.

### The hero

The hero has his own rigs in `src/hero.js` because he does the most: `heroSide` (profile, used in most shots), `heroFront` (shots 1, 14, 18) and `heroBack` (walking away in 18-19). The rigs work out his skeleton: every hip, knee, ankle, shoulder, elbow and hand. Its proportions are the `HERO` object at the top of the file (`thigh`, `shin`, `torso`, `upper`, `fore` in metres).

**Who plays him** is one word at the top of `src/hero.js`: `const STAR = 'frog'` or `'man'`. Both are drawn on the same skeleton, so every shot plays the same with either:

- **The frog** is a ballpoint drawing (`art/frog/drawing.jpg`). `tools/trace_character.py` traces its pen lines into polygons, `src/frog_ink.js`, and cuts them at the joints. `src/frog.js` places his head, belly, hands and feet whole, and lays the two pen lines of his neck, arms and legs along the skeleton's limbs like rubber hose. Nothing of the drawing is redrawn. To star another drawing, photograph it flat and change the coordinates in `PARTS` in the tracer.
- **The man** is drawn in `src/hero.js` itself, in the colours of `HERO` (`coat`, `shirt`, `tie`, `trou`, `skin`, `hair`, `boot`).

The two close-ups, the coffee lid (shot 15) and the face (shot 16), draw him directly, and have a version for each.

He always carries the umbrella in his **left** hand and the coffee in his **right**. The tools for posing him:

- `heroSide(ctx, { x, y, legs, arms, umb: { ang, open }, sipT, lean, nod, smirk, ... })` draws him. Call it with `measure: 1` first to get joint positions (`Sh` shoulder, `handL`, `handR`, legs) without drawing.
- `legsByDist(distance, speed)` and `armsByDist(distance, speed)` give a walk that is locked to the ground: pass how far he has walked, and the feet never slide.
- `aimTip(measured, tipTarget, f, anchorOffset)` returns the arm pose that puts the umbrella **tip** on a point. `heroArmIK(Sh, handTarget, f)` puts the **hand** on a point.
- `sipT` 0..1 brings the cup to his mouth. `CUP_LOW` / `CUP_HIGH` are the two safe places for the coffee arm while the umbrella arm works, so the hands never merge.

### Animals

`pigeon(ctx, x, y, f, { flap, peck, walk, sc })`, `bulldog(ctx, x, y, f, { run, running, rot, sc })`, `cat(ctx, x, y, f, { pose: 'crouch'|'walk'|'loaf'|'sit'|'leap', ph, eyes, tongue, sniff, meow })` in `src/cast.js`. Their colours are at the top of each function.

## Objects

Each object is a function in `src/props.js` that draws it at a position, usually `name(ctx, x, y, scale, options)`: `tophat`, `scooter`, `letter`, `geraniumPot`, `sausageChain`, `sailboat`, `cone`, `scoop`, `handbag`, `taxi`, `van`, `box`, `easel`, `iceCart`, `phoneBox`, `lamppost`, `bench`, `tree`, `planterTree`… Change the function and the object changes wherever it's used. The umbrella and the coffee cup are in `hero.js` (`drawUmbrella`, `umbrellaFaceOn`, `drawCup`).

## How a shot is built

A shot is one call in `src/s1.js`, `s2.js` or `s3.js`:

```js
shot('Wet concrete', ...CUT(9), (ctx, t) => {
  HS.leg = 1;                                   // continuity: the trouser smear is still there
  const { T_CLOSE, T_TOSS, T_HOOK, T_GO, T_LAND /* ... */ } = MOMENTS('Wet concrete');   // timing, from timeline.json
  skyFill(ctx, ...); camera(ctx, CXc, 1.62, 285); // the camera: centre (metres) and pixels per metre
  // set: walls, scaffold, the wet cement, the sign ...
  // characters: work out poses from t and the moments, measure, aim, then draw
  // foreground and effects last
}, { notes: 'He arrives with the umbrella still open ... (what the shot shows, in plain English)' });
```

Inside, a shot is a function of `t`. The usual tools:

- `kf(t, [[1.0, 0], [1.3, 1, E.io], [2.0, 1], [2.2, 0, E.o]])`: keyframes. Values can be numbers or points `[x, y]`; the third item eases into that key (`E.io` in-out, `E.o` out, `E.i` in, `E.back`).
- `seg(t, a, b)`: 0 before a, 1 after b, linear between. `lerp`, `mix` blend numbers and points.
- `MOMENTS('Shot name')`: the shot's moments from `timeline.json`. Use them instead of bare numbers for anything that something else (another character, a sound, a music hit) has to be in sync with.

To make something happen at a new time: add a moment to the shot in `timeline.json` with a `what` that says what happens, add its name to the `MOMENTS` line, and key the animation on it (`kf(t, [[T_NEW, 0], [T_NEW + .2, 1, E.o]])`).

## Continuity

`HS` (hero state, `src/hero.js`) carries what the hero has picked up from shot to shot, and each shot sets it at its top: the dropping on the tip (`HS.tip`, shots 4-6, until he wipes it on his shin), the smear on his trouser leg (`HS.leg`, shots 6-14, until the taxi water washes it), the sausage on the tip (`HS.sausage`, 6-7), grime on the canopy (`HS.dirt`, also washed off by the taxi water). `HS.water` belongs to a parked gag in the pond shot. If you change what happens to him, make the next shots agree. The same goes for the world: the pigeon keeps its dropping from shot 5 into shot 19, the pot keeps its smear.

## Timing and cuts

`timeline.json` gives each shot `from` and `to` in frames. The cuts sit one frame before a beat of the music (`audio/beats.json`, about 118-120 beats a minute, so a beat is about 12 frames), so they land on the beat. To lengthen a shot, move its `to` (and the next shot's `from`) to one frame before another beat; `docs/MUSIC.md` explains how to keep the whole film in time. The moments are relative to the shot's start, so they stay put when a shot moves.

## Checking your work

```bash
python3 tools/preview.py --shot 9 --every 0.1          # contact sheet of the shot, every 0.1 s
python3 tools/preview.py --shot 9 --at 1.8 1.86 1.9    # just those instants
```

Open `out/preview.jpg` and look for the problems in the rules (hands merging, things passing through bodies, things floating, pops between frames). Then re-render only what you changed with `python3 tools/render_film.py --shots 9`. If feet moved, re-run `python3 tools/probe_motion.py` so the footsteps follow.
