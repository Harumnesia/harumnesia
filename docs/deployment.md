# Phase 10 deployment contract

This is the contract for a future Cloudflare release, not an applied deployment configuration. Phase 9 creates no Cloudflare project, DNS record, custom domain, cache rule, redirect, or Worker service. Complete the [readiness gate](./production-readiness.md) before Phase 10.

## Build and hosting

| Item                | Required value                                                                 |
| ------------------- | ------------------------------------------------------------------------------ |
| Hosting target      | Cloudflare Pages static site                                                   |
| Source repository   | `Harumnesia/harumnesia`                                                        |
| Production branch   | `main` after review and approved release commit                                |
| Package manager     | pnpm `10.30.3`, pinned in `package.json`                                       |
| Build runtime       | Node.js 22, minimum `22.12.0`                                                  |
| Provider build root | Repository root (`.`); the local checkout folder happens to be `harumnesia-v2` |
| Install             | `pnpm install --frozen-lockfile`                                               |
| Build               | `pnpm build`                                                                   |
| Output              | `apps/web/dist` relative to the V2 repository root                             |

The deployed artifact is static HTML, hashed JavaScript and CSS, hashed runtime/taxonomy JSON, the worker JavaScript, and a favicon. It needs no API, database, secret, or V1 sibling repository. Build from a clean checkout with the pinned lockfile. Do not rebuild canonical data during hosting: committed generated artifacts are the build inputs.

## Routing and delivery

The application uses `BrowserRouter`. Direct `/discover`, `/results`, `/perfume/:id`, and unknown paths must serve `index.html`; the SPA then renders the correct route or branded 404. `/results` without in-memory session intentionally shows the no-session state. Verify fallback on a preview deployment before assigning a domain. Cloudflare Pages [SPA serving behavior](https://developers.cloudflare.com/pages/configuration/serving-pages/) applies when no top-level `404.html` is deployed; verify the actual project response and avoid a rule that shadows real static assets.

Use a short-lived or revalidated policy for `index.html` so new releases are discovered. Hashed JS, CSS, worker, runtime JSON, and taxonomy JSON may use long-lived `public, max-age=31536000, immutable` caching **after** confirming their URLs change when content changes. The 9.69 MB raw runtime JSON is one hashed asset; fetch it only on first recommendation or direct detail, allow browser/CDN reuse within a release, and do not duplicate it into main JS. The four hashed taxonomy files load on discovery. Keep non-hashed `favicon.svg` and any future canonical-ID image paths on a deliberately shorter or versioned policy. Review Cloudflare Pages [header configuration](https://developers.cloudflare.com/pages/configuration/headers/) in Phase 10 before creating a `_headers` file or dashboard rule.

Verify MIME types on preview: `text/html` for route HTML, JavaScript MIME accepted by module and Worker loading, `text/css`, `application/json` for runtime and taxonomy, and `image/svg+xml` for favicon. If approved AVIF/WebP images are added later, verify `image/avif` and `image/webp`. Verify Brotli or gzip negotiation for JS, CSS, JSON, and HTML over HTTPS; measure transferred bytes and ensure decompression does not affect worker loading. Cloudflare Pages documents [asset serving and compression](https://developers.cloudflare.com/pages/configuration/serving-pages/). No response header or cache behavior is presumed from the local Vite preview.

The recommendation worker must be served as same-origin module JavaScript, with its hashed URL resolved by the built main JS. Its fetch of runtime JSON must succeed under the same origin and CSP, if a CSP is later introduced. Do not add a backend Worker for this client-side engine. Check Cloudflare Pages [asset limits](https://developers.cloudflare.com/pages/platform/limits/) against the emitted inventory; the current 9.69 MB runtime is below the documented 25 MiB single-file limit.

## Preview, domain, and rollback

Before production, validate the provider preview URL with the exact build: root and direct routes, form taxonomy, first and repeated Top 5, result-to-detail, direct valid local and international IDs, invalid ID, unknown route, keyboard flow, viewport widths, worker/runtime request counts, MIME, compression, and cache headers. Compare dataset hashes with the [readiness record](./production-readiness.md). A real-device pass remains a separate check where hardware is available.

Choose and document the production hostname during Phase 10. If the existing DNS zone is on Cloudflare, connect the Pages custom domain according to the current provider instructions; if DNS is external, add only the records required for that hostname after reviewing conflicts, TLS issuance, redirects, and ownership. Do not alter the current site or apex behavior without a release plan. Preserve a known-good deployment reference and rollback through Cloudflare Pages deployment history if production smoke fails; verify direct routes and cache behavior after rollback. A prior hashed asset may remain cached, so the HTML response must reference the matching release assets.

After release, monitor Pages deployment status, failed static requests and 404s, runtime/worker fetch failures, JavaScript errors, recommendation latency, and traffic or error trends. Repeat the production smoke checklist on the final domain and at least one representative mobile device. Record the release commit, deployment ID, domain, checks, and rollback reference in Phase 10H documentation.
