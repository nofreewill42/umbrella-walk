# The Umbrella Walk

![A frame from the taxi shot](docs/poster.jpg)

A 76-second 2D cartoon: a man in a long black coat walks through the city with a closed umbrella and a coffee, and quietly fixes everyone's little disasters on the way. Every frame is drawn by code, and there are no image or video assets. You render the film yourself with one command.

- 1920×1080, 24 fps, 1,839 frames, 19 shots
- Plain JavaScript drawing on an HTML canvas, rendered by headless Chromium and encoded by ffmpeg
- Every cut sits on the beat of the soundtrack (see [Sound](#sound))

## Render it

You need **Python 3.9+**, **ffmpeg** and a few minutes.

```bash
pip install -r requirements.txt
python3 -m playwright install chromium
python3 tools/render_film.py
```

The film lands in `out/umbrella_walk.mp4`. It takes 2–3 minutes on an ordinary laptop (it renders several shots at once; `--workers N` sets how many).

Installing ffmpeg: `brew install ffmpeg` (macOS), `sudo apt install ffmpeg` (Ubuntu/Debian) or `winget install ffmpeg` (Windows).

### With a coding agent

Open the folder in Claude Code or Codex and ask:

> Read AGENTS.md, then render the film.

Both tools read [`AGENTS.md`](AGENTS.md) (Claude Code through `CLAUDE.md`). It tells the agent how to set up, preview, change and re-render the film.

### Without installing anything

Fork the repo on GitHub, open the **Actions** tab, choose **Render film** and click **Run workflow**. After a few minutes the MP4 appears under **Artifacts** on the finished run. The workflow also runs on every push to `main` that touches the film.

## Look before you render

`tools/preview.py` draws stills straight from the code in a few seconds, with no video encoding:

```bash
python3 tools/preview.py --shot 6 --every 0.25          # shot 6, every quarter second
python3 tools/preview.py --shot 9 --at 1.9 2.2 2.9      # shot 9 at those seconds
```

The contact sheet goes to `out/preview.jpg`. To re-render only what you changed, run `python3 tools/render_film.py --shots 6 9`. Each shot goes into its own file under `out/shots/`.

## The shots

| # | Shot | What happens |
|---|------|--------------|
| 1 | Top hat | A gust takes a gentleman's hat; he catches it on the umbrella tip, spins it and flicks it back onto his head. |
| 2 | Scooter | A kid on a scooter, eyes on his phone, heads for a lamppost; one tap on the handlebar and he curves round it at full speed. |
| 3 | Postman | A dog barks through the letterbox and the postman's letters fly; the tip juggles them into the slot, one, two, three. |
| 4 | Pigeon | A pigeon's dropping falls for his head; he taps it into a planter, and some of it stays on the tip. |
| 5 | Flowerpot | The dirty tip saves a falling pot (leaving a smear on it); the pigeon poops on a man reading on a bench, and gets it flicked straight back. |
| 6 | Butcher | He wipes the tip clean on his own trouser leg; a bulldog steals a chain of sausages; one chop, one snip, and the falling sausage ends up skewered on the tip. |
| 7 | Cat | The sausage on the tip coaxes a cat out of a tree and into a girl's hands. |
| 8 | Pond | Snapping the umbrella open is the gust that fills a becalmed toy boat's sails. |
| 9 | Wet concrete | He hooks the crook over a scaffold rail and glides over the fresh concrete, knees up, coffee level. |
| 10 | Ice cream | A dropped cone and two gold coins flicked into the tip jar. |
| 11 | Painter | He flicks a painter's lost glasses back onto his nose. |
| 12 | Van | He taps a sliding box back into the van and slides its door shut. |
| 13 | Handbag | A stolen bag catches on the level shaft and slides back to its owner. |
| 14 | Taxi | The open umbrella takes a taxi's puddle splash for two women, and the run-off rinses his trousers clean. |
| 15 | Raindrop | The first drop of rain lands in his coffee's sip hole. |
| 16 | Face | A drop on the cheek, a look up, a smile. |
| 17 | Stance | The rain comes on; his fencer's lunge pops a woman's stuck umbrella open. |
| 18 | Exit | He finally opens his own umbrella and walks off. |
| 19 | Last word | The pigeon picks the wrong target: the cat. |

## Sound

The cuts are timed to a specific piece of music, and **the music is not in this repository**: it came from the video this film remakes, and it isn't ours to share. If you have a soundtrack you are allowed to use, save it as `audio/soundtrack.wav` (or `.mp3`, `.m4a`, `.flac`, `.ogg`) and the render muxes it in. Without it the film renders silent. `audio/beats.json` lists the beat times the cuts were aligned to, and `audio/cuts.json` lists the cuts themselves.

For a free stand-in, `python3 tools/guide_track.py` synthesises `audio/guide.wav`: a rough jazz sketch at the same tempo, with stops and hits on the picture's big moments (the chop, the umbrella snap, the taxi splash, the first raindrop, the pounce). Render with it using `python3 tools/render_film.py --audio audio/guide.wav`. It also works as an audio reference for a music generator, so a new score keeps the same structure.

`python3 tools/sfx_track.py` synthesises the sound effects and ambience into `audio/sfx.wav`, and mixes them under the guide track into `audio/guide_sfx.wav` (`--music FILE.wav` mixes them under your own music instead). There are no samples: every sound is a small physical model, so the whole track is free to use.

- **Voices** (`tools/sfxanimals.py`): a glottal pulse source with jitter, shimmer and breath, filtered by a cat-, dog-, pigeon- or child-sized vocal tract. The purr is the cat's larynx buzzing at ~24 Hz on the out-breath and a little faster on the in-breath.
- **Everything else** (`tools/sfxworld.py`): rain as tens of thousands of tiny impacts plus bubbles in puddles; splashes and drips from Minnaert bubble resonances; the scaffold rail's clang from the bending modes of a steel tube; a coin and a glass jar from disc and bell modes; scrapes as stick-slip friction; the van as diesel firing pulses (with a slightly uneven cylinder) through an exhaust, and a starter motor that labours on each compression; the taxi as a moving source with real travel-time delay (so the Doppler shift is physical), 1/r loudness and air absorption; distant thunder as the N-waves from a kilometres-long crooked lightning channel; a tower bell with its hum, prime, minor-third tierce and nominal.
- **Footsteps come from the drawings.** `python3 tools/probe_motion.py` runs the film, watches every character's feet and writes each moment a foot lands to `audio/steps.json`, with where it is on screen and how hard it came down. Re-run it after changing a walk.
- **Rooms.** Each shot has an acoustic space (street, park, embankment, building site, close-up) with its own reverb, and a distance cue dulls and wets far-off sounds.

The generators' default parameters were tuned by an automatic listener: an AudioSet sound classifier (CED-mini, run with sherpa-onnx) scored thousands of variations of each sound, and the search kept what it heard as a meow, a purr, rain, a clang, a car and so on, and penalised anything it heard as music or a synthesizer. For a few sounds the classifier also picked the best of several takes (the `seed`s you'll see in `sfx_track.py`). No one listened with human ears while tuning, so trust yours: every level and timing is a plain number in `tools/sfx_track.py`.

## How it's built

```
src/        the film (plain JS, concatenated in this order by tools/build.py)
  core.js     math, easing, keyframes, camera, drawing helpers, shot registry
  hero.js     the hero: side, front and back rigs, umbrella, coffee, arm IK
  cast.js     the other characters (people, dog, cat, pigeon)
  props.js    objects: top hat, sausages, sailboat, pots, van, ...
  lib.js      sets and shared pieces: streets, bystanders, wind, rain
  s1.js       shots 1-5
  s2.js       shots 6-10
  s3.js       shots 11-19
  main.js     the timeline: renderFrame(ctx, t)
audio/      cuts.json (shot boundaries, the one source of timing), beats.json, steps.json (footfalls)
tools/      build.py, preview.py, render_film.py, render_segment.py
            guide_track.py, sfx_track.py (the sound), sfxdsp.py, sfxanimals.py, sfxworld.py (the sound models),
            probe_motion.py (finds the footfalls in the picture)
```

`dist/` (the built script) and `out/` (stills and videos) are generated and not committed.
