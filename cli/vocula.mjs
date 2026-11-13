#!/usr/bin/env node
// vocula — the voice track for the video your agent is building. Zero dependencies, Node 18+.
// One JSON object on stdout per command; progress, links and notices on stderr. A wall
// (status "wall") exits 0: it is a step, not an error. Exit 1 only for bad arguments, a network
// failure, a non-JSON answer or an unknown command. The CLI decides nothing: walls, quotas and
// limits are the server's, passed through as they came.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { spawn } from "node:child_process";

const VERSION = "0.1.0";
const BASE = (process.env.VOCULA_BASE_URL || "https://vocula.ai").replace(/\/+$/, "");
const HOME = process.env.VOCULA_HOME || path.join(os.homedir(), ".vocula"); // VOCULA_HOME: the config folder itself
const CONFIG = path.join(HOME, "config.json"), PENDING = path.join(HOME, "pending.json");
const PART_BYTES = 90 * 1024 * 1024; // a video travels in parts under the edge's body ceiling
const say = (s) => process.stderr.write(`${s}\n`);
const out = (obj, code = 0) => { process.stdout.write(`${JSON.stringify(obj)}\n`); process.exit(code); };
const fail = (reason, message, extra = {}) => out({ schema: "v1", status: "error", reason, message, ...extra }, 1);

/* ---------------- arguments ---------------- */

const SPEC = {
  voices: { flags: { language: 1, gender: 1, mine: 0 } },
  voiceover: { flags: { lines: 1, script: 1, text: 1, voice: 1, for: 1, fps: 1, rate: 1, title: 1, say: "many", language: 1, out: 1, "no-wait": 0 } },
  fit: { flags: { lines: 1, script: 1, text: 1, voice: 1, video: "many", cut: 1, "with-video": 0, for: 1, fps: 1, rate: 1, title: 1, say: "many", language: 1, out: 1, "no-wait": 0 } },
  soundtrack: { flags: { lines: 1, script: 1, text: 1, voice: 1, direction: 1, title: 1, say: "many", language: 1, out: 1, "no-wait": 0 } },
  "voice add": { flags: { from: 1, own: 0, name: 1, consent: 1 } },
  "voice list": { flags: {} },
  "voice remove": { flags: {}, positional: 1 },
  quote: { flags: { lines: 1, script: 1, text: 1 } },
  quota: { flags: {} },
  login: { flags: { open: 0, timeout: 1 } },
  status: { flags: { wait: 0, out: 1, timeout: 1 }, positional: 1 },
  open: { flags: {}, positional: 1 },
  commands: { flags: {} },
  version: { flags: {} },
};
function parse(argv) {
  const words = [...argv];
  let cmd = words.shift() ?? "";
  if (cmd === "voice" && SPEC[`voice ${words[0]}`]) cmd = `voice ${words.shift()}`;
  if (cmd === "--version" || cmd === "-v") cmd = "version";
  if (cmd === "--help" || cmd === "-h" || cmd === "help" || !cmd) cmd = "commands";
  const spec = SPEC[cmd];
  if (!spec) return { error: { reason: "unknown_command", message: `No command "${cmd}".`, accepts: Object.keys(SPEC).filter((k) => k !== "version") } };
  const flags = {}, positional = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (!w.startsWith("--")) { positional.push(w); continue; }
    let [name, value] = w.slice(2).split(/=(.*)/s);
    const kind = spec.flags[name];
    if (kind === undefined) return { error: { reason: "unknown_argument", message: `"${w}" is not a flag of ${cmd}. Nothing was sent.`, accepts: Object.keys(spec.flags).map((f) => `--${f}`) } };
    if (kind === 0) { flags[name] = true; continue; }
    if (value === undefined) { value = words[++i]; if (value === undefined || value.startsWith("--")) return { error: { reason: "unknown_argument", message: `--${name} needs a value.`, accepts: Object.keys(spec.flags).map((f) => `--${f}`) } }; }
    if (kind === "many") (flags[name] ??= []).push(value); else flags[name] = value;
  }
  if (spec.positional && positional.length < spec.positional) return { error: { reason: "unknown_argument", message: `${cmd} needs ${spec.positional === 1 ? "one argument" : `${spec.positional} arguments`}.`, accepts: [] } };
  return { cmd, flags, positional };
}

/* ---------------- identity ---------------- */

