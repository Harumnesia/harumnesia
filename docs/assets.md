# Asset Optimization and Image Delivery

## 1. Phase 8 scope

Phase 8 establishes a safe presentation boundary for perfume imagery. It adds a
deterministic source-reference audit, an explicitly provenanced production
manifest, responsive local image rendering, a runtime failure fallback, a small
owned favicon, and a post-build asset inventory. It does not change canonical
IDs, datasets, recommendation behavior, backend infrastructure, or deployment.

## 2. Current image availability

The canonical dataset contains 25,127 records. All 1,064 local records contain
an external image reference; none of the 24,063 international records do. The
audit found 1,060 unique URLs and four duplicate URL groups (four duplicate
references). No malformed URLs were found.

The primary source-reference domains are:

| Hostname                         | Unique URLs |
| -------------------------------- | ----------: |
| `images.tokopedia.net`           |         952 |
| `down-id.img.susercontent.com`   |          52 |
| `madeforhmns.com`                |          13 |
| `layrfragrance.com`              |          12 |
| `onixfragrance.co.id`            |          10 |
| `d2kchovjbwl1tk.cloudfront.net`  |           9 |
| Other observed domains, combined |          12 |

All 1,060 unique references use HTTPS. Their apparent extensions are 426 JPG,
308 WebP, 183 JPEG, 133 PNG, and 10 without a parseable extension. These facts do
not establish ownership, a license, permission, or redistribution rights.

## 3. Provenance policy

An external source URL is reference metadata, not a production asset and not
proof of redistribution permission. Harumnesia does not download, copy, proxy,
or hotlink canonical image references. An image can enter the production
manifest only when its use rights are explicitly recorded as one of `owned`,
`licensed`, `permission`, `public-domain`, or `generated`. Licensed,
permission-based, and public-domain entries must include both source and license
references.

Phase 8 intentionally ships zero third-party perfume image binaries; CSS artwork
remains the production fallback until rights-cleared assets are available.

## 4. Deterministic audit

Run the offline audit from the repository root:

```sh
pnpm assets:audit
```

The command validates `data/perfumes.json` and
`data/runtime/recommendation.json`, checks the locked 25,127-record market/image
baseline, and writes `scripts/assets/image-audit-report.json`. URL grouping,
protocols, hostnames, apparent extensions, malformed values, duplicate canonical
IDs per URL, and runtime coverage are derived without network access. Mutable
HTTP status, timing, headers, and remote content sizes are intentionally absent.

## 5. Production manifest architecture

`apps/web/src/assets/perfume-image-manifest.ts` is the sole production mapping
between a canonical perfume ID and local image variants. The validator rejects
duplicate or unsupported IDs, missing/invalid provenance, missing fallback
variants, unordered widths, and any source outside the matching local path:

```text
/assets/perfumes/<canonical-id>/<variant-file>
```

The production manifest is currently empty. It remains a small presentation
asset and is not added to the 9.69 MB recommendation runtime. Pages resolve an
ID through this boundary and never inspect canonical external image fields.

## 6. Static directory convention

Future approved files belong under `apps/web/public/assets/perfumes/`, organized
by canonical ID rather than mutable perfume or brand names:

```text
assets/perfumes/<canonical-id>/
  320.avif
  640.avif
  960.avif
  320.webp
  640.webp
  960.webp
  fallback.jpg
```

Only sizes supported by the original should be produced; source imagery must not
be upscaled. Source originals should remain separate from generated delivery
files and must never be modified destructively.

## 7. `PerfumeVisual` boundary

Result cards and production detail pages both pass the canonical ID, perfume
name, and deterministic visual tone to `PerfumeVisual`. An approved entry renders
a `<picture>` with AVIF, WebP, and fallback `srcset` data. An absent entry or one
failed local load renders the existing `FragranceArtwork` instead. The component
does not retry failed images and never accepts a canonical external URL.

Landing editorial visuals also pass through `PerfumeCard`; because their fixture
IDs have no approved entries, they retain the zero-network CSS artwork.

## 8. Responsive delivery and layout stability

Approved image entries declare intrinsic width and height. `PerfumeVisual` emits
those dimensions, route-appropriate `sizes`, `loading="lazy"`, and
`decoding="async"`. Product imagery uses a consistent 4:5 presentation box with
`object-fit: contain`, avoiding bottle distortion while reserving layout space.
Cards use small/medium responsive candidates; detail pages advertise a larger
viewport slot. No catalog sprite or bulk image preload exists.

