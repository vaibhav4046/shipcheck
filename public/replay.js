const $ = s => document.querySelector(s);
const timeline = $('#timeline');
function add(kind, title, body, link) {
  const div = document.createElement('div');
  div.className = 'ev ' + kind;
  div.innerHTML = `<small>${title}</small>${body || ''}` + (link ? ` <a href="${link}" target="_blank" rel="noopener">evidence ↗</a>` : '');
  timeline.appendChild(div);
  div.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function handle(ev, d) {
  if (ev === 'attempt') add('attempt', `attempt ${d.attempt}`, escapeHtml(d.objective));
  else if (ev === 'kane' && d.type === 'step') add('', `kane · step ${d.step}`, escapeHtml(d.remark));
  else if (ev === 'run_end') add(d.status === 'passed' ? 'passed' : 'failed', `kane · ${d.status}`, escapeHtml(d.summary || ''), d.testUrl);
  else if (ev === 'agent') add('agent', 'agent decision', escapeHtml(d.action === 'retry' ? d.reason + ' → ' + d.objective : 'writing bug report'));
  else if (ev === 'error') add('failed', 'error', escapeHtml(d.message));
  else if (ev === 'done') {
    if (d.ok) add('passed', 'verified ✓', `green after ${d.attempts} attempt(s)`);
    else if (d.report) showReport(d.report);
  }
}
function showReport(r) {
  const el = $('#report');
  el.textContent = `BUG REPORT - ${r.title}\n\n${r.body}\n\nTarget: ${r.target}\nObjective: ${r.objective}\nAttempts: ${r.attempts}\nEvidence: ${r.evidence}\nSuggested fix: ${r.suggestion}`;
  el.classList.remove('hidden');
}
function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
let playing = false;
async function play(name, btn) {
  if (playing) return;
  playing = true;
  timeline.innerHTML = ''; $('#report').classList.add('hidden');
  for (const b of document.querySelectorAll('button')) b.disabled = true;
  btn.textContent = 'Replaying…';
  for (const { ev, data } of REPLAYS[name]) {
    await new Promise(r => setTimeout(r, ev === 'kane' ? 1100 : 1600));
    handle(ev, data);
  }
  btn.textContent = btn.dataset.label;
  for (const b of document.querySelectorAll('button')) b.disabled = false;
  playing = false;
}
for (const [id, name, label] of [
  ['play-pass', 'pass', 'Replay: green run (example.com heading check, 1 attempt)'],
  ['play-fail', 'fail', 'Replay: the agent loop (pricing check, 3 attempts, retries, bug report)'],
]) {
  const b = document.getElementById(id);
  b.dataset.label = label;
  b.addEventListener('click', () => play(name, b));
}
const auto = new URLSearchParams(location.search).get('auto');
if (auto && REPLAYS[auto]) { const b = document.getElementById('play-' + auto); if (b) b.click(); }
