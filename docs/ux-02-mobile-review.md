# UX-02 mobile fidelity review

Date: October 7, 2026. Protected desktop baseline: `996d88c` (UX-01).
The four mobile references supplied in the conversation define the presentation.
Their phone bezel, system status bar, and outside mockup framing are not
application UI. Existing source/schema define all supported product behavior.

## Route comparisons

| Route          | Approved reference                                  | Before at 390 px                                                                                                                         | Implemented                                                                                                                                                                                                                                          | Remaining difference                                                                                                                                                                                                                             |
| -------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/`            | `Harumnesia Luxury Fragrance Discovery.png`         | Broad actions, heavier type, sans-serif copy, and a separate portrait panel.                                                             | Lighter serif hierarchy, narrow copy, centered stacked actions, two chip rows, portrait blended into a full-width scene, truthful count panel, and shorter below-hero spacing.                                                                       | The existing portrait has different bottle/stone placement. SVG marks replace ingredient cutouts. Actual count is 25,127. Buttons retain 44 px or larger targets. Existing sections below the hero remain.                                       |
| `/discover`    | `Harumnesia Fragrance Discovery Profile.png`        | Tall stacked groups with repeated helper text and duplicate selected suggestions; loose rail/action spacing.                             | Labels beside three-column suggestion groups, in-place selected states, full search, compact choice/market/budget controls, disclosure, deliberate artwork/profile/count/action order, and two-line title.                                           | Visible full-vocabulary search and maximum-budget input/presets add height. Only canonical Day/Night/Versatile, supported concentrations, and real selections appear; sample Work/Date Night/Extrait and two-ended slider are omitted.           |
| `/results`     | `Harumnesia Top Fragrance Matches.png`              | Narrow art, reasons below every card, repeated supporting notes, and loose metadata/action footers.                                      | Actual-count title, compact preference header, featured reason panel, wider supporting artwork with reasons beside it, anchored footer, profile/count after the ranking, and bottom refine action.                                                   | Real products and explanation text differ. Supporting key notes are available in detail. CSS fallback artwork remains. Percentages, review/confidence scores, fabricated descriptions, and product photographs are absent.                       |
| `/perfume/:id` | `Harumnesia Libre Intense Editorial App Mockup.png` | Oversized art, loose identity/facts, tall reason panels, and note tiers narrowing toward the base. Notes preceded identity in DOM order. | Landscape artwork, compact identity/facts, actual reason rows, widening note illustration beside readable stage text, accords/profile afterward, and coherent mobile DOM order. Direct/refreshed records flow naturally without personalized panels. | Existing CSS product art replaces the sample photograph. Only actual metadata, note stages, accords, and reasons appear. Sample score/strength bars, family/style/wear facts, editorial product descriptions, and ingredient images are omitted. |

The same real preference scenario is used for successful captures: vanilla,
amber, woody, night, EDP, and both markets. The production worker returns Sarah
Lavenda at rank 01 in this scenario. The mockup's Libre Intense is not substituted
for that result. The real Libre Intense ID `international-e9878d48948c88db` is
used for direct/sparse review; its record lacks sample concentration/occasion
metadata.

## Responsive and desktop verification

- Mobile: 360 × 800, 375 × 812, 390 × 844, and 430 × 932.
- Structural tablet/breakpoint: 768 × 1024 and 1024 × 768.
- Desktop: 1280 × 800, 1440 × 900, 1672 × 941, and 1920 × 1080.
- All four routes have one primary heading and no horizontal overflow across
  the 40 route/viewport checks.
- All 20 desktop comparisons, including 1024 px, match stable approved UX-01
  captures pixel for pixel. Desktop CSS and Landing desktop CSS are unchanged.
- The real long-name Chanel anniversary record
  `international-61f758dfe40f14ff` wraps safely at all four mobile widths.

Mobile-only rules remain below 64 rem. `DossierLayout` uses that media query to
regroup the same sections for reading order; it does not alter lookup, session,
or recommendation logic. Desktop retains its independent columns, including
the approved sparse-record note placement. Notes render exactly once across
breakpoint changes, covered by the added route test.

## Functional and accessibility verification

The real flow passes: Landing → Discover → controlled preferences → production
Web Worker → Results → personalized Detail → refresh/direct lookup → refine.
The route matrix also verifies reset and session retention through landing
section navigation. Supplemental browser checks cover:

- Full notes search with case-insensitive exact Enter selection, removal,
  excluded notes, strict concentration, maximum budget, and reset.
- Mobile menu open/close, route selection, keyboard Enter/Tab/Escape, focus
  return, and skip-link keyboard access at all four mobile widths. The open menu
  pushes the main content below its links.
- Visible primary buttons, links, menu, choices, search, presets, disclosure,
  and exclusion removal retain at least 44 × 44 px touch targets.
- One copy of actual note data, coherent mobile heading order, direct/refreshed
  details without personalized reasons/profile, and long record names.
- No-session and empty Results, vocabulary loading/error/retry, unknown routes,
  unknown perfume IDs, and detail failure/retry at all four mobile widths.
- Reduced motion preserves automatic scrolling and disables CTA transitions.

Semantic headings, labels, legends, description lists, `aria-pressed`, alerts,
loading announcements, and visible focus styles remain. Suggested selections
are removed using their same pressed-state controls; searched selections keep
labelled removal buttons. Decorative images/icons remain hidden from assistive
technology.

## Quality gates

| Command/check                       | Result                                                                                 |
| ----------------------------------- | -------------------------------------------------------------------------------------- |
| `pnpm format:check`                 | Pass                                                                                   |
| `pnpm lint`                         | Pass                                                                                   |
| `pnpm typecheck`                    | Pass                                                                                   |
| `pnpm test`                         | Pass: 125 tests in 21 files                                                            |
| `pnpm build`                        | Pass                                                                                   |
| `pnpm integration:smoke`            | Pass: 25,127 records, deterministic repeats, finite scores, local/international lookup |
| Updated local route/viewport helper | Pass: 40 checks; no overflow/page errors; landing/discovery runtime remains lazy       |
| Supplemental mobile helper          | Pass: 28 checks plus search/reset, menu keyboard, skip link, and reduced motion        |
| Updated local recovery helper       | Pass at 360, 375, 390, and 430 px                                                      |
| Desktop image comparison            | Pass: 20 pixel-identical comparisons                                                   |

No tests or quality gates were weakened. The worker and runtime JSON retain
their UX-01 build hashes (`BvcEeEfz` and `DrxAxm9e`). No libraries, font files,
image binaries, network image/font sources, data changes, or recommender changes
were introduced. The new presentation uses scoped CSS and a small media-query
listener for accessible section order.

## Files and screenshots

Changed files:

- `apps/web/src/mobile.css`: shared foundation and four scoped mobile compositions.
- `apps/web/src/main.tsx`: mobile stylesheet import.
- `apps/web/src/pages/ResultsPage.tsx`: mobile refine link to the existing route.
- `apps/web/src/pages/PerfumeDetailPage.tsx`: same sections passed to the layout.
- `apps/web/src/components/perfume/DossierLayout.tsx`: responsive section grouping.
- `apps/web/src/frontend.test.tsx`: direct-detail reading order, note preservation,
  and media-listener cleanup coverage.
- `docs/design-system.md` and this review: implemented mobile system and QA.

Local, Git-excluded screenshots/reports are in
`.stitch-reference/ui-review/ux02-verified/`:

- `landing-390-hero.png`: header and complete hero; `landing-390.png`: full page.
- `discover-390.png`.
- `results-390.png`.
- `detail-390.png`: real personalized recommendation.
- `detail-direct-390.png`: sparse/direct Libre Intense.
- `detail-refreshed-390.png`: refreshed Sarah Lavenda without session context.
- `report.json`, `functional-report.json`, and `desktop-regression.json`.

Refinement captures are in sibling `ux02-landing-first`, `ux02-discover-first`,
`ux02-results-first`, `ux02-detail-first`, and `ux02-refined` directories.
Recovery artifacts are in `ux02-states-360`, `ux02-states-375`, `ux02-states-390`,
and `ux02-states-430`. The pre-existing `ux02-before` baseline is preserved.

## Limitations and handoff

Image geometry and installed font metrics prevent exact mockup reproduction.
Long names/reasons, added selections/search results, and opened advanced options
expand content naturally. Full catalog functionality takes precedence over
sample taxonomy or mockup data. Browser QA uses Chromium viewport emulation;
physical-device Safari/Android verification remains outstanding.

UX-03 retains ownership of Soft versus Strict preference clarification. UX-04
retains ownership of unknown-price semantics; existing includeUnpriced and
maximum-budget behavior remain unchanged. Image provenance/new product imagery,
metadata enrichment, Find Similar, alternatives, persistence/shareable URLs,
deployment documentation, and product positioning remain separate backlog work.
No V1 repository was modified. No commit or push was made.
