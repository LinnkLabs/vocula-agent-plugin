---
name: vocula-soundtrack
description: One finished recording with the voices, the sound effects and the music made together — an audio story, an ad spot, a podcast intro, a bed-and-voice piece for a silent animation. Load for "make the whole soundtrack", "voices and music together", "an audio drama", "a 30-second spot with a jingle". Routed from the vocula skill.
---

# vocula-soundtrack

This is Vocula's signature: the sound is produced as a whole, not assembled. You give lines and a
direction; one master comes back, mixed and at publishing loudness (−16 LUFS, −1.5 dBTP).

## Write it

`script.md`: one paragraph per line, `Who: text`; blank lines separate parts (a part is 45–90
seconds of speech). Sound cues are written inline where they happen: `[an oven door, soft]`,
`[rain, steady, under everything]`. The `--direction` is atmosphere and music in under about 80
words: "a small bakery at dawn, warm, a little jingle at the end, no drums". A direction is not a
timeline; place cues next to the words they belong to, not at timecodes.

## Run it

```
npx vocula@latest soundtrack --script script.md --direction "…" --out sound/
```

Returns `master.wav`, one file per part, `captions.srt`, `result.json`. No separate stems in this
version: when the user's renderer needs its own music and effects lanes, use `vocula-voiceover`
(voice only) instead and let the renderer carry the rest.

## When to use which

| Need | Skill |
| --- | --- |
| The renderer owns music and effects; it needs a clean voice | `vocula-voiceover` |
| The piece is audio, or the picture is silent and the sound should carry it | `vocula-soundtrack` |
| The video has its own sound that must stay | `vocula-voice-the-video` |

## Tell the creator

Describe what they will hear: "A warm narrator, the oven door after 'fresh every morning', a light
jingle under the last line; 32 seconds." Every nuance is theirs to change: a word, a sound, the
music; say so and give `open_url` once.
