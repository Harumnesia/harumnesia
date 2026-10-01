# Phase 10 deployment record and contract

The [Phase 9 readiness gate](./production-readiness.md) passed before Cloudflare setup. This record documents the deployed Git commit, production verification, and hosting contract.

## Phase 10A execution status (1 October 2026)

**Status: COMPLETE.** The GitHub-linked Pages project `harumnesia` serves [harumnesia.pages.dev](https://harumnesia.pages.dev) from `Harumnesia/harumnesia`, production branch `main`. The production source is commit `d500f13533031ed92bec76aa8bab966574d12c0b` (GitHub CI #14 and Cloudflare Pages checks passed). Cloudflare reports successful Git push deployment `4ec0c4b8-f78c-49b1-ab43-ffa418a90608` at [its immutable deployment URL](https://4ec0c4b8.harumnesia.pages.dev), with `commit_dirty=false`. The project API identifies that deployment as the canonical production deployment. The public URL and immutable URL returned byte-identical HTML and main JS (SHA-256), confirming that the public site serves this release. No custom domain or DNS change has been made. **Next: Phase 10B — Custom Domain & Production Cutover.**

| Setting               | Actual value                                                                                                                                                                            |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deployment method     | Cloudflare Pages GitHub integration; production branch `main`, preview branches enabled                                                                                                 |
| Root / output         | Repository root / `apps/web/dist`                                                                                                                                                       |
| Build command         | `pnpm install --frozen-lockfile && pnpm build`; Cloudflare also runs its own dependency installation first                                                                              |
| Build tools           | pnpm `10.30.3`; `NODE_VERSION` is a build-only plaintext setting for production and preview, pinned to `22.23.3` after the first build used `22.22.0` and emitted a Vite engine warning |
| Functions and domains | `uses_functions=false`; project domains contain only `harumnesia.pages.dev`                                                                                                             |

### Deployed route and network checks

Direct HTTPS visits and browser refreshes served the SPA document for `/`, `/discover`, `/results`, `/perfume/local-hrmn-0228`, `/perfume/international-839942a83512e0bf`, `/perfume/invalid-id`, and `/totally-unknown-route`. The browser rendered the landing and discovery pages, a no-session state for direct `/results`, both valid details, an application-level invalid-ID state, and the branded 404. The real hashed JS, CSS, worker, runtime, taxonomy, and favicon URLs returned their intended static assets. Unlisted paths, including `/assets/not-present.js` and `/.env`, returned the generic 582-byte SPA HTML document; no source or credential content was served. A missing asset URL therefore has HTML MIME, while every asset referenced by this release resolved with the correct MIME.

Chrome NetLog on the actual Pages origin recorded these **additional URL requests by stage**:

| Browser stage                             | Worker JS | Runtime JSON | Taxonomy JSON |
| ----------------------------------------- | --------: | -----------: | ------------: |
| Landing                                   |         0 |            0 |             0 |
| Discover before submit                    |         0 |            0 |             4 |
| First Top 5                               |         1 |            1 |             0 |
| Repeat Top 5, same SPA session            |         0 |            0 |             0 |
| Results to detail, same SPA session       |         0 |            0 |             0 |
| Direct local detail, new document         |         1 |            1 |             0 |
| Direct international detail, new document |         1 |            1 |             0 |

On the production URL, Discover displayed the exact `vanilla` option when searched and accepted it as a selected tag. The amber/vanilla, local bergamot/day, and international woody/bergamot UI scenarios each rendered five results with reasons and no internal score, MMR, or coverage text. The first two scenarios kept their expected top IDs, `local-hrmn-0228` and `international-839942a83512e0bf`. The amber/vanilla Top 5 IDs were `international-e8dffb4ecdc18d9d`, `international-935ea2ca10fe8efe`, `international-bbe5e61a308b9452`, `international-e0523c428bd799bb`, and `international-87cd67ab2fac7d98`. A result opened its normal perfume detail; direct local and international details also rendered correctly. The fresh production Chrome NetLog repeated the lazy request pattern in the table, including no extra worker/runtime request for repeat recommendation or result-to-detail navigation.

### Delivery, performance, and browser checks

| Asset         | HTTP MIME                | Raw build size | Observed Brotli transfer |
| ------------- | ------------------------ | -------------: | -----------------------: |
| HTML          | `text/html`              |          582 B |                    289 B |
| Main JS       | `application/javascript` |      297,853 B |                 92,928 B |
| CSS           | `text/css`               |       26,772 B |                  6,484 B |
| Worker JS     | `application/javascript` |      101,388 B |                 28,257 B |
| Runtime JSON  | `application/json`       |    9,690,284 B |              1,653,962 B |
| Taxonomy JSON | `application/json`       |     four files |        128–12,398 B each |
| Favicon       | `image/svg+xml`          |          261 B |                    169 B |

All representative HTML, JS, CSS, JSON, and SVG responses negotiated `Content-Encoding: br` on the production URL. Pages returned `Cache-Control: public, max-age=0, must-revalidate` for HTML and static assets. The hashed JS/JSON responses had weak ETags; a conditional JS request returned `304`. This default keeps HTML revalidated, though it does not give hashed assets a long browser freshness lifetime. No `_headers`, cache rule, or redirect was added. The observed transfer sizes above are from the current production URL; raw sizes are from the committed build inventory. The main JS is `index-DyvQbf7c.js` in both locations.

In one Pages Chrome run, first recommendation measured runtime fetch 143.9 ms, parse 71.0 ms, index 239.6 ms, total initialization 454.6 ms, and recommendation 29.3 ms. Repeating the recommendation took 8.5 ms without another runtime/worker request; result-to-detail lookup took 0.1 ms. Direct local and international detail initialization took 524.5 ms and 363.7 ms respectively, with 1.1 ms and 1.0 ms lookups. These observations are in the range of the [Phase 9 local measurements](./production-readiness.md) and are not pass/fail thresholds.

Headless Chrome checked landing, discovery, expanded filters, results, detail, no-session, invalid-detail, and 404 states at widths 375, 768, 1024, and 1440 px. No horizontal overflow was measured; screenshots were visually inspected. The deployed build exposed a keyboard skip link and visible focus, a 44 px mobile menu toggle, seven labelled fieldsets, radio/checkbox semantics, keyboard tag selection/removal, and reduced-motion behavior (`scroll-behavior: auto`, zero button transition). The emitted CSS still contains the Phase 9 ochre contrast color `#806117`. Loading status and error alert semantics remain covered by frontend tests; network-failure states were not forced on the deployed URL. **REAL DEVICE TEST NOT EXECUTED** because no physical mobile device was available.

Browser navigation recorded no external page requests or perfume image hotlinks. The shipped inventory contains ten files, no perfume images, source maps, Stitch files, or debug endpoint. Probes for `/.env`, `AGENTS.md`, `wrangler.toml`, and an ignored Stitch file returned only SPA HTML. The Pages project has no Functions, D1/KV/R2 or other service bindings, or custom domain; its only environment setting is the non-secret build version `NODE_VERSION`. Wrangler OAuth credentials remain outside the repository; no `.env`, token, or Cloudflare credential was added to the working tree. Other unrelated resources already present in the account were not altered.

### Phase 10B handoff, without changing DNS now

Phase 10A is closed on the verified Git production deployment. Phase 10B is next: choose the exact production hostname with the domain owner; it has not been specified yet. For a subdomain whose DNS remains outside Cloudflare, add that hostname to this Pages project, then have the DNS owner point its CNAME at `harumnesia.pages.dev` after reviewing existing records and the provider's [custom-domain instructions](https://developers.cloudflare.com/pages/configuration/custom-domains/). An apex hostname requires a separate Cloudflare zone/nameserver decision. The domain owner must approve the hostname, record change, TLS validation, and cutover window. Preserve the previous DNS values and successful Pages deployment ID. If production smoke fails, restore the previous DNS target or roll back to a known-good Pages deployment, then recheck direct routes and asset/cache behavior. No record, nameserver, redirect, or domain association was changed in Phase 10A.

## Build and hosting

| Item                | Required value                                                                 |
| ------------------- | ------------------------------------------------------------------------------ |
| Hosting target      | Cloudflare Pages static site                                                   |
| Source repository   | `Harumnesia/harumnesia`                                                        |
| Production branch   | `main`; deployed commit `d500f13533031ed92bec76aa8bab966574d12c0b`             |
| Package manager     | pnpm `10.30.3`, pinned in `package.json`                                       |
| Build runtime       | Node.js 22, minimum `22.22.2` for locked Vite; Pages pins `22.23.3`            |
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