const readJson = (f, d = null) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return d; } };
const writeJson = (f, v) => { fs.mkdirSync(HOME, { recursive: true, mode: 0o700 }); fs.writeFileSync(f, JSON.stringify(v, null, 2), { mode: 0o600 }); };
const config = () => readJson(CONFIG, {});
const keyOf = () => process.env.VOCULA_API_KEY || config().key || null;
const agentName = () => process.env.VOCULA_AGENT || (process.env.CLAUDECODE ? "claude-code" : Object.keys(process.env).some((k) => k.startsWith("CODEX_")) ? "codex" : process.env.CURSOR_TRACE_ID ? "cursor" : "unknown");
const headers = (extra = {}) => ({ "user-agent": `vocula-cli/${VERSION}`, "x-vocula-agent": agentName(), "x-vocula-device": os.hostname().slice(0, 60), ...(keyOf() ? { authorization: `Bearer ${keyOf()}` } : {}), ...extra });

async function call(method, route, { body, raw, timeout = 130_000 } = {}) {
  let res;
  try { res = await fetch(`${BASE}${route}`, { method, headers: headers(raw ? {} : body ? { "content-type": "application/json" } : {}), body: raw ?? (body ? JSON.stringify(body) : undefined), signal: AbortSignal.timeout(timeout), ...(raw ? { duplex: "half" } : {}) }); }
  catch (e) { return fail("network", `Vocula couldn't be reached (${e?.cause?.code ?? e?.name ?? e?.message}). Check the connection and try the same command again.`); }
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { return fail("server", `Vocula answered ${res.status} without JSON. Try again in a moment.`); }
  if (json.status === "wall") {
    if (json.reason === "generation_requires_account") {
      if (json.pairing?.code) writeJson(PENDING, { code: json.pairing.code, url: json.action?.url, poll_url: json.pairing.poll_url, interval: json.pairing.interval ?? 3, expires_at: Date.now() + (json.pairing.expires_in ?? 900) * 1000 });
      if (keyOf() && !process.env.VOCULA_API_KEY) { const c = config(); delete c.key; writeJson(CONFIG, c); } // a dead key is forgotten, never retried
      say(`${json.next_step}\n→ ${json.action?.url ?? ""}\n(then: vocula login — it waits for the confirmation, or just run the same command again)`);
    } else say(json.next_step ?? "");
  }
  return { res, json };
}

/* ---------------- the words ---------------- */

function linesFrom(flags) {
  if (flags.lines) {
    const v = readJson(path.resolve(flags.lines));
    if (!Array.isArray(v)) fail("bad_request", `${flags.lines} must be a JSON array of {id, text, who?, note?, slot?, max_s?}.`);
    return v;
  }
  if (flags.script) {
    let text; try { text = fs.readFileSync(path.resolve(flags.script), "utf8"); } catch { fail("bad_request", `Can't read ${flags.script}.`); }
    const lines = []; let n = 0;
    for (const para of text.replace(/\r\n?/g, "\n").split(/\n\s*\n/)) {
      const t = para.trim().replace(/\s*\n\s*/g, " "); if (!t) continue;
      const m = /^([A-Za-z0-9 :_-]{1,40}?):\s+(.+)$/s.exec(t);
      lines.push({ id: `l${++n}`, text: m ? m[2].trim() : t, ...(m ? { who: m[1].trim() } : {}) });
    }
    if (!lines.length) fail("bad_request", `${flags.script} has no lines in it.`);
    return lines;
  }
  if (flags.text) return [{ id: "l1", text: String(flags.text) }];
  fail("bad_request", "Give the words: --lines lines.json, --script script.md or --text \"…\".", { accepts: ["--lines", "--script", "--text"] });
}
const pronunciations = (flags) => (flags.say ?? []).map((s) => { const [word, ...rest] = s.split("="); return { word: word.trim(), say: rest.join("=").trim() }; }).filter((p) => p.word && p.say);

/* ---------------- files back ---------------- */

async function download(result, dir) {
  if (!result?.downloads?.length) return null;
  fs.mkdirSync(dir, { recursive: true });
  let n = 0;
  for (const d of result.downloads) {
    const target = path.join(dir, d.path);
    if (!path.resolve(target).startsWith(path.resolve(dir) + path.sep)) continue;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const r = await fetch(d.url, { signal: AbortSignal.timeout(120_000) });
    if (!r.ok) { say(`couldn't fetch ${d.path} (${r.status})`); continue; }
    fs.writeFileSync(target, Buffer.from(await r.arrayBuffer())); n++;
  }
  say(`${n} file${n === 1 ? "" : "s"} saved under ${dir}`);
  return dir;
}
async function waitFor(id, { timeoutMs = 30 * 60_000, silent = false } = {}) {
  const until = Date.now() + timeoutMs; let last = "";
  for (;;) {
    const { json } = await call("GET", `/v1/jobs/${id}?wait=60`, { timeout: 90_000 });
    if (json.status !== "ok") return json;
    const j = json.job;
    const line = `${j.id} · ${j.state}${j.progress ? ` · ${j.progress.done}/${j.progress.total}` : ""}`;
    if (!silent && line !== last) { say(line); last = line; }
    if (["done", "failed"].includes(j.state)) return json;
    if (j.state === "needs_video") return json;
    if (Date.now() > until) return { ...json, timed_out: true };
  }
}
async function sendVideo(id, file) {
  const size = fs.statSync(file).size, name = path.basename(file);
  if (size <= PART_BYTES) {
    const { json } = await call("POST", `/v1/jobs/${id}/video?name=${encodeURIComponent(name)}`, { raw: fs.createReadStream(file), timeout: 20 * 60_000 });
    return json;
  }
  const upload = crypto.randomBytes(8).toString("hex"), of = Math.ceil(size / PART_BYTES);
  let json;
  for (let part = 1; part <= of; part++) {
    const start = (part - 1) * PART_BYTES, end = Math.min(size, part * PART_BYTES) - 1;
    say(`${name}: part ${part} of ${of}`);
    ({ json } = await call("POST", `/v1/jobs/${id}/video?name=${encodeURIComponent(name)}&upload=${upload}&part=${part}&of=${of}&total=${size}`, { raw: fs.createReadStream(file, { start, end }), timeout: 20 * 60_000 }));
    if (json.status !== "ok") return json;
  }
  return json;
}

