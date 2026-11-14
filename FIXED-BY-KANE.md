# Fixed by Kane

Real moments where a Kane CLI run caught a problem in Shipcheck itself while it was being built. Every entry links the failing run and the passing re-run. Dates are GMT.

## 14 Nov 2026 - wrong button label shipped

While building the UI, the main action button was renamed during an edit (`Verify it` became `Check it`). The Kane self-check objective was:

> Verify the page heading says Shipcheck and there is a Verify it button

- **Baseline run (green):** heading `Shipcheck` and `Verify it` button confirmed on http://localhost:4173 - passed, 14 Nov 07:13.
- **Kane caught it (red):** after the label change, the same objective failed. Kane's verdict: *"The page displays the action button with the wrong label. It says Check it rather than Verify it. Change the visible button label from Check it to Verify it, then rerun the verification."* - failed, 14 Nov 07:13.
- **Fix and re-run (green):** label restored, identical objective passed again - 14 Nov 07:15.

This is the loop the whole project is about: the agent shipped a regression, Kane named it in plain English, the agent fixed it, Kane re-verified. No human opened a browser.

## 14 Nov 2026 - failure classifier called a page "Unreachable" that loaded fine

The first end-to-end failure test (objective asked for a Pricing link on example.com) was classified by Shipcheck's rule-based agent as "Unreachable" because the words "not found" appeared in Kane's summary, even though navigation had succeeded. The fix: only classify Unreachable when the run has at most one completed step AND the failure text matches network-level errors (DNS, connection, SSL, navigation failed); otherwise treat it as a flow/expectation problem, re-phrase and retry, and only then write the finding. Verified with a 3-attempt run: retry, retry, "Expectation not met" report with evidence - 14 Nov 07:11.
