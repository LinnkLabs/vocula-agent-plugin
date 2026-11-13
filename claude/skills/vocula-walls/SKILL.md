---
name: vocula-walls
description: What to do when a vocula command comes back as a wall (sign-in, minutes exhausted, paused account), as a partial result (a line failed), or as a real error. Carries the wall JSON, the wording for the creator, and the failure ladder. Load the moment a result is not a clean success. Routed from the vocula skill.
---

# vocula-walls

Two things stop a job, and only one is a problem. A **wall** is the account's state; when it fires
before work, nothing was made and nothing was charged. A **failure** is a bad call or a bad line, and
most of those are yours to fix without the user.

## The wall

```json
{"schema":"v1","status":"wall","wall":"login","reason":"generation_requires_account",
 "next_step":"Making audio needs a Vocula account. Nothing was made and nothing was charged. Open the link, connect this agent to your account, then run the same command again.",
 "action":{"type":"login","url":"https://vocula.ai/link/K7KQ-3FXP"}}
```

| Field | Use |
| --- | --- |
| `wall` | `login` → hand over the link; `limit` → say the limit and what unlocks it |
| `reason` | decides what you say (below); never show the raw string |
| `next_step` | the server's sentence; relay it in the creator's language, add nothing |
| `action.url` | the one link; never edit, shorten or rebuild it (it carries a pairing code, stable ~15 min) |
| `needed_s`, `balance_s` | on `minutes_exhausted`; say them as minutes |

Exit code is 0. A wall never gets "failed" or an apology.

| `reason` | Say |
| --- | --- |
| `generation_requires_account` | "Making the audio needs your Vocula account. Open this link to connect me, then I'll run the same command; nothing is lost." Then run `vocula login` (it waits for them) and retry. |
| `minutes_exhausted` | "This needs about 1 minute 10 seconds and 40 seconds are left. Add minutes on your Vocula page and I'll pick up exactly here." Link `action.url`. Deliver what already succeeded. |
| `account_paused` | Relay `next_step`; the address to write to is in it. |
| `line_too_long` | Split that line at a natural beat yourself and rerun only it. |
| `voice_not_found` | Pick again from `vocula voices`; do not guess handles. |
| `consent_required` | Ask the creator for consent in plain words, then rerun `voice add` with `--consent`. |

In ChatGPT or Codex, never present plans, prices or upgrades; say the limit and give the link to
the minutes page only.

## Partial results

`gate.failed` lists lines that did not come back, with a reason. Keep every delivered file, rerun
the failed ids only, and tell the creator which lines are pending. Never render or ship a composition
missing a line as if it were done: a silent gap is the failure creators notice last and resent most.

## Real errors (exit 1)

| `reason` | Do |
| --- | --- |
| `unknown_argument` | Read `accepts` and fix the call; nothing was sent or charged. |
| `bad_request` | Fix the input (empty text, bad json, missing `--video`). |
| `not_found` | The job belongs to another account or was deleted; create it again. |
| `server` / network | Retry once after a short wait; then tell the creator plainly and keep the files you have. |

Never work around a wall or an error by switching to another provider or by synthesising audio in
code: the creator asked for Vocula's sound; the way through is the link or the fix.
