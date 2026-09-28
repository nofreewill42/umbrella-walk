# The sound: what makes a noise in this film, and how

There are no recordings anywhere in this project. Every sound effect is computed by a small physical model: a cat's voice from a pulsing larynx and a cat-sized throat, rain from tens of thousands of tiny impacts, a clang from the ringing modes of a steel tube. It is all free to use, it can be changed with a number, and it stays in sync with the picture because it is placed on the same named moments the drawing uses.

## What gets a sound, and why

The film's first rule is *cause and consequence you can see*, and the sound follows it: **nothing is heard that you can't see a cause for, and every visible contact makes a sound.** In practice:

| Gets a sound | Examples | Why |
|---|---|---|
| Contacts: something hits, catches, scrapes or snaps | the hat landing on the tip, letters flicked, the crook hooking the rail, the pot caught, coins in the jar, the door slam | these are the gags' punchlines; the contact is the loudest thing in its moment |
| Animal voices | meow, hiss, purr, bark, growl, coo, squawk | characters without words speak through them |
| Fast movement through air | the toss, the lunge, the flick, the pounce | only fast moves: a slow move with a whoosh feels fake |
| Feet | every footfall of every walking character | measured from the drawings, so they're always in sync |
| Water, weather | puddle splash, drips, drops on the lid, rain, thunder, gusts | the last act is about rain |
| Machines | the van (starter, idle, pulling away), the taxi (pass-by with Doppler), the scooter's wheels | |
| The hero's sip | a quiet slurp every time the cup reaches his mouth | a running character beat |
| The place | distant traffic in the street, birds and leaves in the park, the river at the embankment, rain | tells you where you are; always quiet |

What doesn't: looks, expressions, slow reaches, the camera (except one push-in), and there are no words. Apart from sips, sniffs and footsteps, the only human sounds are the kids' cheer and the bystander's claps.

Two effects are *story* sounds: the distant thunder when he looks up at the sky (it motivates the downpour in the next shot) and the clock tower striking as the painter finishes painting its face.

## How it's made

```
timeline.json ──► sfx_track.py ──► audio/sfx.wav (effects and ambience)
audio/steps.json ─┘      │
  ▲                      └──mixed with──► audio/guide.wav ──► audio/guide_sfx.wav
probe_motion.py (runs the film and finds every footfall)
```

`tools/sfx_track.py` is the whole sound design as a readable script, top to bottom:

1. **Spaces.** `SPACES` defines the acoustic spaces (street, site, park, embankment, close); `space` in `timeline.json` says which one each shot is in. Every sound is sent to its shot's reverb.
2. **Ambience beds**, shot by shot: `bed(first_shot, next_shot, generator, L)`.
3. **Footsteps**, one per footfall in `audio/steps.json`, with a shoe for each character (`SHOES`: leather for the hero, heavy for the butcher, trainers for the thief, small heels for the lady, light steps for the children), panned to where the foot is on screen, as loud as the character is close, wet in the rain.
4. **Events**, grouped by shot (`# 6 Butcher`…), one `put(…)` per sound.
5. The room reverb is added, and the track is normalised to peak at -6 dBFS and mixed under the music.

A typical line:

```python
put(W.clang(seed=1015), M(9, 'T_HOOK'), -22, -.2)      # the crook hooks the rail
#   the sound model     when             L    pan
```

- **When:** `M(9, 'T_HOOK')` is shot 9's moment `T_HOOK` from `timeline.json` (the same one the drawing uses), `M(9, 'T_TOSS', 1)` the second value of a moment that's a list, `+ .05` nudges it. `T(9, 1.7)` is a plain time in shot 9 for sounds not tied to a moment.
- **L:** a loudness target in dB (the loudest 100 ms, roughly as the ear weighs it), not a gain, so a click and a rumble at the same L sound about equally loud.
- **pan:** -1 left to 1 right, from where the cause is on screen. **far** (0..1) dulls and wets a distant sound.
- **seed:** `seed=S()` gives each sound its own variation. `seed=1015` is a *chosen take*: of several variations, the one the machine ear recognised best.

Other helpers: `sip(t)` for the slurps, `tick(t, L, pan, f)` for small hard taps, `patter(t0, t1, L, pan)` for rain drumming on something.

### Levels

| L (dB) | What sits there |
|---|---|
| -15 to -19 | the big hits: the taxi splash, the car, the chop, the bark |
| -20 to -26 | contacts and voices: umbrella snaps, the clang, the door, meow, growl, squawk, the kids |
| -27 to -34 | smaller actions: whooshes, coins, flicks, taps, coos, splats |
| -35 to -41 | Foley: sips, footsteps, licks, cloth |
| -42 to -52 | ambience beds |

## The sound models

Voices are in `tools/sfxanimals.py`, everything else in `tools/sfxworld.py`, the shared building blocks in `tools/sfxdsp.py`. Every model is a function that takes its physical settings and a `seed` and returns the samples. `python3 tools/sound_lab.py --list` prints them all with their settings.

