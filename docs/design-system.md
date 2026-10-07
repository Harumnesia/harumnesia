# Harumnesia V2 editorial visual system

## Direction and references

The current presentation follows the nine user-supplied references from October
6, 2026. Warm paper, plum actions, botanical olive, editorial serif headings,
fine rules, and restrained rounded panels connect the four application routes.
The earlier Phase 8.5 Stitch implementation established the original tokens and
CSS artwork; the supplied references now define the visual compositions.

| Route          | Desktop reference                              | Mobile reference                                    |
| -------------- | ---------------------------------------------- | --------------------------------------------------- |
| `/`            | `harumnesia_fragrance_discovery_editorial.png` | `Harumnesia Luxury Fragrance Discovery.png`         |
| `/discover`    | `Harumnesia Fragrance Discovery Dashboard.png` | `Harumnesia Fragrance Discovery Profile.png`        |
| `/results`     | `Harumnesia Fragrance Match Results.png`       | `Harumnesia Top Fragrance Matches.png`              |
| `/perfume/:id` | `Luxury Perfume Editorial Landing Page.png`    | `Harumnesia Libre Intense Editorial App Mockup.png` |

Only `Luxury Plum Perfume Still Life.png` supplies production imagery. None of
the UI mockups, product photographs, ingredient cutouts, sample scores, or sample
recommendations are bundled. See [assets](./assets.md) for its derivatives.

## Shared foundation

`apps/web/src/index.css` owns the semantic `--color-*`, `--font-*`, spacing,
measure, radius, and motion tokens. Paper is `#f6f0e5`, plum is `#240f1b`, olive
is `#4a5240`, and warm borders are `#d6caba`. The repeating local SVG grain is
deliberately low opacity. Base content is capped at 84 rem with responsive gutters;
UX-01 desktop compositions use route-specific widths capped at 94–96 rem.

UX-01 desktop and UX-02 mobile use Garamond with Times New Roman/Georgia
fallbacks to approach the references' lighter serif forms. Mobile copy uses the
display stack; Arial/system remains the helper-text stack. No font binaries or
remote font requests were added, so
exact metrics depend on installed fonts. Headings use sentence case, responsive
sizing, and native serif italics. Buttons and selection chips use restrained pill
shapes; panels use a 0.75 rem radius. `EditorialIcon` supplies one lightweight SVG
line-icon system.

`apps/web/src/desktop.css` owns the shared desktop typography, plum actions
(`#391c2b`), olive italics (`#4d4934`), gutters, compact controls, panels, and page
grids from 64 rem. It reuses existing brand artwork at the page perimeter.
`LandingPage.css` retains the route's continuous canvas coordinates. See the
[UX-01 desktop review](./ux-01-desktop-review.md) for the audit and limitations.

`apps/web/src/mobile.css` owns UX-02 presentation below 64 rem, grouped into
shared foundation, Landing, Discover, Results, and Detail rules. Mobile overrides
remain outside the approved desktop cascade. See the
[UX-02 mobile review](./ux-02-mobile-review.md) for comparisons and verification.

The shared header retains its mobile toggle and skip link, adds Escape dismissal
with focus return, and links to actual discovery and landing sections. Results
navigation on landing appears when a nonempty recommendation session exists;
other route headers also expose the existing no-session results route. Internal
section navigation preserves session state; route changes begin at the top.
The mobile menu expands within the header's normal flow, pushing the page below
its links. It retains keyboard access, Escape dismissal, and focus return without
covering interactive content.

## Route compositions

Landing desktop now reconstructs the supplied reference as a single full-width
canvas from 64 rem. Its landscape artwork sits behind the header and real copy,
actions, decorative chips, and truthful statistic. The inset image/two-column
composition has been removed at desktop widths. The layout is calibrated against
1672 × 941 reference coordinates in route-scoped `LandingPage.css`. The current
mobile composition uses narrower headline/copy measures, centered stacked actions,
two chip rows, a blended full-width portrait, and a truthful dataset panel.
Below-hero sections retain their real content with shorter mobile section gaps.
Hero sources remain local, eager/high priority, and responsive.

