#!/usr/bin/env node
// kane-hook: runs a saved Kane flow on every save, prints agent-readable NDJSON.
// Usage: node kane-hook.mjs "objective" [--url http://localhost:4173] [--dir ./public]
// The loop an AI coding agent can close: save -> Kane runs -> fail -> agent edits -> save -> Kane runs.
import { watch } from 'node:fs';
import { runKane } from './src/kane-runner.mjs';

const objective = process.argv[2];
if (!objective) { console.error('usage: node kane-hook.mjs "objective" [--url U] [--dir D]'); process.exit(1); }
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const url = arg('--url', 'http://localhost:4173');
const dir = arg('--dir', './public');

console.log(`[kane-hook] watching ${dir} - Kane verifies: "${objective}" against ${url}`);
let running = false, queued = false;
async function verify(reason) {
  if (running) { queued = true; return; }
  running = true;
  console.log(`[kane-hook] run started (${reason})`);
  const r = await runKane({ url, objective, onEvent: e => console.log(`[kane] step ${e.step}: ${e.remark}`) });
  // Agent-readable verdict line - the agent reads this and acts on it
  console.log(JSON.stringify({ type: 'kane_hook_verdict', status: r.status, summary: r.summary, evidence: r.testUrl, reason: r.reasonCode }));
  running = false;
  if (queued) { queued = false; verify('queued save'); }
}
watch(dir, { recursive: true }, (_e, f) => { if (f && !f.startsWith('.')) verify(`saved ${f}`); });
verify('initial run');
