# ROZNEX — Custom domain & Google Search Console launch
Updated: 2026-10-16

## Domain status, verified via Vercel
- Project: `roznex-portfolio`, source `RozhanB01/roznex-portfolio`
- Domain purchased from LimooHost: `roznexstudio.ir`
- `roznexstudio.ir` and `www.roznexstudio.ir` are **associated with the project**.
- `www.roznexstudio.ir` is configured to redirect (HTTP 308) to `roznexstudio.ir`.
- Vercel domain configuration reports `misconfigured: true`, empty A/CNAME records, and no confirmed website DNS routing. **It is not yet safe to publish a new canonical host.**
- The registrar changes were submitted from LimooHost's panel. A registered domain and Vercel's verified project association alone do **not** mean the site resolves publicly.

## Finish DNS configuration
1. Check that LimooHost has accepted the registrar nameserver change and that NIC.ir has completed delegation. Requested Vercel nameservers were `ns1.vercel-dns.com` and `ns2.vercel-dns.com`; don't mix these with LimooHost nameservers.
2. The Vercel **account-level Domains / DNS** page must also have an authoritative DNS zone for `roznexstudio.ir` if using Vercel nameservers. Check that the domain and zone belong to the correct Vercel scope; do not assume adding it to a project creates all records.
3. If using **LimooHost's DNS instead**, retain LimooHost nameservers and add the **exact A and CNAME values shown in Vercel project Settings → Domains**, including any domain-specific new target values. Don't change unrelated MX/TXT/email records.
4. Confirm correct records for the apex and `www`, valid HTTPS, the 308 `www` redirect, and working routes such as `/fa/`, `/about/fa/rozhan-behrouzi/`, and `/sitemap.xml`.
5. If DNS delegation remains pending beyond the registrar's stated window, contact LimooHost and, for .ir delegation problems, NIC.ir. Include the domain, requested nameservers, saved-change timestamp and observed status without sharing passwords.

## When the host is confirmed accessible (separate code change)
- Atomically replace the old site origin `https://roznex-portfolio.vercel.app` with `https://roznexstudio.ir` in canonical/hreflang/og/Twitter/JSON-LD, sitemaps, RSS, robots, smoke tests and API public-origin settings.
- Update the SEO checker to validate the final domain and all 42 public pages.
- Redirect old public URLs to matching new URLs after checking routing and API implications. Preserve paths and queries.
- Test primary Persian and English URLs and re-run Github CI.

## Search Console (free, independent of GSC Wizard)
1. Open https://search.google.com/search-console and add the verified `roznexstudio.ir` domain property, or choose URL Prefix for `https://roznexstudio.ir/`.
2. Follow Google's DNS TXT verification instructions in the **active authoritative DNS service**. This step needs the Google-provided verification value; never invent it.
3. Submit `https://roznexstudio.ir/sitemap.xml` after canonical URLs have been switched and validated.
4. Use URL Inspection for `/fa/`, `/about/fa/rozhan-behrouzi/` and service pages; monitor index coverage, impressions and clicks.
5. Review PageSpeed Insights and real mobile rendering before claiming launch completeness.

**SEO goal:** prioritize accurate identity for `روژان بهروزی` / `Rozhan Behrouzi` / ROZNEX and practical service pages. Nobody can guarantee first position for ambiguous words such as `روژان`.