/* ---------------- commands ---------------- */

const COMMANDS = Object.fromEntries(Object.entries(SPEC).filter(([k]) => k !== "version").map(([k, v]) => [k, { flags: Object.keys(v.flags).map((f) => `--${f}`), ...(v.positional ? { argument: k === "status" || k === "open" ? "<job_id>" : "<voice id>" } : {}) }]));

async function main() {
  const a = parse(process.argv.slice(2));
  if (a.error) return out({ schema: "v1", status: "error", ...a.error }, 1);
  const { cmd, flags, positional } = a;
  if (cmd === "version") return out({ schema: "v1", status: "ok", version: VERSION, base: BASE });
  if (cmd === "commands") {
    let server = null;
    try { const r = await fetch(`${BASE}/v1/commands`, { headers: headers(), signal: AbortSignal.timeout(8000) }); if (r.ok) server = await r.json(); } catch {}
    return out({ schema: "v1", status: "ok", version: VERSION, base: BASE, signed_in: !!keyOf(), commands: server?.commands ?? COMMANDS, ...(server?.limits ? { limits: server.limits } : {}), notes: server?.notes ?? ["stdout is one JSON object; stderr is for people", "a wall exits 0 and is a step, not an error"] });
  }
  if (cmd === "voices") {
    if (flags.mine) { const { json } = await call("GET", "/v1/voices/mine"); return out(json); }
    const q = new URLSearchParams(); if (flags.language) q.set("language", flags.language); if (flags.gender) q.set("gender", flags.gender);
    const { json } = await call("GET", `/v1/voices${q.size ? `?${q}` : ""}`);
    return out(json);
  }
  if (cmd === "quote") { const { json } = await call("POST", "/v1/quote", { body: { lines: linesFrom(flags) } }); return out(json); }
  if (cmd === "quota") { const { json } = await call("GET", "/v1/me"); return out(json.status === "ok" ? { ...json, minutes_left: +(json.balance_s / 60).toFixed(1) } : json); }
  if (cmd === "login") {
    let p = readJson(PENDING);
    if (!p || !(p.expires_at > Date.now() + 10_000)) {
      const { json } = await call("POST", "/v1/link");
      if (json.status !== "ok") return out(json, 1);
      p = { code: json.code, url: json.url, poll_url: json.poll_url, interval: json.interval ?? 3, expires_at: Date.now() + (json.expires_in ?? 900) * 1000 };
      writeJson(PENDING, p);
    }
    say(`Open this link to connect ${agentName() === "unknown" ? "this agent" : agentName()} to your Vocula account:\n→ ${p.url}\nWaiting…`);
    if (flags.open) { const opener = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open"; try { spawn(opener, [p.url], { detached: true, stdio: "ignore" }).unref(); } catch {} }
    const until = Date.now() + Math.min(Number(flags.timeout || 300), 900) * 1000;
    while (Date.now() < until) {
      await new Promise((r) => setTimeout(r, (p.interval ?? 3) * 1000));
      let r; try { r = await fetch(p.poll_url ?? `${BASE}/v1/link/${p.code}`, { headers: headers(), signal: AbortSignal.timeout(15_000) }); } catch { continue; }
      if (r.status === 429) continue;
      const json = await r.json().catch(() => null);
      if (!json) continue;
      if (r.status === 404) { try { fs.unlinkSync(PENDING); } catch {} return out({ schema: "v1", status: "error", reason: "not_found", message: "That pairing link expired or was already used. Run vocula login again for a new one." }, 1); }
      if (json.state === "paired" && json.key) {
        writeJson(CONFIG, { ...config(), key: json.key, base: BASE });
        try { fs.unlinkSync(PENDING); } catch {}
        say(`Connected${json.account?.name ? ` as ${json.account.name}` : ""}.`);
        return out({ schema: "v1", status: "ok", connected: true, account: json.account ?? null, balance_s: json.balance_s ?? null, saved_to: CONFIG });
      }
    }
    return out({ schema: "v1", status: "error", reason: "timeout", message: "Nobody confirmed the link in time. Run vocula login again when the creator is ready." }, 1);
  }
  if (cmd === "voice list") { const { json } = await call("GET", "/v1/voices/mine"); return out(json); }
  if (cmd === "voice remove") { const { json } = await call("DELETE", `/v1/voices/mine/${encodeURIComponent(positional[0])}`); return out(json); }
  if (cmd === "voice add") {
    if (!flags.from) fail("bad_request", "--from <audio or video file> is required.", { accepts: ["--from", "--own", "--name", "--consent"] });
    if (!flags.own && !flags.name) fail("bad_request", "Say whose voice it is: --own for the creator's, or --name \"…\" for someone who gave permission.", { accepts: ["--own", "--name"] });
    if (!flags.consent) fail("bad_request", "--consent \"<a sentence recording the creator's consent>\" is required before a voice is saved.", { accepts: ["--consent"] });
    const file = path.resolve(flags.from);
    if (!fs.existsSync(file)) fail("bad_request", `${flags.from} isn't there.`);
    const q = new URLSearchParams({ own: flags.own ? "1" : "0", name: flags.own ? path.basename(file) : `${flags.name}${path.extname(file)}`, consent: "1" });
    const { json } = await call("POST", `/v1/voices/mine?${q}`, { raw: fs.createReadStream(file), timeout: 10 * 60_000 });
    return out(json);
  }
  if (cmd === "status") {
    const id = positional[0];
    const { json } = flags.wait ? await waitFor(id, { timeoutMs: Math.min(Number(flags.timeout || 1800), 3600) * 1000 }) : await call("GET", `/v1/jobs/${id}`);
    if (json.status === "ok" && json.job?.state === "done" && flags.out) json.saved_to = await download(json.job.result, path.resolve(flags.out));
    return out(json);
  }
  if (cmd === "open") {
    const { json } = await call("GET", `/v1/jobs/${positional[0]}`);
    if (json.status === "ok") say(`→ ${json.job.open_url}`);
    return out(json.status === "ok" ? { schema: "v1", status: "ok", url: json.job.open_url, state: json.job.state } : json);
  }
  if (["voiceover", "fit", "soundtrack"].includes(cmd)) {
    const lines = linesFrom(flags);
    if (cmd === "fit" && !(flags.video ?? []).length) fail("bad_request", "fit needs the video: --video <file> (repeat it for several clips).", { accepts: ["--video"] });
    for (const v of flags.video ?? []) if (!fs.existsSync(path.resolve(v))) fail("bad_request", `${v} isn't there.`);
    const body = { kind: cmd, lines, ...(flags.voice ? { voice: flags.voice } : config().voice ? { voice: config().voice } : {}), ...(flags.for ? { for: flags.for } : {}), ...(flags.fps ? { fps: Number(flags.fps) } : {}), ...(flags.rate ? { rate: Number(flags.rate) } : {}),
      ...(flags.title ? { title: flags.title } : {}), ...(flags.language ? { language: flags.language } : {}), ...(cmd === "soundtrack" && flags.direction ? { direction: flags.direction } : {}),
      ...(cmd === "fit" ? { cut: flags.cut ?? "as_is", with_video: !!flags["with-video"], video: { expect: true, count: flags.video.length } } : {}), pronunciations: pronunciations(flags) };
    const { json } = await call("POST", "/v1/jobs", { body });
    if (json.status !== "ok") return out(json, json.status === "error" ? 1 : 0);
    const id = json.job.id;
    say(`${id} · ${json.job.state} · the piece: ${json.job.open_url}`);
    if (cmd === "fit") for (const v of flags.video) { const r = await sendVideo(id, path.resolve(v)); if (r.status !== "ok") return out(r, r.status === "error" ? 1 : 0); }
    if (flags["no-wait"]) return out(json);
    const done = await waitFor(id);
    if (done.status === "ok" && done.job?.state === "done" && flags.out) done.saved_to = await download(done.job.result, path.resolve(flags.out));
    if (done.status === "ok" && done.job?.state === "done") say(`Done: ${done.job.result.gate.delivered}/${done.job.result.gate.requested} lines, ${done.job.result.total_duration_s}s. Change a word or retake a line here: ${done.job.open_url}`);
    return out(done);
  }
  return out({ schema: "v1", status: "error", reason: "unknown_command", message: `No command "${cmd}".`, accepts: Object.keys(SPEC) }, 1);
}
main().catch((e) => fail("server", String(e?.message ?? e)));
