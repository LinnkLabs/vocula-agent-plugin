---
name: vocula-voices
description: Choose the voice for a Vocula job, offer samples, keep one voice across scenes, or make the creator's own voice from a clip or a recording with their consent. Load whenever a voice must be chosen, matched or justified. Routed from the vocula skill.
---

# vocula-voices

## The catalogue

`npx vocula@latest voices --language en` → `{voices:[{id, name, language, gender, tone, sample_url, fits}]}`.
Handles look like `dacey-en-us`; `sample_url` is permanent, hand it over for every option you offer.
Offer two or three by `tone` and `fits`, with samples; let the creator pick, then keep that handle for
every line of the project. Changing voices mid-film is the mistake creators complain about most.

Defaults when they do not care: an `explainer` fit for product and tutorial films, `story` for
narrative, `ad` for spots. Match the language of the lines; never read English with a voice listed
for another language.

## The creator's own voice

A clip in the project may already carry the creator talking. Their new lines can be in that voice:

```
npx vocula@latest voice add --from clip1.mp4 --own --consent "This is my own voice"
npx vocula@latest voiceover --lines lines.json --voice you …
```

Rules:
- **Consent is the gate.** Ask before the first `voice add`: "This takes about 20 seconds of your
  voice from clip1 to speak the new lines in your voice. Shall I?" The `--consent` text records their
  answer. For someone else's voice use `--name "Maya"` and the consent must say they have that
  person's permission; without it the call is refused, and that refusal is correct.
- About 20 seconds of clear speech; Vocula picks the talking stretch out of a video. Too short comes
  back as a plain message; try a longer clip.
- The saved voice is `you` (own) or `mine:<id>`; `vocula voice list` shows them, `vocula voice
  remove <id>` deletes.

## Pronunciation

A brand or a name read wrong is the first thing a creator hears. Put `pronunciations:[{word, say}]`
in the job (CLI: `--say "Vocula=VOH-kyoo-luh"`) before the first render, not after.
