# UX-01 desktop fidelity review

Date: October 7, 2026. The four desktop images supplied in the UX-01 conversation
are the visual specifications. This record documents the implementation, QA,
remaining differences, and the handoff to UX-02.

## Route audit

| Route          | Before                                                                                                                                      | Implemented                                                                                                                                                                                                                                                              | Remaining difference and reason                                                                                                                                                                                                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`            | Heavier serif forms, narrow second headline line, compressed navigation, and inconsistent action/chip proportions.                          | Lighter desktop serif stack, headline tracking/scale, navigation spacing, wordmark alignment, CTA widths, and chip sizing. The continuous artwork and real React content remain.                                                                                         | Existing landscape artwork differs in bottle/rock placement. SVG ingredient marks replace the pictured cutouts. The truthful 25,127 count replaces sample 10K+. Search/bag features are out of scope. Below-hero sections keep their existing composition because no reference for them was supplied.                   |
| `/discover`    | Tall search/selection blocks and stacked budget controls pushed the CTA far below the reference.                                            | Reference column proportions, compact shortcuts with full vocabulary search, native preference controls, market/budget split, summary/stat rail, active navigation rule, functional header reset, and Advanced options.                                                  | The existing maximum-budget field replaces the two-ended slider to preserve request semantics. Only canonical occasions and available concentrations are offered. Work/Date Night/Extrait values are not invented. Search results, additional selections, or opened advanced options expand the form when necessary.    |
| `/results`     | Oversized cards, full-width featured footer, heavy type, and vertical reason lists made the edit much taller.                               | Featured rank/art/body grid with footer beside the image; compact two-column supporting cards; reason pills; editorial type, preference header, and tighter right rail. Supporting-card notes remain available in details and retain their existing mobile presentation. | Actual worker results differ from the sample five products. Top match denotes rank 01; sample percentages are not fabricated. Existing product fallback artwork remains. The rail uses approved brand artwork rather than the sample stone photograph. Long names, reasons, and metadata can increase card height.      |
| `/perfume/:id` | Accords were in the left column, the profile was below reasons, note tiers narrowed toward the base, and art/metadata proportions differed. | Independent artwork/notes and information columns, landscape visual area, qualitative match strip, three-column available metadata, reasons beside accords/profile alignment, and a widening note-pyramid illustration.                                                  | Product photos, match percentages, accord-strength bars, editorial descriptions, and family/style/wear fields are absent from existing view models/assets and remain omitted. Direct lookup has no personalized reasons/profile without a session. Sparse records occupy less space than the fully populated reference. |

Shared type, spacing, color, radius, border, and control rules live in
`apps/web/src/desktop.css`, gated at 64 rem. Desktop display fonts use Garamond,
Times New Roman, and Georgia system fallbacks; exact glyph metrics vary by OS.
Existing static images are reused without adding assets or external requests.
The same local SVG system supplies marks in selectors and metadata.

## Functional and visual verification

The final browser review uses the production build at `http://127.0.0.1:4173`
and real worker recommendations for vanilla, amber, woody, night, and EDP.
It does not inject fixture results. Iteration captures and reports remain local,
Git-excluded artifacts under `.stitch-reference/ui-review/ux01-*` and
`.stitch-reference/landing-reconstruction/ux01-*`.

The route matrix covers 1280, 1440, 1672 (the reference width), and 1920 px, plus
1024 and 375 px structural checks. All four routes have one primary heading and
no horizontal overflow. The flow reaches actual Top 5 results and detail,
retains results through landing-anchor navigation, resets preferences, and
resolves refreshed details without personalized context.

Recovery checks cover no-session results, empty results, vocabulary loading,
taxonomy failure/retry, unknown routes, missing perfume IDs, and detail
failure/retry. The real Libre Intense record
`international-e9878d48948c88db` also resolves directly; its production record
does not supply the concentration/occasion metadata shown in the mockup.

| Command/check                 | Result                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| `pnpm lint`                   | Pass                                                                                 |
| `pnpm typecheck`              | Pass                                                                                 |
| `pnpm test`                   | Pass: 124 tests in 21 files                                                          |
| `pnpm build`                  | Pass                                                                                 |
| `pnpm format:check`           | Pass                                                                                 |
| Local `ux01-review.cjs`       | 24 successful-route/width checks; no page errors or overflow; lazy runtime preserved |
| Local `ux01-state-review.cjs` | Recovery states and direct Libre Intense lookup/retry pass                           |

