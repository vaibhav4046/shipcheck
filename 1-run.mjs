#!/usr/bin/env node
// Shipcheck - local-first QA agent. One command: node run.mjs
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runKane } from './src/kane-runner.mjs';
import { planNext } from './src/agent.mjs';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PORT = process.env.PORT || 4173;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };

function send(res, code, body, type = 'application/json') {
  res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname === '/api/verify' && req.method === 'POST') {
    // SSE stream of the whole agent<->Kane loop
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
    const emit = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    let body = '';
    req.on('data', c => (body += c));
    req.on('end', async () => {
      let input;
      try { input = JSON.parse(body); } catch { emit('error', { message: 'bad JSON' }); return res.end(); }
      const { targetUrl, objective } = input;
      if (!targetUrl || !objective) { emit('error', { message: 'targetUrl and objective required' }); return res.end(); }
      let currentObjective = objective;
      const history = [];
      for (let attempt = 1; attempt <= 3; attempt++) {
        emit('attempt', { attempt, objective: currentObjective });
        const run = await runKane({ url: targetUrl, objective: currentObjective, onEvent: e => emit('kane', e) });
        history.push({ attempt, objective: currentObjective, run });
        emit('run_end', { attempt, status: run.status, summary: run.summary, testUrl: run.testUrl, credits: run.credits });
        if (run.status === 'passed') { emit('done', { ok: true, attempts: attempt, history }); return res.end(); }
        const plan = planNext({ targetUrl, original: objective, history });
        emit('agent', plan);
        if (plan.action === 'report') { emit('done', { ok: false, report: plan.report, history }); return res.end(); }
        currentObjective = plan.objective;
      }
      emit('done', { ok: false, report: 'Stopped after 3 attempts. See last failure above.', history });
      res.end();
    });
    return;
  }
  if (url.pathname === '/api/health') return send(res, 200, { ok: true });
  // static
  let p = normalize(url.pathname === '/' ? '/index.html' : url.pathname);
  if (p.includes('..')) return send(res, 403, { error: 'forbidden' });
  try {
    const data = await readFile(join(ROOT, 'public', p));
    send(res, 200, data.toString(), MIME[extname(p)] || 'application/octet-stream');
  } catch { send(res, 404, { error: 'not found' }); }
});
server.listen(PORT, () => console.log(`Shipcheck on http://localhost:${PORT}`));
