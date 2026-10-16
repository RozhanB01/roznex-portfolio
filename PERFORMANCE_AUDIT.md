# ROZNEX performance checks

Performance workflow: `.github/workflows/performance.yml` runs after a successful production smoke test. It measures the public Persian homepage as mobile and the public English homepage as desktop. Reports are archived as GitHub Actions artifacts.

## October 16, 2026 measurements

| Experimental stage | Mobile performance | Mobile FCP | Mobile LCP | Mobile CLS | Desktop performance |
| --- | ---: | ---: | ---: | ---: | ---: |
| Earlier speed optimizations, first Lighthouse run | 85 / 100 | 3.0 s | 3.6 s | 0.004 | 99 / 100 |
| Non-render-blocking Persian fonts, first follow-up | 95 / 100 | 1.2 s | 2.8 s | 0.004 | 99 / 100 |
| Same font change, next mobile follow-up | 98 / 100 | 1.0 s | 2.4 s | 0.004 | Desktop run transient error |

The mobile Lighthouse score increased by 13 points between the first and latest recorded single runs. These are laboratory observations, not a guarantee that every real user's loading experience improved by the same amount. Network conditions and Lighthouse simulations vary.

Observations:
- Lighthouse identified the hero robot image as the mobile Largest Contentful Paint element.
- On the initial mobile audit, render-blocking CSS/Google Fonts had meaningful potential savings (estimated 1.57-1.73 seconds). Making the external Google Fonts stylesheet non-render-blocking on `/fa/` helped first paint while retaining the existing original typography after fonts finish loading.
- The main hero image remains unchanged; the original robot art, palette and motion direction were preserved.
- A later desktop Lighthouse run failed with transient `NO_NAVSTART` trace capture. The workflow now retries twice before treating a genuine measurement error as a failure.
- CLS stayed low at 0.004 in all recorded mobile runs.

Next measurements:
1. Re-run Lighthouse multiple times, take medians, include mobile device/connection testing.
2. Check real-user LCP, INP and CLS after enabling analytics/Speed Insights, with privacy disclosure as appropriate.
3. Consider responsive image derivatives for hero/project imagery while keeping the *exact same source artwork* and without compromising the mobile crop.
4. Confirm the `.ir` domain/HTTPS before updating SEO origin; it was not configured at the time of this report.