| Model | The physics | Used for |
|---|---|---|
| `meow`, `bark`/`bark2`, `growl`, `squawk` | a glottal pulse source (with jitter, shimmer, breath, period-doubling roughness) through a vocal tract of formant resonators that open and close over time | the cat, the dogs, the pigeon |
| `purr` | the cat's larynx buzzing ~24 times a second, alternating out-breath and a quieter, faster in-breath | the cat in the girl's hands |
| `hiss` | turbulent air through a cat-sized mouth | the startled cat |
| `coo` | a pigeon's two soft, nearly pure notes, the second trilled | the pigeon |
| `takeoff` | wings clapping at the top of the stroke, a swell of air on each downstroke, feather whistle | pigeons flying |
| `voice_yay`, `kids_cheer` | a child's voice gliding through "y-e-i" | the pond kids |
| `rain`, `canopy`, `drip`, `lid_tap`, `splash`, `splat`, `plop` | countless tiny impacts; air bubbles ringing at their Minnaert pitch (the "plink" of water); a membrane knocked by drops; a mass of water slapping, churning and falling back as spray | weather, puddles, droppings, ice cream |
| `thunder` | N-waves from every kink of a kilometres-long lightning channel arriving over seconds, with the air removing the highs | the storm coming |
| `wind`, `leaves`, `traffic`, `birdsong` | turbulence following a gust's speed; leaves ticking; a distant city; a songbird's phrase | ambience |
| `footstep`, `walk` | heel click, ground thud, the heel block's knock, the sole slap, grit; optional wet squelch | all footsteps |
| `clap`, `claps` | air squeezed from between the palms ringing their cavity | the bystander |
| `slurp`, `sniffs`, `lap` | air drawn in over liquid with bubbles; air through the nose; a tongue's wet click | sips, sniffing, licking |
| `clang`, `rail_slide`, `letterbox` | bending modes of a steel bar or tube; stick-slip friction exciting those modes; a sprung brass flap and its rattle | the scaffold rail, the snip, the letterbox |
| `glass_clink`, `coin_in_jar`, `coin_flick` | glass bell modes, a coin's disc modes, bounces that come sooner and softer | the tip jar |
| `ceramic`, `knock`, `chop`, `squish`, `scrape` | damped terracotta, wood and felt; a cleaver through a sausage into the block; stick-slip dragging | the pot, taps, the butcher |
| `paper`, `rustle`, `whoosh` | a sheet snapping and crackling; cloth and paper; turbulence whose pitch follows speed | letters, clothes, fast moves |
| `umbrella_open`, `umbrella_close` | the catch, the runner rasping along the shaft, the canopy snapping taut with the ribs ticking | the hero's umbrella, the red umbrella |
| `engine`, `engine_start` | diesel firing pulses (one cylinder slightly weak, so it lopes) through an exhaust; a starter motor that labours on each compression | the van |
| `door_slam`, `sliding_door` | air, the panel's thud, the latch, in two stages; rollers along a track | the van |
| `car_pass` | tyres and engine at a moving car, delayed by the travel time of sound (which makes the Doppler shift), 1/r loudness, air absorption, panned by angle | the taxi |
| `scooter` | small hard wheels rumbling and clacking over each paving joint, front then back | the scooter |
| `bell` | a great bell's hum, prime, minor-third tierce, quint and nominal, each a beating pair | the clock tower |

## Recipes

**Change how one moment sounds.** Find its line (`python3 tools/timeline.py --shot N` lists the sounds on each moment), change the model, its settings, `L` or `pan`, then rebuild: `python3 tools/sfx_track.py`.

**Try settings by ear (or by machine ear) first.**

```bash
python3 tools/sound_lab.py meow d=1.1 f0b=700        # -> out/sounds/meow.wav
python3 tools/sound_lab.py growl --takes 5            # five variations in a row
python3 tools/ear.py --model growl --takes 12 --want Growling Dog     # which take reads best
```

**Change every meow (or step, or splash).** Change the default in the model's signature in `sfxanimals.py`/`sfxworld.py`.

**Add a sound for a new event.** Add a moment to the shot in `timeline.json` (and to the shot's `MOMENTS` line if the drawing uses it), then a line in the shot's section of `sfx_track.py`: `put(W.knock(700, seed=S()), M(12, 'T_NEW'), -30, .2)  # what it is`.

**Retime.** Move the moment in `timeline.json`; the drawing, its sounds and its music hit follow. Footsteps follow the feet: after changing a walk, run `python3 tools/probe_motion.py`.

**Change a place.** Edit its entry in `SPACES` (reverb time, early reflections, brightness, how much goes to the reverb), or switch a shot's `space` in `timeline.json`. Beds (the ambience) are near the top of `sfx_track.py`.

**Rebuild everything.** `python3 tools/probe_motion.py && python3 tools/guide_track.py && python3 tools/sfx_track.py`, then `python3 tools/render_film.py --audio audio/guide_sfx.wav`.

## Checking a sound when you can't hear it

`tools/ear.py` is a machine ear: an AudioSet classifier (527 everyday sound classes) that says what it hears.

```bash
python3 tools/ear.py --shot 7 --from 3.4 --to 4.5          # the purr in the film  -> "Purr 0.64, Animal 0.27, Cat 0.25 ..."
python3 tools/ear.py out/sounds/meow.wav --room            # a single sound        -> "Meow 0.93, Cat 0.82"
```

It is good at clean single sounds and gets confused when several overlap. Use it to catch mistakes (anything it calls Music or Synthesizer is a warning sign), not as the final judge.

## How the defaults were chosen

Each model's default settings came out of a search: thousands of variations of each sound were played to the machine ear (in a small room, with a little noise, like a microphone would hear them), and the search kept the settings it recognised best as what they are meant to be (Meow, Purr, Rain, Clang, Car…) while penalising anything it heard as music or a synthesizer. Where it matters, the best of several takes was also chosen (the fixed `seed=`s in `sfx_track.py`).

With the chosen defaults it recognises, out of 1: meow 0.91, purr 0.95, bark 0.78, rain 0.67, the clang 0.8, the coo 0.55, a squawk as a bird 0.7-0.8, the taxi as a vehicle 0.6, the van starting 0.3, the kids as child speech ~0.3. It never learned to recognise footsteps, a car door or the bell well, so those were designed from the physics alone. No human ear has approved the mix yet: if something sounds wrong to you, it probably is.