Tests exercise both Reset filters and header Start over, including selections,
boundaries, budget, and queries. Any's clearing behavior is verified through
the service boundary: no invented preference value is sent. The request adapter,
recommender package, worker, runtime JSON, dataset, IDs, and deployment files are
unchanged. Initial development-server QA encountered a stale Vite optimized
dependency HTTP 504. Restarting the task's server with
`pnpm dev --host 127.0.0.1 --force` refreshed the cache; after dependency
optimization, the actual development flow also reached `/results` with no
alerts or browser errors. The production preview uses
`pnpm --filter @harumnesia/web preview --host 127.0.0.1 --port 4173`.
No quality gate was weakened. `pnpm integration:smoke` also passes with
25,127 production records, real Top 5 results, deterministic repeated calls,
finite scores, and successful local/international detail lookup.

## Files and shared changes

- `apps/web/src/desktop.css`: shared desktop tokens, proportions, grids, controls,
  typography, artwork framing, cards, notes, metadata, and footer.
- `apps/web/src/main.tsx`: desktop stylesheet import.
- `apps/web/src/pages/LandingPage.css`: landing canvas typography/control fidelity.
- `apps/web/src/pages/DiscoverPage.tsx`: shared reset, compact selectors, reference
  choice ordering/labels, and unlisted-price policy in Advanced options.
- `apps/web/src/pages/PerfumeDetailPage.tsx`: independent columns, existing-field
  metadata icons, and profile alignment beside explanations.
- `apps/web/src/components/layout/SiteLayout.tsx`: centered desktop navigation,
  active rule, header reset/refine/back actions; existing mobile toggle retained.
- `apps/web/src/components/discovery/TagSelector.tsx`: compact presentation,
  shortcut marks, and identification of selected shortcuts; full search retained.
- `apps/web/src/components/discovery/ChoiceGroup.tsx`: optional Any clearing choice.
- `apps/web/src/components/editorial/ProfileSummary.tsx`: reusable title and unique
  accessible heading ID.
- `apps/web/src/components/perfume/NotesPyramid.tsx`: desktop pyramid illustration
  with the same available-stage text.
- `apps/web/src/frontend.test.tsx`: reset and request-semantics coverage.
- `docs/design-system.md` and this review: current styling ownership and QA record.

Results retain their existing page/card/reason/visual components; their fidelity
changes are CSS. No V1 repository was modified. No commit or push was made.

## Final desktop polish

The approved Landing hero and Discover composition are unchanged in this pass.
Supporting Results cards 02–05 have slightly wider artwork, tighter title/brand/
accord spacing, and consistently anchored market/detail footers. Measured card
heights decreased by 6–8 px across the 1280–1920 px desktop checks. The Results
rail artwork and closing statement are slightly shorter and quieter.

Details without personalized reasons now place their existing notes below the
right-side content. Sparse metadata uses two columns when fewer than three facts
are available. Personalized layouts retain their existing left-side notes; both
layouts preserve independent column flow and omit unsupported fields.

Format, lint, typecheck, all 124 tests, and the production build pass after the
source changes. The existing browser matrix again passes all 24 route/width
checks, with no page errors or overflow. Recovery checks and direct/refreshed
detail lookup also pass. Updated captures are local artifacts in
`.stitch-reference/ui-review/ux01-polish/`. Existing data, artwork, and font
limitations listed above remain.

## UX-02 and other follow-up work

No mobile redesign was performed. New detail wrappers become `display: contents`
below 64 rem. Shared selector marks, Any choices, market labels, metadata icons,
and the moved price policy affect small-screen presentation. Existing mobile
navigation, submission, and overflow checks pass; broader device testing and
mobile visual approval remain UX-02 work.

Product-photo provenance, new metadata, persistence, sample mood/occasion
taxonomy expansion, and calibrated match/accord visualization are separate
tickets. This pass makes the supported desktop composition much closer to the
references; the stated asset/data/font limits prevent exact reproduction.
