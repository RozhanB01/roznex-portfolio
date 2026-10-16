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

## Responsive robot hero images — 2026-10-16

The approved robot artwork was **not replaced**. `.github/workflows/hero-assets.yml` generates visually matching downsampled WebP images directly from `assets/roznex-hero-reference.webp`:

| File | Actual bytes | Intended usage |
| --- | ---: | --- |
| `roznex-hero-reference.webp` | 178,248 | 1920px / full-size reference |
| `roznex-hero-1280.webp` | 58,746 | 1280px screens or high-DPR phones |
| `roznex-hero-960.webp` | 40,552 | smaller devices |

Both `/` and `/fa/` now use matching `srcset` and `imagesrcset` preload attributes so a browser can fetch one right-sized image for the responsive hero. The CSS crop, appearance, accessible label and face-hotspot motion remain the same. Image files carry no upscaling and have been committed by an audited GitHub Actions generation workflow. Measure in Lighthouse after deployment before asserting an LCP gain. The desktop image and other images are unchanged.

## Responsive portfolio image previews — October 16, 2026

Lighthouse mobile identified nonresponsive project preview images as an avoidable data transfer. Generated derivatives are made from the **unchanged original project artwork**, using Pillow, in `.github/workflows/project-thumbnails.yml`.

| Image | Original bytes | 480px bytes | 768px bytes | 960px bytes |
| --- | ---: | ---: | ---: | ---: |
| Industrial | 199,416 | 27,998 | 61,762 | 88,710 |
| FamilyOS | 88,868 | 16,392 | 30,936 | 40,522 |
| Studymed | 94,284 | 18,322 | 33,578 | 44,850 |

Both homepages use responsive `srcset` on the project tiles and contact previews. The device chooses resolution based on CSS size and pixel ratio. CSS, visual crop and original files remain unchanged. Do not treat smaller transfer sizes as proof of a specific Lighthouse score; compare multiple runs.
