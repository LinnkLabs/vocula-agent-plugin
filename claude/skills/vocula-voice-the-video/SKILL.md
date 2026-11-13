---
name: vocula-voice-the-video
description: Put narration over an existing video — a finished cut, a screen recording, a vlog, raw clips — fitted into its free stretches, on the cut's own clock, the video's own sound kept; delivered as a 48 kHz narration WAV, SRT, markers (CSV + EDL), FCP7 XML when clips were cut to the words, and optionally the video with the mixed sound. Load for "voice over this video", "narrate my demo recording", "add a VO to the cut". Routed from the vocula skill.
---

# vocula-voice-the-video

Vocula looks at the frames and the sound of the video, lays each line into a stretch where nobody is
talking, records it, re-lays it on what was really said, and delivers everything on the video's clock.
The video's own sound is never replaced or removed.

## Two cuts

- `--cut as_is` (default): one video that stays as it is; the lines go into its free stretches.
  Product clips, demo recordings, vlogs, anything already edited.
- `--cut sound_first`: several clips (or one long one); the words come first and the picture is cut
  from the clips to cover them. Montages, explainers from raw footage. Returns `cut.xml` and one
  narration track per clip.

When it is not obvious, ask one question: "Keep the clip as it is and fit the words into it, or cut
the clips to the words?"

## Run it

```
npx vocula@latest fit --video cut.mp4 --lines lines.json --cut as_is --with-video --out vo/
npx vocula@latest fit --video a.mp4 --video b.mp4 --lines lines.json --cut sound_first --out vo/
```

Write lines short: a stretch's seconds times about 2.2 words a second; a read always runs longer
than it looks. A line with a `slot {at_s, until_s}` is pinned there; otherwise Vocula chooses the
stretch. Videos up to 500 MB, uploaded in parts by the CLI.

## Read the result

Each line comes back with `slot {at_s, until_s, over_s, short}`. `over_s > 0` means the read could
not be made to fit without changing the words: tell the creator which line and offer the two ways out,
shorten the words (only if they say so) or let it spill into the next shot. Never speed the audio up.

Files: `narration.wav` (48 kHz, starts at 0:00 of the video), `captions.srt`, `markers.csv` and
`markers.edl` (DaVinci Resolve imports the EDL as timeline markers), `cut.xml` for `sound_first`,
`with-picture.mp4` when `--with-video` (original video stream copied, never re-encoded).

## The mixed project

If one clip already carries the creator's own voice, leave that clip out of `--video` and only fit
the clips that need narration. For the new lines in their own voice, see `vocula-voices`.

## Tell the creator

"The narration sits at 0:00–0:12 and 0:14–0:31; the clip keeps its own sound. Drop `narration.wav`
on a new track at zero, or use the video with the sound already on it." Give `open_url` once.
