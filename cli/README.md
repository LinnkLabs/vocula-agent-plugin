# vocula

The voice track for the video your agent is building. One command returns voice files with every
word's timing, captions and placement, in the shapes HyperFrames and Remotion read; narration fitted
to a cut; or a whole soundtrack. Zero dependencies, Node 18+.

```
npx vocula@latest voices --language en
npx vocula@latest voiceover --lines lines.json --voice dacey-en-us --for hyperframes --out vocula/
npx vocula@latest fit --video cut.mp4 --lines lines.json --with-video --out vocula/
npx vocula@latest soundtrack --script script.md --direction "a bakery at dawn, warm" --out vocula/
npx vocula@latest voice add --from clip.mp4 --own --consent "This is my own voice"
npx vocula@latest quote --lines lines.json · quota · login · status <job_id> --wait · open <job_id> · commands
```

One JSON object on stdout; progress and links on stderr. A wall (`status: "wall"`) exits 0 and says
what to do next; nothing was made or charged when it fired before work. No key to paste: the first
making command prints a link, the creator connects the agent, the same command runs again.

Full description for agents and people: https://vocula.ai/agents (plain text: https://vocula.ai/agents.md).
