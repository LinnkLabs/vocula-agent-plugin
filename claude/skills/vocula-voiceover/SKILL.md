---
name: vocula-voiceover
description: Turn a script into per-line voice files with word timings, captions and placement for a code-defined video — HyperFrames (audio_meta.json drop-in), Remotion (voiceover.json + Caption[]), or any renderer. Load for "add a voiceover", "narrate this", "make it talk", "VO for the launch video". Routed from the vocula skill.
---

# vocula-voiceover

## 1. Write the lines

One line = one spoken paragraph by one voice: `[{id, text, who?, note?, slot?|max_s?}]` in
`lines.json`. Use the scene or beat name as `id` (`hook`, `feature-2`, `cta`). `note` is delivery
("warm, a little slower"). Give `max_s` only where the picture is fixed; otherwise let the voice set
the time. Keep each line under about 90 seconds of speech.

Quote first when the script is long: `vocula quote --lines lines.json` → seconds, no spend.

## 2. Run it

```
npx vocula@latest voiceover --lines lines.json --voice dacey-en-us --for hyperframes --out vocula/
npx vocula@latest voiceover --lines lines.json --voice tim-en-us   --for remotion    --out public/vocula/
```

Pick the voice with `vocula-voices` (or `--voice you` for the creator's own). The command blocks and
prints progress on stderr; `--no-wait` returns a job id, `vocula status <id> --wait` resumes.

## 3. Place it — HyperFrames

`--for hyperframes` writes, under `--out`, `audio/<id>.wav` (44.1 kHz mono), `words.json`, `captions.srt`,
`placement.json` and an `audio_meta.json` with `tts_provider:"vocula"`, in the exact shape the
framework's own audio step writes. Then:

1. Register each file: `npx hyperframes media-use resolve --from vocula/audio/<id>.wav`.
2. Place each line on the voice track from `placement.json`:
   `<audio id="vo-<id>" src="vocula/audio/<id>.wav" data-start="<start>" data-duration="<duration_s>" data-volume="1" data-audio-group="voiceover">` — every `<audio>` needs an `id` or it is silent in the render.
3. Retime the picture to the voice (`sync-durations` or the composition's own timing) rather than
   trimming the voice; a clip truncated to its frame's `data-duration` loses the end of a sentence.
4. Let the bed make room: run the carve (`carve.mjs --comp index.html`) so music ducks under the voice.
5. Captions from `words.json` (`[{id,text,start,end}]`, seconds, relative to each file).
6. Before calling it done: the composition has one `<audio>` per delivered line, and the render's
   loudness is not −inf. The result's `gate.delivered` must equal `gate.requested`.

## 4. Place it — Remotion

`--for remotion` writes `voiceover.json` (`{fps, lines:[{id,file,text,startFrame,durationInFrames,audioDelay}]}`)
and `captions.json` (Remotion `Caption[]`, milliseconds). Wrap each line:
`<Sequence from={startFrame}><Audio src={staticFile(file)} /></Sequence>` from `@remotion/media`, and
derive the composition length from the last line (`calculateMetadata`). Feed `captions.json` to
`createTikTokStyleCaptions()` or the `/remotion-captions` flow unchanged.

## 5. Tell the creator

Say what was made in their words: "Three lines voiced by Dacey, 12 seconds in all; the animation now
starts each scene when the voice says the word. 1 minute 48 seconds of your minutes left." Give
`open_url` once: "You can change any word or retake a line here, and I'll pick up the change."
Never show file paths, seconds or engine names unless asked.

## Changes

Change one line → rerun with only that line (same `id`); the job returns the new file and the others
untouched. The creator may also edit in the web app; fetch the job (`vocula status <id>`) to get
their picked takes.
