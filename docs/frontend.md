# Frontend V2

## 1. Phase 6 scope

Phase 6 provides the browser-facing Harumnesia experience: routing, responsive
layout, an accessible discovery form, mock recommendations, result explanations,
perfume details, and error/empty states. It intentionally stops at a frontend
integration boundary.

Phase 6 does **not** load the production 25,127-record runtime recommendation
dataset. It does not construct a recommender index, call an API, or duplicate the
recommendation algorithm in the browser.

## 2. Design direction

The interface uses an editorial fragrance direction: warm paper and plum tones,
serif display typography, restrained borders, generous spacing, and flat abstract
fragrance compositions. Copy describes alignment with preferences and avoids AI,
probability, accuracy, or “perfect match” claims. Shared CSS variables define
color, type, spacing, radius, borders, container width, and transition tokens.

## 3. Route map

| Route          | Purpose                                    | Refresh/direct-navigation behavior                                      |
| -------------- | ------------------------------------------ | ----------------------------------------------------------------------- |
| `/`            | Product introduction and sample fragrances | Fully independent                                                       |
| `/discover`    | Preferences and optional strict filters    | Starts with the session's last form or an empty form                    |
| `/results`     | Top-five recommendation presentation       | Uses an explicitly labelled fixture preview if no session result exists |
| `/perfume/:id` | Service-backed perfume detail              | Resolves asynchronously through `RecommendationService.getPerfume()`    |
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
  occasions, deterministic reasons, and detail navigation.
- `FragranceArtwork` provides a small CSS-only placeholder without third-party
  image assets.
- Page components own route-level copy and composition rather than one large app
  component.

## 5. Recommendation form UX

The primary form asks for notes, accords, expression, occasion, and concentration.
All are optional and presented as preferences. A native `details` disclosure keeps
firm market, budget, expression, occasion, concentration, and exclusion controls
out of the initial mobile experience. Budget is an IDR integer with optional
presets and clear handling for fragrances whose price is not listed.

The note and accord controls use small canonical fixture taxonomies. Values cannot
be empty or duplicated, and they can be added with a pointer or keyboard and
removed by a labelled button.

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

## 8. Mock service boundary

`RecommendationService` exposes two frontend-facing methods:

```ts
recommend(request: RecommendationRequestInput): Promise<RecommendationViewModel[]>
getPerfume(id: string): Promise<PerfumeDetailViewModel | null>
```

`MockRecommendationService` implements that contract with a small fixture-backed
Top-5 response and fixture-backed detail lookup. Both operations are asynchronous
without an artificial delay, and mapped results use defensive array copies. The
provider accepts another service, which makes loading, empty, success, not-found,
and error behavior testable.

`PerfumeDetailPage` never imports or searches fixture data. It requests the route
ID through the context's service operation and handles loading, success,
not-found, and retryable error states. Effect cleanup prevents a stale or
unmounted request from updating page state.

## 9. View models

`RecommendationViewModel` contains only result-card fields: identity, rank,
display labels, optional price/concentration, selected metadata, reasons, and a
placeholder visual tone. `PerfumeDetailViewModel` independently preserves staged
top/middle/base notes plus optional display metadata, accords, occasions, and its
visual tone. Neither model exposes recommender scores, components, diagnostics,
coverage, MMR values, or pre-diversification rank.

The ten source fixtures satisfy `RecommendationPerfume` and deliberately cover
local/international, known/unknown price and concentration, local occasions,
international accords, multiple genders, and varied note pyramids.

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

## 12. Placeholder asset strategy

Phase 6 uses decorative, `aria-hidden` CSS compositions with flat geometric forms.
There are no scraped, hotlinked, copied V1, or uncertain-license perfume images.
Final optimized image assets and image delivery belong to Phase 8; the visual
component is isolated so that addition will not affect recommendation state.

## 13. Testing

Vitest now discovers web TypeScript and TSX tests. The frontend suite uses jsdom,
Testing Library, and user-event for behavior and semantics. Coverage includes:

- normalization/deduplication and empty request mapping;
- preference/filter separation, market, budget, price policy, concentration, and
  validation mapping;
- mock service output and defensive collections;
- landing, mobile-navigation, and discovery form semantics;
- controlled add/remove behavior;
- successful submission/navigation, empty results, and service errors;
- direct result preview, deterministic reason copy, and no technical scores;
- valid detail data, graceful missing metadata, invalid IDs, and unknown routes.
- custom non-fixture service details, detail loading and service error states;
- mock detail success/not-found behavior;
- a synthetic 2,505-term taxonomy, empty-query behavior, ten-item suggestion cap,
  substring filtering, Enter selection, and selected-option exclusion.

## 14. Production build size

Measured with `pnpm build` on the Phase 6 implementation:

| Output       |       Raw |     Gzip |
| ------------ | --------: | -------: |
| `index.html` |   0.51 kB |  0.31 kB |
| CSS          |  12.78 kB |  3.62 kB |
| JavaScript   | 287.22 kB | 89.52 kB |

The application currently uses one JavaScript route bundle. Route-level lazy
loading was not added because the page set and local fixtures are small; it can be
reconsidered if Phase 7 materially increases route weight.

## 15. Phase 7 integration seam

Phase 7 can provide a real `RecommendationService` to
`RecommendationExperienceProvider` without changing pages or presentational
components. The real adapter should:

1. load the production runtime data at an explicitly chosen boundary;
2. construct or connect to the production recommender exactly once;
3. pass the existing adapter's `RecommendationRequestInput` to the public package;
4. map `RecommendationResult` plus its perfume and deterministic `reasons` into
   `RecommendationViewModel`;
5. resolve any production perfume ID into `PerfumeDetailViewModel` through
   `getPerfume()`;
6. preserve existing loading, empty, not-found, and error behavior.

The production data-loading decision belongs in the real service adapter, not in
the form or page components.

## 16. Known limitations

- Mock results are deterministic and do not change with submitted choices; the
  request is still built and passed across the service boundary for Phase 7.
- Direct `/results` navigation uses a clearly labelled preview rather than persisted
  recommendations.
- The mock service can resolve only the ten fixture details; the page itself is no
  longer fixture-bound.
- Taxonomies are deliberately small UI fixtures and need a production taxonomy
  source in Phase 7. Filtering remains an in-memory substring scan, while rendered
  suggestions stay capped at ten.
- Artwork is intentionally abstract and temporary; final product assets are Phase
  8 work.
