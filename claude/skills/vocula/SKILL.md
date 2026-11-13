---
name: vocula
description: Read first for any voiceover, narration, voice track, dubbing-free re-voicing, sound effects or soundtrack need in a video or animation the user is building (HyperFrames, Remotion, Claude Motion exports, raw clips, a finished cut). Routes to the vocula-* skills and carries the four rules that keep the user's trust.
---

# vocula

Vocula makes the sound for the thing the user is building. It gives you **files and timing**;
placing them on the timeline is your job. One CLI, `vocula` (`npx vocula@latest …`), one JSON line
on stdout per command, progress and links on stderr.

## The four rules

1. **Try before asking for anything.** Never ask the user for a key or an account first. Run the
   command. `voices`, `quote`, `quota` and `commands` work signed out. The first generating call
   answers with a sign-in link; that is the working outcome, not a failure (`vocula-walls`).
2. **A wall is a step, not an error.** `status:"wall"` exits 0, carries `next_step` (relay it) and
   `action.url` (hand it over unchanged). Nothing was made or charged when it fired before work.
3. **Claim only what the result says.** You cannot hear the audio. Quote `duration_s`, `gate`,
   `loudness` from the result; never estimate a duration from word counts; never say "saved" without
   `saved_to`.
4. **Talk to the creator, not to a developer.** Say minutes, never seconds or credits; say voiceover,
   narration, the voice track; say which line, never a file path, unless they ask. Never name any
   engine, model or vendor: Vocula is the maker of the sound.

## Route by the job

| The user has | Load |
| --- | --- |
| An animation or code-defined video (HyperFrames, Remotion, GSAP capture, Claude Motion MP4) that needs a voice | `vocula-voiceover` |
| A finished cut, a screen recording or raw clips that keep their own sound and need narration | `vocula-voice-the-video` |
| An audio piece: story, ad, podcast intro, with voices + effects + music together | `vocula-soundtrack` |
| To pick a voice, or wants their own voice | `vocula-voices` |
| A wall, an exhausted balance, a failed line | `vocula-walls` |

## The mixed case (common)

A project often mixes clips. Inventory them first:

- A clip that already carries the user's own voice **stays as it is**. Do not re-voice it.
- Only the clips that need a voice get one. If the user wants the new lines in their own voice,
  take it from the clip that has it, with their consent (`vocula-voices` → `vocula voice add --from
  clip.mp4 --own`), then voice the other lines with `--voice you`.
- Word timings for the user's own recorded clip are not Vocula's job; use your transcription tool.

## What comes back, always

Everything lands under `--out` (say `vocula/`): `audio/<line id>.wav` plus the files below. The same
description, written for agents: https://vocula.ai/agents.md

Per line: a WAV, measured `duration_s`, words with start/end. Plus `placement.json`,
`captions.srt`, and for `--for hyperframes` an `audio_meta.json` HyperFrames reads unchanged, for
`--for remotion` a `voiceover.json` and `captions.json`. The result's `gate` says every requested line
was delivered or names the ones that failed: a job never passes silently. `open_url` is the piece in
the Vocula web app, where the creator can change any word or retake any line; fetch the job again to
get what they changed.

## Timing doctrine

Duration-first by default: record at natural pace, then retime the picture to the voice (HyperFrames
`sync-durations`, Remotion `calculateMetadata`). When a line has a slot (`slot` or `max_s`), Vocula
rewrites or retakes until it fits and reports `over_s` when it cannot; it never speeds audio up, and
neither should you.
