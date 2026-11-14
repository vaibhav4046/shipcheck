// Spawns kane-cli, parses its NDJSON stream, resolves a compact run result.
import { spawn } from 'node:child_process';

const KANE = process.env.KANE_CLI || 'kane-cli';

export function runKane({ url, objective, onEvent = () => {}, timeoutSec = 240 }) {
  return new Promise(resolve => {
    const args = ['run', '--headless', '--timeout', String(timeoutSec), '--url', url, objective];
    const child = spawn(KANE, args, { env: { ...process.env, PATH: process.env.HOME + '/.npm-global/bin:' + process.env.PATH } });
    let buf = '';
    const out = { status: 'error', summary: '', testUrl: null, credits: null, steps: [], error: null };
    const kill = setTimeout(() => { try { child.kill('SIGKILL'); } catch {} out.error = 'timeout'; }, (timeoutSec + 60) * 1000);
    const handle = line => {
      let ev; try { ev = JSON.parse(line); } catch { return; }
      if (typeof ev.step === 'number' && ev.status === 'done' && ev.remark) {
        out.steps.push({ step: ev.step, remark: ev.remark.slice(0, 300) });
        onEvent({ type: 'step', step: ev.step, remark: ev.remark.slice(0, 300) });
      }
      if (ev.type === 'run_end') {
        out.status = ev.status || 'error';
        out.summary = (ev.summary || '').slice(0, 600);
        out.testUrl = ev.test_url || null;
        out.credits = ev.credits_consumed ?? null;
        out.reasonCode = ev.reason_code || null;
      }
    };
    child.stdout.on('data', d => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (l) handle(l); } });
    let errBuf = '';
    child.stderr.on('data', d => { errBuf += d; errBuf = errBuf.slice(-2000); });
    child.on('error', e => { clearTimeout(kill); out.error = String(e); resolve(out); });
    child.on('close', code => {
      clearTimeout(kill);
      if (out.status === 'error' && !out.error && code !== 0) out.error = errBuf.slice(-300) || `exit ${code}`;
      resolve(out);
    });
  });
}
