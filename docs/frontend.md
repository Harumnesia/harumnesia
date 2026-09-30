# Frontend V2

## 1. Current scope

Phase 6 established the browser-facing experience: routing, responsive layout,
an accessible discovery form, result explanations, perfume details, and
error/empty states. Phase 7 now connects that experience to the validated
25,127-record production dataset and `@harumnesia/recommender` through a dedicated
Web Worker.

The frontend still has no API, persistence, authentication, analytics, or final
perfume imagery. Recommendation state lasts for the current SPA session only.

## 2. Design direction

The interface uses an editorial fragrance direction: warm paper and plum tones,
serif display typography, restrained borders, generous spacing, and flat abstract
fragrance compositions. Copy describes alignment with preferences and avoids AI,
probability, accuracy, or “perfect match” claims. Shared CSS variables define
color, type, spacing, radius, borders, container width, and transition tokens.

## 3. Route map

| Route          | Purpose                                    | Refresh/direct-navigation behavior                                      |
| -------------- | ------------------------------------------ | ----------------------------------------------------------------------- |
| `/`            | Product introduction and editorial samples | Does not initialize or fetch the production runtime                     |
| `/discover`    | Preferences and optional strict filters    | Loads generated taxonomy; starts with the last form or an empty form    |
| `/results`     | Production Top-five results                | Shows an explicit no-session state when opened directly                 |
| `/perfume/:id` | Production perfume detail                  | Resolves lazily through `RecommendationService.getPerfume()` and worker |
| `*`            | Unknown-route recovery                     | Offers links home and to discovery                                      |

An unknown perfume ID has its own useful not-found state and does not crash the
application.

## 4. Major components

- `SiteLayout` owns the header, usable mobile navigation, skip link, main landmark,
  and footer.
- `TagSelector` supplies controlled note/accord selection, bounded in-memory
  filtering, Enter-key selection, and removable selections.
- `ChoiceGroup` supplies semantic multi-select fieldsets for canonical choices.
- `PerfumeCard` renders display-safe metadata, key notes, optional accords and
  occasions, deterministic reasons, detail navigation, and delegates imagery to
  `PerfumeVisual`.
- `PerfumeVisual` resolves a canonical ID against the rights-cleared local asset
  manifest, renders responsive sources when available, and otherwise delegates
  to `FragranceArtwork`.
- `FragranceArtwork` provides the deterministic CSS-only fallback without
  third-party image assets.
- Page components own route-level copy and composition rather than one large app
  component.

## 5. Recommendation form UX

The primary form asks for notes, accords, expression, occasion, and concentration.
All are optional and presented as preferences. A native `details` disclosure keeps
firm market, budget, expression, occasion, concentration, and exclusion controls
out of the initial mobile experience. Budget is an IDR integer with optional
presets and clear handling for fragrances whose price is not listed.

The note and accord controls use asynchronously loaded generated taxonomies.
Values cannot be empty or duplicated, and they can be added with a pointer or
keyboard and removed by a labelled button. Loading, failure, and explicit retry
states prevent a taxonomy failure from crashing or silently substituting fixture
values.

`TagSelector` accepts a larger taxonomy without rendering it into the DOM. An
empty query shows no suggestions. A non-empty query performs case-insensitive
substring matching, excludes selected values, and renders at most ten matches.
When additional matches exist, the UI asks the user to keep typing.

## 6. Preference versus filter UX

Preferences answer “what draws you in?” and guide eventual ranking without ruling
out nearby discoveries. Advanced filters are labelled as firm boundaries. The UI
does not expose engine terminology such as soft scoring, hard filters, or
`unknownPolicy`.

## 7. Frontend state model

`DiscoveryFormState` is UI-oriented and keeps preference arrays separate from
strict filter arrays. The `RecommendationExperienceProvider` owns session-level
submission status (`idle`, `submitting`, `success`, `error`), results, last form,
and recoverable error copy. Component-local state remains local; no external state
store is required.

`toRecommendationRequest(formState)` is the single pure adapter to
`RecommendationRequestInput`. It trims, normalizes, and deduplicates canonical
terms, uppercases concentration values, maps IDR budget and human-facing unknown
price choice, and applies a five-result limit. Basic budget validation occurs
before service submission; package-level validation remains the future final
authority.

## 8. Production service boundary

`RecommendationService` exposes two frontend-facing methods:

```ts
recommend(request: RecommendationRequestInput): Promise<RecommendationViewModel[]>
getPerfume(id: string): Promise<PerfumeDetailViewModel | null>
```

The normal provider uses `ProductionRecommendationService`. Its lazy worker client
loads the separate runtime asset, initializes one recommender, correlates typed
requests by ID, and maps only display-safe output back to React. A shared
initialization Promise deduplicates concurrent work. Fatal initialization failures
clear the worker so an explicit retry can start a fresh initialization.

`MockRecommendationService` remains behind the same contract for unit/UI tests
and controlled states. It is not the default application service and does not
power production discover, result, or detail flows.

`PerfumeDetailPage` never imports or searches fixture data. It requests the route
ID through the context's service operation and handles loading, success,
not-found, and retryable error states. Effect cleanup prevents a stale or
unmounted request from updating page state.

