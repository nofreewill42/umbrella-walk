# The music: the guide score, your own score, and keeping it in time

The film was cut to a piece of music that is **not** in this repository (it came from the video this film remakes, and it isn't ours to share). What *is* here is everything you need to put any music under it:

- the beat grid the cuts sit on (`audio/beats.json`),
- the moments the music should hit (`timeline.json`, shown by `python3 tools/timeline.py`),
- a synthesised guide score that does all of that (`tools/guide_track.py` → `audio/guide.wav`),
- a tool that fits the cuts to the beats of new music (`tools/fit_music.py`),
- and the effects track, which can be mixed under any music (`tools/sfx_track.py --music`).

## The timing contract

- **Cuts land on the beat.** Every cut sits one frame before a beat, so the new shot starts on it. The beats are in `audio/beats.json` (about 118-120 per minute; they drift a little, like a real band's). A beat is about 12 frames.
- **Hits land on moments.** The music accents the gags' key moments: the gust, the WOOF, the chop and the snip, the umbrella snapping open, the crook hooking the rail, the door slam, the taxi splash (the biggest hit), and then **a hard stop on the cut to the raindrop close-up** (shot 15): silence, one note per drop, and the band comes back with the rain in shot 17. The pigeon's last word (shot 19) is a tiptoe, a plop, the pounce and a button.
- The guide score's structure, by shot:

| Section | Shots | Feel |
|---|---|---|
| A | 1-5 | dry and breezy: snaps and walking bass, a muted trumpet motif |
| B1 | 6 | the sausage caper: a D minor ostinato, stabs on the chop and the snip |
| B2 | 7 | the cat: soft vibes arpeggios and brushes |
| C | 8-13 | the good deeds: the full swinging combo, vibes melody |
| D | 14 | the taxi: a chromatic build, the big hit on the splash, then a hard stop |
| E | 15-16 | the first drop: silence, a celesta note for each drop, a soft chord |
| F | 17-18 | the rain: big band, stabs, full drums, the motif in brass |
| G | 19 | last word: tiptoe pizzicato, a plop, the pounce, a button |

## The guide score

`python3 tools/guide_track.py` writes `audio/guide.wav`. It's a sketch built from simple synthesised instruments (`bass`, `keys`, `vibes`, `celesta`, `horn`, `trumpet`, `pizz`, drums), written as a score in plain Python: `bt(k)` is the time of beat k, and the hits hang on the timeline's moments, so they move with the picture:

```python
horn(['D3', 'F3', 'A3', 'C#4'], M(6, 'T_C1'), .14, .42, 3000)    # the chop
hit = M(14, 'T_BREAK')                                            # the big hit: the water breaks on the canopy
```

Change notes, chords (`walk([...])`) and instruments there. It's meant as a temp track and as a reference for a real score, not as the score.

## Bringing your own music

1. **Make or find the music.** With a music generator such as Suno, give it `audio/guide.wav` as the audio reference, so the new piece keeps the tempo, the structure and the stops. Describe the style per section (the table above), ask for an instrumental, about 77 seconds. Use music you have the rights to (read your plan's terms for generated music).
2. **Fit the cuts to it**, unless it follows the guide's beat exactly:

   ```bash
   python3 tools/fit_music.py my_score.wav            # shows how each cut would move
   python3 tools/fit_music.py my_score.wav --write    # writes audio/beats.json and the cuts into timeline.json
   ```

   Each cut moves to one frame before the nearest beat of the new music (a few frames at most), and the named moments stay where they are inside their shots. If the detector gets the tempo wrong (it prints what it found), give it `--bpm` and `--first` (the first beat, in seconds). Preview any shot it marks as shorter.
3. **Rebuild the effects under it and render:**

   ```bash
   python3 tools/probe_motion.py                     # only if cuts moved
   python3 tools/sfx_track.py --music my_score.wav   # -> audio/my_score_sfx.wav
   python3 tools/render_film.py --audio audio/my_score_sfx.wav
   ```

   Or save it as `audio/soundtrack.wav` and `render_film.py` uses it on its own (music only, no effects). Music files are not committed (`.gitignore`).

The mix of music and effects is at the bottom of `tools/sfx_track.py` (music ×0.55, effects ×1.25). If your music is dense where a gag needs to read, it's usually better to thin the music at that moment than to push the effect up.

## If the music should change the film

If a new score wants a shot longer or shorter than a few frames, change the shot rather than stretching it: move `to` in `timeline.json` (and the next shot's `from`) to one frame before the beat you want, then look at the shot. Anything keyed after the new end is lost, and a shot made longer holds its last pose, so re-time its moments to fill the new length (`python3 tools/timeline.py --shot N` lists them). Then rebuild the sound.
