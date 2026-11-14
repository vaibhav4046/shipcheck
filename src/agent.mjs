// Rule-based agent: reads a failed Kane run and decides the next move.
// Deliberately deterministic - every decision is explainable in the UI.
const AUTH = /login|sign in|password|auth|captcha|robot|blocked|403/i;
const NAVFAIL = /dns|err_name|err_connection|unreachable|could not load|cannot reach|navigation failed|ssl|certificate/i;

export function planNext({ targetUrl, original, history }) {
  const last = history[history.length - 1].run;
  const text = `${last.summary || ''} ${last.error || ''}`;
  const steps = last.steps || [];
  if (AUTH.test(text)) {
    return { action: 'report', report: report(targetUrl, original, history, 'Access wall', 'The flow hit a login, captcha or block page. Shipcheck does not bypass access walls. Point it at a reachable page or a public flow.') };
  }
  if (steps.length <= 1 && NAVFAIL.test(text)) {
    return { action: 'report', report: report(targetUrl, original, history, 'Unreachable', `Could not load ${targetUrl}. Check the URL is public and loads in a normal browser.`) };
  }
  if (history.length < 3) {
    const objective = refine(original, history);
    return { action: 'retry', reason: 'Kane drove the page but the expected element or result was not there. Re-phrasing the objective with the exact wording Kane saw on screen, to rule out a description problem before calling it a finding.', objective };
  }
  return { action: 'report', report: report(targetUrl, original, history, 'Expectation not met', 'Kane completed the drive but what the objective describes is not on the page, or the expected result never appeared. Either the flow description needs changing or the app is missing what was promised - the evidence run shows exactly where it stops.') };
}

function refine(original, history) {
  const seen = history.flatMap(h => (h.run.steps || []).map(s => s.remark)).join(' ');
  const hints = [...seen.matchAll(/'([^']{3,40})'|"([^"]{3,40})"/g)].map(m => m[1] || m[2]).slice(0, 4);
  return `${original}. Use the page's own wording for buttons and links${hints.length ? ` (seen on page: ${hints.join(', ')})` : ''}. Do not sign in. Stop and assert only what the objective asks.`;
}

function report(targetUrl, original, history, title, body) {
  const last = history[history.length - 1].run;
  return {
    title, body, target: targetUrl, objective: original,
    attempts: history.length,
    evidence: last.testUrl || 'local evidence pack only',
    lastSteps: (last.steps || []).slice(-5),
    suggestion: title === 'Expectation not met'
      ? 'Compare the evidence run against the page. If the element is genuinely absent, fix the app or correct the expectation; if it is present, sharpen the objective wording and re-verify.'
      : 'Make the target reachable without credentials and try again.'
  };
}
