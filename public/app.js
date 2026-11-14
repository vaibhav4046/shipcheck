const $ = s => document.querySelector(s);
const timeline = $('#timeline');
function add(kind, title, body, link) {
  const div = document.createElement('div');
  div.className = 'ev ' + kind;
  div.innerHTML = `<small>${title}</small>${body || ''}` + (link ? ` <a href="${link}" target="_blank" rel="noopener">evidence â</a>` : '');
  timeline.appendChild(div);
  div.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
$('#go').addEventListener('click', () => {
  timeline.innerHTML = ''; $('#report').classList.add('hidden');
  const btn = $('#go'); btn.disabled = true; btn.textContent = 'Verifyingâ¦';
  fetch('/api/verify', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ targetUrl: $('#url').value.trim(), objective: $('#objective').value.trim() }) })
    .then(async res => {
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = '';
      for (;;) {
        const { done, value } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        let i; while ((i = buf.indexOf('\n\n')) >= 0) {
          const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
          const ev = (chunk.match(/^event: (.*)$/m) || [])[1];
          const data = JSON.parse((chunk.match(/^data: (.*)$/m) || [])[1]);
          handle(ev, data);
        }
      }
    })
    .catch(e => add('failed', 'error', String(e)))
    .finally(() => { btn.disabled = false; btn.textContent = 'Verify it'; });
});
function handle(ev, d) {
  if (ev === 'attempt') add('attempt', `attempt ${d.attempt}`, escapeHtml(d.objective));
  else if (ev === 'kane' && d.type === 'step') add('', `kane Â· step ${d.step}`, escapeHtml(d.remark));
  else if (ev === 'run_end') add(d.status === 'passed' ? 'passed' : 'failed', `kane Â· ${d.status}`, escapeHtml(d.summary || ''), d.testUrl);
  else if (ev === 'agent') add('agent', 'agent decision', escapeHtml(d.action === 'retry' ? d.reason + ' â ' + d.objective : 'writing bug report'));
  else if (ev === 'error') add('failed', 'error', escapeHtml(d.message));
  else if (ev === 'done') {
    if (d.ok) add('passed', 'verified â', `green after ${d.attempts} attempt(s)`);
    else if (d.report) showReport(d.report);
  }
}
function showReport(r) {
  const el = $('#report');
  if (typeof r === 'string') { el.textContent = r; el.classList.remove('hidden'); return; }
  el.textContent = `BUG REPORT - ${r.title}\n\n${r.body}\n\nTarget: ${r.target}\nObjective: ${r.objective}\nAttempts: ${r.attempts}\nEvidence: ${r.evidence}\nSuggested fix: ${r.suggestion}`;
  el.classList.remove('hidden');
}
function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
