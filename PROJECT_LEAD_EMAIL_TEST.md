# ROZNEX — authorized form-to-email simulation

Owner explicitly requested **20 simulated project requests** on 2026-10-19. This test sends clearly labeled synthetic examples, not real customers.

## Safety
- Uses the **public form API** `POST https://roznexstudio.ir/api/requests`, including genuine persistent storage and the same notification pipeline used by real visitors.
- Never fakes or rotates IPs, bypasses anti-spam, impersonates real people, or reads private customer requests.
- Production rate limit is **5 requests / 30 minutes / source IP**. The job uses at most five submissions each 31-minute window, and only one runner.
- Stops immediately if any submission is rejected or the API reports `notified:false`.
- Uses `example.com` simulated reply-to addresses, a non-routable `0000000000` number, and a prominent `[TEST ONLY]` marker for easy cleanup.
- Total possible duration: approximately 95 minutes. This is a one-off GitHub Action triggered by modifying its workflow file, not an ongoing automated test. Remove or disable after completion.

## What tests mean
`status=201` = server persisted a new record. `notified:true` = email provider accepted API request. **Neither guarantees Inbox delivery.** Check the intended notification mailbox, its spam folder, and Resend email event log to confirm acceptance and delivery. Review results at GitHub Actions artifacts `roznex-20-lead-email-qa/reports/lead-email-qa.json`. Remove all synthetic entries after confirmation with an authenticated administrator action.

## First production probe outcome (2026-10-19)

- The one-off GitHub Actions run 39313198325 attempted the first test request.
- Backend response: HTTP **201**, request ID `RZN-REQ-MVFNVDA2-EFB0EB`, `notified:false`.
- **1 stored synthetic request**, **0 notification-provider acceptances**, **19 not attempted**. This is an intentional stop-on-failure, not a 20/20 passing result.
- The configured notification-recipient environment variable exists. The backend sends through Resend and requires `RESEND_API_KEY`; the sender identity `ROZNEX_EMAIL_FROM` must be approved for the service.
- Gmail search of available connected mailbox found no corresponding successful ROZNEX email in the recent period. API metadata and mailbox evidence do not establish provider/root-cause specifics.
- The test workflow is now **manual-only** (`workflow_dispatch`) to avoid unintended repeat synthetic submissions. After fixing delivery, manually run from GitHub Actions, verify `notified:true` and actual Inbox/Spam reception, then allow the 20-entry paced test.
- Clean up the single QA request in the admin dashboard when finished.
