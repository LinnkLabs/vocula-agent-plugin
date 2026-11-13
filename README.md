# Vocula for coding agents

The voice track for the video your agent is building. One command returns per-line audio files with
word timings, captions and placement, in the shapes HyperFrames and Remotion already consume; fitted to a
cut when you give one; in the creator's own voice when they want it; or a whole soundtrack (voices, sound
effects and music together) when the piece is audio. Files and timing in; placing them is the agent's.
The creator stays in charge: every job is a piece in their Vocula account.

## Install

Claude Code:

```
claude plugin marketplace add LinnkLabs/vocula-agent-plugin
claude plugin install vocula@vocula
```

Any agent (Codex, Cursor, …):

```
npx skills add LinnkLabs/vocula-agent-plugin
```

No API key to paste. The first generating command answers with a link to connect the agent to a Vocula
account; browsing voices and pricing a job need no account at all. The CLI the skills drive is
`npx vocula@latest`. Plain-text description for agents: https://vocula.ai/agents.md

## Skills

| Skill | For |
| --- | --- |
| `vocula` | what Vocula does, the four rules, which skill to load, the mixed project |
| `vocula-voiceover` | lines in → per-line WAVs, words, captions, placement out; HyperFrames and Remotion steps |
| `vocula-voice-the-video` | a finished cut or raw clips in → narration fitted to the picture, on its clock, with markers |
| `vocula-soundtrack` | voices, sound effects and music in one finished recording |
| `vocula-voices` | choosing a voice, the creator's own voice from a clip, consent |
| `vocula-walls` | sign-in and minutes walls, failures, what to tell the user |

## Layout

`.claude-plugin/marketplace.json` names the marketplace (`vocula`) and its one plugin (`vocula`, source
`./claude`); `claude/.claude-plugin/plugin.json` is the plugin; `claude/skills/*/SKILL.md` are the skills,
which `npx skills add` picks up as they are. `cli/` is the source of the `vocula` package on npm: one file,
no dependencies, Node 18+.

MIT licensed. Issues: https://github.com/LinnkLabs/vocula-agent-plugin/issues
