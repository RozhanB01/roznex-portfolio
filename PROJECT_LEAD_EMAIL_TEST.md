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