## 9. View models

`RecommendationViewModel` contains only result-card fields: identity, rank,
display labels, currency-aware price text, optional concentration, selected
metadata, deterministic reasons, and a decorative visual tone derived stably
from the perfume ID. `PerfumeDetailViewModel` independently preserves staged
top/middle/base notes plus optional display metadata, accords, occasions, and its
visual tone. Neither model exposes recommender scores, components, diagnostics,
coverage, MMR values, or pre-diversification rank.

Generic pure helpers perform production and fixture mapping. The ten source
fixtures remain useful test/editorial inputs but are not a production mapping
dependency.

## 10. Responsive strategy

The layout is mobile-first at 320 px and uses content-driven enhancements at 768
px and 1120 px. At approximately 375 px controls wrap and advanced filters stay
collapsed; at 768/1024 px navigation, cards, detail, and footer gain multi-column
layouts; at 1440 px containers cap at 76 rem and result hierarchy expands without
over-wide text. Grid children use `minmax(0, 1fr)` and wrapping controls to avoid
horizontal page overflow.

## 11. Accessibility considerations

The frontend includes semantic headings, landmarks, fieldsets and legends,
explicit label/input relationships, button types, a skip link, visible focus
styles, native disclosure behavior, status/alert announcements, meaningful page
titles, text equivalents for the note pyramid, non-color selection cues, and a
reduced-motion media query. Custom tag selection remains keyboard operable; native
checkboxes and radios retain focus semantics behind their styled labels.

## 12. Image asset strategy

Phase 8 keeps decorative, `aria-hidden` CSS compositions as the safe fallback.
The production image manifest intentionally has zero entries because no current
image has established redistribution rights. Result cards and production details
share `PerfumeVisual`, which accepts only validated local canonical-ID paths,
emits responsive `<picture>` markup for approved entries, and falls back after a
load failure. Canonical external references never become DOM image sources. See
[Asset Optimization and Image Delivery](./assets.md) for the audit, provenance,
delivery, and onboarding rules.

## 13. Testing

Vitest now discovers web TypeScript and TSX tests. The frontend suite uses jsdom,
Testing Library, and user-event for behavior and semantics. Coverage includes:

- normalization/deduplication and empty request mapping;
- preference/filter separation, market, budget, price policy, concentration, and
  validation mapping;
- mock service output and defensive collections;
- production view-model mapping and deterministic tones;
- worker request correlation, initialization deduplication, and failed-init retry;
- production service recommendation/detail mapping and unknown-ID handling;
- generated taxonomy counts and exclusion of `unknown` gender and `XDP`;
- landing, mobile-navigation, and discovery form semantics;
- controlled add/remove behavior;
- successful submission/navigation, empty results, and service errors;
- direct result no-session state, deterministic reason copy, and no technical scores;
- valid detail data, graceful missing metadata, invalid IDs, and unknown routes.
- custom non-fixture service details, detail loading and service error states;
- mock detail success/not-found behavior;
- a generated/synthetic 2,505-term taxonomy, empty-query behavior, ten-item suggestion cap,
  substring filtering, Enter selection, and selected-option exclusion.

The full-data integration smoke initializes the actual 25,127 records, exercises
three representative requests, verifies real unique Top 5 IDs and deterministic
repeats, checks finite internal scores/reasons, and resolves both local and
international details.

## 14. Production build size

Measured with `pnpm build` after production integration:

| Output                          |         Raw |        Gzip |
| ------------------------------- | ----------: | ----------: |
| Main JavaScript                 |   292.18 kB |    90.07 kB |
| Worker JavaScript               |   101.39 kB |    27.85 kB |
| Runtime JSON                    | 9,690.28 kB | 1,705.69 kB |
| Notes taxonomy                  |    49.10 kB |    12.00 kB |
| Other three taxonomies combined |     1.84 kB |     0.78 kB |

The dataset and worker are separate hashed assets. The main JavaScript did not
absorb the approximately 9.24 MiB raw runtime. Route-level component splitting
was not introduced because it was not necessary to establish this boundary.

## 15. Production integration behavior

The worker and runtime initialize on the first recommendation or direct detail
lookup, never at app bootstrap. A discover submission uses the public request
adapter and displays the real Top 5 with engine reasons. Repeated submissions and
in-session detail lookup reuse the same worker/index. Development-only Performance
API measures make fetch, parse, index, rank, and lookup duration inspectable
without exposing them in product UI.

See [Production Integration](./integration.md) for worker protocol, network,
performance, memory, caching, and deployment-boundary details.

## 16. Known limitations

- Refreshing or directly opening `/results` cannot restore a prior in-memory
  session; persistence is intentionally deferred.
- Each tab/document session owns a worker and index. Cross-tab sharing is not
  implemented.
- The runtime payload remains 9.24 MiB raw and requires mobile-class validation
  before deployment, although desktop browser measurements are viable.
- Taxonomy filtering remains an in-memory substring scan while rendered
  suggestions stay capped at ten.
- Artwork remains intentionally abstract until rights-cleared product assets are
  reviewed and added through the Phase 8 manifest boundary.
