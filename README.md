# Shipcheck

**Paste a URL. Say what should work in plain English. Shipcheck verifies it with [Kane CLI](https://www.testmuai.com/kane-cli/), reads the failure, and loops - re-phrasing and re-running until green, or writing the bug report a developer can act on.**

Built for the Kane CLI Online Hackathon (12-19 Nov 2026) by Vaibhav Lalwani, solo.

## Who it is for

Non-technical founders and small teams who ship with AI coding agents and have no QA step. They cannot write selectors and should not have to. Shipcheck is the check: "the signup button works", "the cart total matches", in the words they already use.

## The loop (the point of the project)

1. You describe the expectation: a URL + one sentence.
2. Shipcheck runs **Kane CLI** headlessly against it and streams every step live (SSE).
3. If Kane fails, a **rule-based agent** reads the run - the failed step, the summary, the reason code - and decides:
   - **Access wall** (login/captcha/block): stop, report. Shipcheck never bypasses access walls.
   - **Unreachable** (DNS/connection/SSL, navigation never completed): stop, report.
   - **Flow-description problem**: re-phrase the objective using the exact element wording Kane saw on screen, and re-run (up to 3 attempts).
   - **Expectation not met**: write the bug report - what was expected, where the run stops, the evidence link, and a suggested fix.
4. Every attempt, verdict and agent decision is visible in the UI timeline as it happens.

Kane's verdict triggers the agent's next action, and the agent's re-phrased objective triggers Kane's next run. That is the closed loop, and it is real - see [FIXED-BY-KANE.md](FIXED-BY-KANE.md) for bugs Kane caught in Shipcheck itself during the build.

## Run it

Requirements: Node.js 18+, Google Chrome, and a [Kane CLI](https://www.testmuai.com/kane-cli/) login (`npm install -g @testmuai/kane-cli && kane-cli login`).

```bash
node run.mjs
# open http://localhost:4173
```

No npm dependencies. One command.

Try it against the bundled example (LambdaTest's public playground): the form is prefilled - press **Verify it** and watch the run.

## Dev-loop hook

`kane-hook.mjs` is the same idea for your own repo: it watches your source directory and re-verifies a saved Kane objective on every save, printing a one-line JSON verdict an AI coding agent can read and act on.

```bash
node kane-hook.mjs "the heading says Shipcheck and the Verify it button is visible" --url http://localhost:4173 --dir ./public
```

Save -> Kane runs -> fail -> agent edits -> save -> Kane runs -> green.

## Architecture

- `run.mjs` - zero-dependency Node HTTP server: static UI + `/api/verify` SSE endpoint that orchestrates the loop.
- `src/kane-runner.mjs` - spawns `kane-cli run --headless`, parses its NDJSON event stream into steps, verdicts, evidence links and credit usage.
- `src/agent.mjs` - the deterministic decision layer. Every decision is explainable; nothing is hidden in a model.
- `kane-hook.mjs` - the watch-and-verify dev loop.
- `public/` - the UI.

## What is real

- Every Kane run referenced in this repo actually ran; evidence links point to TestMu AI's hosted run pages.
- The agent layer is rule-based by design: transparent, testable, no hallucinated verdicts.
- No access-wall bypassing, no fake passes: a failure becomes a report, not a retouched screenshot.

## Limits

- Runs cost Kane credits (~25 per fresh run; cached replays are free). Shipcheck caps the loop at 3 attempts.
- Kane CLI must be installed and logged in on the machine running `node run.mjs`; the app shells out to it.
- The classifier is deliberately conservative: ambiguous failures become reports for a human, not silent retries.

## Disclosure

Built with an AI coding agent during the hackathon window (repo initialized 14 Nov 2026). Kane CLI is the only required dependency. MIT licensed.