## 9. Accessibility and fallback

Approved product imagery defaults to the concise alt text
`<perfume name> fragrance`, unless a reviewed manifest entry supplies a better
equivalent. CSS artwork is decorative and remains `aria-hidden="true"`. Missing
or failed images cannot expose a broken-image icon because the component switches
to CSS artwork.

## 10. Image processing policy

There are no rights-cleared source images to transform, so Phase 8 adds no image
processor or hypothetical dependency. When approved originals arrive, a future
offline build may use a dev-only processor to auto-orient, remove unnecessary
EXIF/GPS metadata, preserve aspect ratio, avoid upscaling, emit deterministic
AVIF/WebP/fallback widths, validate provenance, reject duplicate IDs, and update
the manifest. This pipeline must be reviewed against actual inputs before it is
implemented.

## 11. Brand assets

The application now owns one lightweight, 261-byte SVG favicon derived from its
existing geometric bottle and palette. No third-party logo, icon, raster app
asset, or external font/image request was introduced.

## 12. Build inventory and size impact

Run a production build before generating the deterministic local inventory:

```sh
pnpm build
pnpm assets:inventory
```

The inventory is written to `scripts/assets/asset-inventory-report.json` and
separates initial shell files from route/action-triggered files. The current
build measured:

| Output                 |  Before raw |   After raw | Delta raw |
| ---------------------- | ----------: | ----------: | --------: |
| Main JavaScript        |   292,177 B |   295,344 B |  +3,167 B |
| Main CSS               |    12.78 kB |    13,101 B | ~+0.32 kB |
| Recommendation worker  |   101,388 B |   101,388 B |       0 B |
| Runtime JSON           | 9,690,284 B | 9,690,284 B |       0 B |
| New SVG favicon        |         0 B |       261 B |    +261 B |
| Perfume image binaries |         0 B |         0 B |       0 B |

The emitted initial shell group is 309,288 raw bytes (95,168 bytes with the
inventory's level-9 gzip measurement). Lazy or route-triggered worker, runtime,
and taxonomy assets total 9,842,610 raw bytes. All ten emitted files total
10,151,898 raw bytes. The TypeScript manifest/validation source is 5,163 bytes;
it contains zero production entries and is compiled into the main JavaScript.

Representative Top 5 result image transfer is zero bytes, and detail-page
product image transfer is zero bytes, because every perfume currently uses the
CSS fallback. The worker and runtime sizes are unchanged.

## 13. Network behavior

The landing route still requests no recommendation runtime or perfume images.
The discover route still loads only taxonomy data until submission and requests
no perfume image catalog. Recommendation submission or direct production detail
lookup retains the existing lazy worker/runtime initialization. If sparse
approved image entries are added later, only rendered `<picture>` elements can
request their relevant variants.

## 14. Verification

Focused tests cover approved local responsive sources, missing-entry CSS
fallback, failed-load fallback, deterministic resolution, duplicate-ID rejection,
missing-provenance rejection, remote-source rejection, existing card/detail
behavior, and canonical audit/report parity. The manifest validator provides the
static hotlink guard: `http:`, `https:`, protocol-relative, data, and mismatched
paths cannot become production `src` values.

## 15. Known limitations and onboarding

- No current perfume image has established redistribution rights.
- International records contain no source image reference, and matching by name
  or brand is intentionally not attempted.
- The fallback is intentionally abstract rather than a photograph.
- Real image transfer and visual quality cannot be measured until reviewed
  rights-cleared originals exist.

To onboard an image, first document rights and the canonical ID, retain evidence,
review the original for authenticity and sensitive metadata, generate only useful
responsive variants, place them in the canonical-ID directory, add one manifest
entry, and run tests/build/inventory. A missing provenance record must stop the
onboarding rather than silently fall back to an unverified claim.

## 16. Phase 9 delivery considerations

Phase 9 should verify correct AVIF/WebP MIME types, Brotli/Gzip support, SPA route
fallback, and immutable caching for hashed build assets. Public canonical-ID image
paths need an intentional cache policy because their names are not content-hashed.
No Cloudflare configuration, cache rule, redirect/header file, or deployment
workflow is implemented in Phase 8.