Discovery presents notes, accords, expression, occasion, concentration, market,
and maximum budget in editorial rows. A short set of suggested notes/accords is
intersected with the loaded taxonomy; the existing search still reaches the full
vocabulary and preserves exact-first Enter selection. Suggestions toggle real
controlled state and expose `aria-pressed`. Advanced strict filters and note
exclusions remain a native disclosure. Maximum-budget and unknown-price semantics
are unchanged; no slider or unsupported taxonomy was introduced.

`ProfileSummary` reflects live form values on discovery and the submitted form
on results/detail. `DatasetStat` imports only the existing small generated build
report and derives its count; it never imports or fetches the production catalog.
On desktop the discovery rail sits beside the intro and controls. On mobile its
artwork and summary precede submit/reset actions. Reset clears selections,
boundaries, budget, validation errors, and search queries. The desktop header's
Start over action invokes the same form reset. Any clears a basic expression or
concentration preference to its existing empty-array state. Both retains the
existing all-market value. The unlisted-price policy is in Advanced options.
Mobile labels sit beside compact control groups. Suggestions retain 44 px targets;
selected suggestions toggle in place while searched selections retain their
removal buttons. Helper descriptions remain available to assistive technology,
and full-vocabulary search stays visible below the suggestions.

Results use the actual output length in the heading. `RecommendationCard`
features rank 01 and uses a two-column supporting edit from 64 rem. Below that
breakpoint, cards form one ranking: featured reasons span the card, and supporting
reasons sit beside the artwork with anchored metadata/detail footers. Supporting
key notes remain available in detail. Profile and count follow the ranking, then
a mobile refine action. `MatchReasons` renders existing engine explanation text. The qualitative
“Top match” label denotes rank 01, never a calibrated percentage.

Detail is a dynamic fragrance dossier. Existing direct lookup, cancellation,
loading, not-found, and retry behavior remain. Available metadata uses a semantic
description list. `NotesPyramid` omits unavailable stages, and accord chips show
presence without fabricated strength bars. Explanation rows and submitted
preferences appear only when that perfume exists in the current session's
recommendations. A refresh still resolves the perfume and omits personalized
context. Desktop artwork and notes share the left column when personalized
reasons are available, while reasons sit beside accords/profile alignment on the
right. Without those reasons, existing notes follow the right-side content to
balance sparse records. Both layouts retain independent column flow. Product
visuals retain the approved-ID manifest/CSS fallback boundary.
`DossierLayout` follows the same 64 rem boundary to keep the mobile DOM order as
artwork, identity/facts, personalized reasons, notes, and accords/profile. It
regroups those same sections into the existing independent desktop columns;
each section is rendered once. Mobile facts use two columns, and note stages sit
beside the decorative widening pyramid. Sparse/direct records omit unavailable
context and follow the same natural flow.

## Responsive, accessibility, and validation

The split hero, discovery rail, results rail, and detail dossier transition at
64 rem. Supporting result cards use two columns from 64 rem; smaller screens
stack them. The original semantic labels, fieldsets, legends, native controls,
alerts, loading announcements, and focus outlines remain. Decorative artwork and
SVG icons are hidden from assistive technology. Existing small-screen controls
retain their 44 px targets; desktop chips follow compact 32–40 px reference
proportions. Reduced motion suppresses CTA arrow movement and existing
loading/hover animations.

UX-02 visual QA captures all four successful routes at 360, 375, 390, 430, 768,
1024, 1280, 1440, 1672, and 1920 px, following route-by-route refinement. All
20 desktop route/width comparisons at 1024–1920 px match the approved UX-01
captures pixel for pixel. Local screenshots and browser
reports are Git-excluded in `.stitch-reference/ui-review/`. Behavioral tests cover
CTA routing, taxonomy-backed shortcuts, reset, result count, detail navigation,
session explanations, sparse note stages, and existing recovery states. The
recommendation package, worker, data, and request mapping remain unchanged.
