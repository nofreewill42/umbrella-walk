# The studio

`out/studio.html` is the film opened up for directing: one self-contained page where you can click anything in the picture, re-pose it, move moments in time, edit sounds, write notes, draw on frames and add reference images and sounds. Everything you do is a **change against a checkpoint** (the git commit the page was built from). The page turns your changes into a **brief**: plain instructions an agent follows to make the next version of the film.

```bash
python3 tools/build_studio.py          # -> out/studio.html (about 30 s; commit first, so the checkpoint is a real commit)
python3 tools/build_studio.py --ui     # only studio/*.js or *.css changed: reuse the last scan and sounds (1 s)
```

The GitHub workflow builds it too; it is in the run's artifact next to the MP4.

## What is in the page

| Thing | What it is in the film | Where it comes from |
|---|---|---|
| **Act** | a shot (`timeline.json` shots) | `timeline.json` |
| **Moment** (event) | a named moment (`T_HOOK` …) | `timeline.json` |
| **Actor** | one top-level call of a drawing function on a frame: `heroSide`, `personSide(CAST.butcher)`, `cat`, `tophat`, `stoneWall`, `camera` … Sets, the camera and effects are per shot (`tree@7`); characters, animals and props keep one identity across shots | `studio/instrument.js` wraps the functions; `build_studio.py` scans every frame |
| **Who takes part** in a moment | actors whose drawing parameters change unusually around it, plus whoever makes its sound | the scan (a heuristic) |
| **Action** | one actor's part in one moment: its sounds, a note, references | |
| **Sound** | one `put(…)` in `tools/sfx_track.py`, rendered on its own with its share of the room | `build_studio.py` runs `sfx_track.py` with a log |
| **Skeleton** | the rig's joints: hip, knees, ankles, chest, elbows, hands, head, umbrella tip | `skeleton()` in `studio/instrument.js`, from each rig's own `measure` pass |

## The kinds of change

A change is a small JSON object. The brief describes each one in words, with the file and line to edit.

| kind | made by | means |
|---|---|---|
| `key` | dragging a joint, the actor, its rotate or scale handle, a setting | on this frame, offset this actor's pose: `dx`, `dy` (metres, y up), `rot` (radians), `sc`, `d` (numbers added to the rig's pose or the function's options, e.g. `legs.0.th`, `arms.L.el`, `umb.ang`), `set` (a value replaced, e.g. `o.pose: "sit"`), `hide`. One key is an accent that fades over 8 frames; several on one actor hold and blend between them. |
| `timing` | dragging a moment's diamond, or ±1f | move a moment in `timeline.json` (`from` → `to`, seconds into the shot) |
| `sound` | the sound panel | `gain` dB, `pan`, `shift` ms, `mute`, `mask` (a painted 64 × 40 time × log-frequency grid: `g` gain in dB, `a` added noise 0-255), `replace` (an uploaded recording to imitate) |
| `newsound` | placing an uploaded sound | add a sound like the recording at this time |
| `note` | any Note box | what should be different, on the film, a shot, a moment, an action, an actor or a sound |
| `draw` | the pen | strokes over a frame (1920 × 1080 pixels); the saved file includes the frame with the drawing |
| `ref` | References, drop or paste | an image or a sound attached to any of the above |

## Applying a brief (for agents)

1. Check out the checkpoint named at the top of the brief, or compare it with `HEAD` and adapt if the film has moved on.
2. Work shot by shot. For each change: find the code (`timeline.py --shot N` shows what hangs on each moment), make the change as real animation or sound, keeping the rules in `AGENTS.md`, and preview it.
3. Notes are the intent; poses and drawings are sketches of it. When a pose would break a rule (a hand through the body, the umbrella in the wrong hand), keep the intent and fix the drawing.
4. Rebuild the sound if timing or movement changed, re-render the shots, rebuild the studio, and say which changes you made, which you adapted and why.

The published studio also keeps its changes in the page's own database (collection `changes`, one document per change, big uploads split into collection `blobs`), so an agent with access to the page can read them there instead of from a pasted brief.

## How it works

- `studio/instrument.js` wraps every drawing function listed in its `CAT` table. A top-level call on the frame's canvas becomes an actor; nested calls (a hat drawn by a person) belong to their parent. With no changes the picture is pixel-identical to the film. To make a new function an actor, add it to `CAT` (and to `NICE` in `tools/build_studio.py` for its name).
- Picking reads one pixel before and after each actor draws; the viewer cuts the actor out the same way.
- `studio/app.js` is the interface, `studio/audio.js` the sound (Opus sprite, preview mix, STFT editing), `studio/store.js` where changes are kept (this browser, and the page's database when published).
- `tools/build_studio.py` assembles `studio/index.html` with the film, the scan, the sounds and the audio sprite into one file.
