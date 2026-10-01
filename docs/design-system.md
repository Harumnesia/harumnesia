# Harumnesia V2 visual system — Phase 8.5

## Direction and sources

Direction A+ is a contemporary curatorial fragrance monograph: generous paper space, an editorial serif, precise archival labels, hairline rules, and botanical still life. The final Google Stitch project is **Harumnesia Curatorial Fragrance Monograph Redesign** (`2299997496112519545`). Only these canonical screens informed this implementation:

| Screen                                              | ID                                 |
| --------------------------------------------------- | ---------------------------------- |
| Harumnesia — Landing Page (Canonical)               | `82f1ccea69b143d49cb52cc07df548eb` |
| Harumnesia — Discovery Consultation (Canonical)     | `96cb6247632d4f0aa91c9ed279c32d99` |
| Harumnesia — Curated Results (Canonical)            | `18c3237a97f6446b8c16ec494fb7c7c4` |
| Harumnesia — Perfume Detail (Canonical)             | `cad68abbdc7b4905a54514631f68d9ed` |
| Harumnesia — System States & Edge Cases (Canonical) | `ad0f5442478a4d9ebb0b9e3c935866f4` |

The screenshot, generated HTML, and screen metadata for each screen were retrieved before implementation into the local, Git-excluded `.stitch-reference/<screen>/` directory. Stitch project theme metadata and the five HTML exports supplied design values. The exports are reference material, not application code.

## Tokens, type, and spacing

The shared tokens live in `apps/web/src/index.css`. The important color values are parchment `#fcf9f4`, inset paper `#f6f3ee`, deep plum `#240f1b`, body ink `#161616`, herbal olive `#4a5240`, and restrained ochre `#a37f1c` (Stitch's accessible on-surface ochre). Hairlines use `#d1c3c8`. State errors use a dark red with a light paper fill.

Stitch specifies Bodoni Moda for display and Plus Jakarta Sans for body and labels. The application uses a local/system display stack (`Bodoni MT`, Didot, Times New Roman, Georgia) and an Arial/system body stack. This preserves the contrast, narrow display shapes, and tiny tracked folio labels without remote Google Fonts requests or unlicensed binaries. Display sizes use `clamp()`; body copy stays around 15–18 px. Folio labels are 11 px uppercase with wide tracking.

The spacing system uses a 78 rem page measure, 42 rem reading measure, 1–2 rem internal panel rhythm, and a section gap clamped between 4.5 and 8 rem. The responsive gutters are 1 rem on narrow screens and 2 rem from tablet width. These are deliberate abstractions of Stitch's `gutter`, `space-*`, and `margin` values.

## Layout and editorial rules

The header and footer frame every route. The landing page alternates a split hero, three numbered steps, an inset explanation panel, three editorial samples, and a full-width plum closing panel. Thin lines, small volume numbers, uppercase display heads, and short captions create the folio rhythm. Large text and artwork are balanced asymmetrically on desktop and stack naturally on mobile.

Discovery uses white numbered panels on parchment. Native fieldsets, legends, radios, checkboxes, inputs, and the existing searchable `TagSelector` remain intact. Advanced filters remain an optional `details` disclosure. Buttons are plum rectangular blocks; links are tracked text with an ochre underline; selected chips are muted botanical paper rectangles. All actionable controls target roughly 44 px height.

Results reserve a large split composition for rank 01 and a two-column supporting folio for later ranks. Cards show only actual mapped perfume data and existing deterministic engine reasons. The link to a production detail retains the canonical ID. The landing's sample cards remain explicitly editorial and do not start the recommendation runtime.

The detail page uses a large abstract specimen well and a factual record opposite it. Below, the note pyramid is a full-width stack of three offset horizontal tiers, labeled exactly **Top Notes**, **Middle Notes**, and **Base Notes**. The tiers show listed values only. Accords and occasions are separate addenda when data exists.

## Artwork and states

`PerfumeVisual` remains the only product image boundary. An approved canonical-ID local asset is used if present; otherwise `FragranceArtwork` renders CSS-only bottle, botanical, light, and paper shapes. No commercial photo or Stitch remote image URL is copied or hotlinked. The production image manifest still has zero entries and retains its provenance validation.

`SystemState` gives discovery, results, detail, and 404 states a common folio frame, inset panel, and restrained orbit mark. Loading uses indeterminate pulse motion with a real status announcement. Errors keep alert announcements and retry actions. No progress percentage, diagnostic score, or extra route is introduced.

## Responsive, motion, and accessibility

At 1440 px, the hero, result feature, and detail use split compositions; supporting results use two columns. At 1024 and 768 px, columns adapt around content width. At 375 px, all major compositions stack, input and action rows wrap, note tiers move values below their labels, and navigation uses the existing button. Grid children have a zero minimum width and content wraps to avoid horizontal overflow.

Motion is limited to artwork hover scaling, button and link response, and an indeterminate state pulse. The `prefers-reduced-motion` query removes these effects and preserves readable state text. The original skip link, landmarks, heading structure, labels, fieldsets, legends, native form semantics, focus-visible outlines, status/alert announcements, and keyboard tag selection remain.

## Semantic constraints and deviations

Repository routes, fields, taxonomies, recommendation behavior, worker loading, and asset provenance take precedence over Stitch mock data. The Stitch examples include fictional fragrances, narrative explanations, some unsupported concentration examples, “Heart Notes,” and projection/evaporation claims. Those were not brought into the product. The generated HTML's external fonts, scripts, and perfume photographs were omitted. System states are embedded in existing routes instead of a Stitch specimen route. The desktop screenshot's fixed widths were recomposed for smaller screens and touch use.

## Bundle impact

The redesign primarily changes CSS and React markup. These measurements use the Phase 8 inventory and the Phase 8.5 `pnpm build` / `pnpm assets:inventory` output; gzip is the inventory's level-9 measurement.

| Asset                       |       Before raw / gzip |        After raw / gzip | Raw delta |
| --------------------------- | ----------------------: | ----------------------: | --------: |
| Main JavaScript             |      295,344 / 90,964 B |      297,752 / 91,706 B |  +2,408 B |
| Main CSS                    |        13,101 / 3,660 B |        32,004 / 7,363 B | +18,903 B |
| Recommendation worker       |      101,388 / 27,801 B |      101,388 / 27,801 B |       0 B |
| Recommendation runtime JSON | 9,690,284 / 1,688,965 B | 9,690,284 / 1,688,965 B |       0 B |

The CSS increase pays for five route compositions, responsive rules, artwork, and shared state treatments. Main JavaScript grows by 2.4 kB raw for presentational structure and `SystemState`; the worker and runtime are byte-identical to the baseline. The local reference export is excluded from Git and the production bundle.
