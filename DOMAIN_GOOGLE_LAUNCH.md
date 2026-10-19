# ROZNEX — Domain and Google Search Console

Updated: 2026-10-19.

## Verified public domain
- **Primary:** https://roznexstudio.ir
- **Persian homepage:** https://roznexstudio.ir/fa/
- **English homepage:** https://roznexstudio.ir/en/
- **WWW:** https://www.roznexstudio.ir — Vercel config has HTTP 308 redirect to primary host.
- Vercel domain configuration on 2026-10-19: `misconfigured:false` for both apex and www, authoritative nameservers `ns1.vercel-dns.com` and `ns2.vercel-dns.com`.
- HTTPS and real publicly accessible English/Persian pages were verified. Do **not** suggest changing registrar DNS again without a new incident.
- Canonical, sitemap and robots public URLs use `https://roznexstudio.ir`.

## Deployment safety checks
- Run the GitHub "ROZNEX quality" job after each commit: it validates domain-specific SEO, image budgets and source integrity.
- Run "Production Smoke Test": it now validates the public `.ir` pages, 308 www redirect, canonical URL and sitemap in addition to API/admin checks.
- "ROZNEX Lighthouse Performance" measures **mobile** `/fa/` and **desktop** `/en/` on the actual canonical host (not the legacy Vercel hostname).
- Never claim a GitHub commit is public until Vercel reports the matching deployed commit SHA and status READY.

## Google Search Console — still requires account action
1. Open https://search.google.com/search-console using the Google account that should own ROZNEX.
2. Add a **Domain property** for `roznexstudio.ir` (recommended). Google will show a unique DNS TXT value.
3. Add that exact TXT record in the domain's active **Vercel DNS** zone. Do not guess a TXT token. Let the record propagate and press Verify in Search Console. A URL-prefix property is an alternative if Domain verification cannot be completed.
4. Submit sitemap `https://roznexstudio.ir/sitemap.xml`.
5. Inspect `https://roznexstudio.ir/fa/`, `https://roznexstudio.ir/en/` and `https://roznexstudio.ir/about/fa/rozhan-behrouzi/` for indexing, then monitor actual impressions/queries, including روژان بهروزی and Rozhan Behrouzi.
6. Search results/first-page rankings are not guaranteed. Do not fabricate performance statistics or credentials.

The GSC Wizard connected tool is not usable until its own subscription is active; Google's Search Console itself can be used for free directly.
