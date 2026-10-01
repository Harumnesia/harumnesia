# Production Integration

## 1. Phase 7 scope

Phase 7 connects the React application to the validated 25,127-record runtime
dataset and `@harumnesia/recommender`. Recommendation and detail operations now
use production data. Generated datasets, ranking behavior, evaluation defaults,
deployment, backend services, and final image work remain outside this phase.

## 2. Production architecture

```text
DiscoveryFormState
  -> RecommendationRequestInput
  -> ProductionRecommendationService (main thread)
  -> typed request/response messages
  -> dedicated Web Worker
  -> createRecommender(runtime dataset)
  -> RecommendationResult
  -> display-safe view model
  -> existing result/detail UI
```

React never imports the runtime records or calls the recommender directly. The
main thread retains only request data, the Top 5 response, and detail records that
the UI asked for.

## 3. Runtime asset strategy

`data/runtime/recommendation.json` is referenced with Vite's `?url&no-inline`
asset handling. The production build emits one hashed JSON asset rather than
embedding or copying it into JavaScript. The source artifact remains unchanged.

The measured build emitted:

| Asset                          | Raw bytes | Gzip bytes |
| ------------------------------ | --------: | ---------: |
| `recommendation-DrxAxm9e.json` | 9,690,284 |  1,705,687 |

The filename hash may change when source content or the build tool changes.

## 4. Lazy loading behavior

Importing the application only makes the runtime asset URL available. It does
not create a worker or fetch the asset. The worker is created on the first
production `recommend()` or `getPerfume()` operation. Opening `/` fetches neither
runtime nor taxonomy data. Opening `/discover` fetches only the four small
taxonomy artifacts.

A direct `/perfume/:id` visit is allowed to initialize the worker because the
production record is needed to resolve the route.

## 5. Web Worker architecture

`recommendation.worker.ts` owns runtime fetch, JSON parsing, schema validation,
index creation, ranking, and detail lookup. The initialized recommender and
parsed dataset stay inside one dedicated module worker for the SPA session. The
full dataset is never posted back to the main thread.

Detail lookup deliberately uses a linear scan of 25,127 records. It avoids a
second ID-to-record map and measured below 2 ms in the browser baseline.

## 6. Worker protocol

The typed protocol supports `init`, `recommend`, and `get-perfume`. Every request
has a monotonically generated request ID. Success and failure responses echo the
ID, allowing the client to resolve or reject the correct pending Promise even
when operations overlap. No RPC dependency is used.

Development diagnostics include fetch, parse, index, recommendation, and lookup
durations. They do not change the recommender public result contract and are not
shown in the UI.

## 7. Initialization lifecycle

The browser worker is constructed lazily. The client keeps one shared
initialization Promise, while the worker also guards initialization with its own
shared Promise. Concurrent operations therefore share one fetch, parse, schema
validation, and `createRecommender()` call. After success, later recommendations
reuse the same worker and index.

## 8. Retry and error semantics

Fetch errors, malformed data, schema/index failures, worker runtime errors, and
message deserialization errors reject pending calls. A failed initialization
terminates and clears the client worker and initialization state. A later,
explicit UI retry creates a new worker and can initialize again; there is no
automatic retry loop. Discover taxonomy loading follows the same reset-on-error
model and exposes a retry action.

## 9. Production service

`ProductionRecommendationService` implements the existing
`RecommendationService` contract. It owns a `RecommendationWorkerClient`, sends
public `RecommendationRequestInput` values, maps worker output, and records
development diagnostics through the browser Performance API. The normal provider
uses a singleton production service. `MockRecommendationService` remains
available only for tests and explicitly controlled previews.

## 10. View-model mapping

Pure mapping helpers convert `RecommendationResult` and
`RecommendationPerfume` into UI models. Cards receive identity, rank, labels,
currency-aware price text, notes, accords, occasions, deterministic reasons, and
a stable decorative tone derived from the perfume ID. Scores, coverage, MMR,
component diagnostics, and pre-diversification rank do not cross the UI boundary.

## 11. Taxonomy loading

The discover route fetches the generated notes, accords, genders, and
concentrations assets through hashed Vite URLs. The mapped production taxonomy
contains 2,505 notes and 84 accords. It exposes only `men`, `women`, and `unisex`,
removes unresolved `XDP`, and supplies the canonical `day`, `night`, and
`versatile` occasions.

`TagSelector` still renders no suggestions for an empty query and at most ten
substring matches for a typed query, so the full note vocabulary is never placed
in the DOM.

## 12. Result and detail integration

A discover submission now displays a real Top 5 from the production engine.
Refining preferences can produce different real IDs, and deterministic engine
reasons are displayed. A result route navigates to the same worker-backed
production record. Browser smoke verified real result detail, back-navigation,
direct production detail, and a useful invalid-ID state.

Opening `/results` without in-memory session results shows an explicit start
state and never falls back to fixture recommendations. Landing cards remain
clearly labelled editorial samples and do not link into the production detail
flow.

## 13. Caching behavior

Within one SPA service session, the runtime is fetched and indexed once. Browser
network verification observed one runtime request for the first recommendation
and no additional runtime request for the second recommendation or result-detail
navigation. A separate direct-detail page creates its own SPA session and worker.

Repeat document loads rely on normal HTTP caching. Phase 7 adds no service worker,
IndexedDB, or application-managed persistent cache.

## 14. Build sizes

Measured from `apps/web/dist` after the Phase 7 production build:

| Output                              | Raw bytes | Gzip bytes |
| ----------------------------------- | --------: | ---------: |
| `index-DQkD1MSU.js`                 |   292,177 |     90,071 |
| `recommendation.worker-BvcEeEfz.js` |   101,388 |     27,847 |
| `recommendation-DrxAxm9e.json`      | 9,690,284 |  1,705,687 |
| `notes-DAlW9CRz.json`               |    49,096 |     11,999 |
| `accords-B-OO0qaF.json`             |     1,287 |        463 |
| `genders-Ci_yYv9B.json`             |       228 |        139 |
| `concentrations-CA9FGxXO.json`      |       327 |        179 |

The dataset appears once as a separate asset. The initial JavaScript bundle did
not absorb its approximately 9.24 MiB raw payload.

## 15. Browser performance observations

The baseline was recorded with the production preview in headless Chrome 138 on
Windows. It is observational, not a performance threshold:

| Operation                                | Duration |
| ---------------------------------------- | -------: |
| Runtime fetch                            |  79.5 ms |
| JSON parse                               |  79.1 ms |
| Schema validation and index construction | 222.1 ms |
| Total first initialization               | 380.7 ms |
| First recommendation                     |  35.0 ms |
| Repeated recommendation                  |  28.9 ms |
| Detail lookup                            |   1.6 ms |

A separate direct-detail load initialized in 373.9 ms and resolved its lookup in
0.7 ms. A proxy-assisted network-count run was intentionally excluded from these
timings because the proxy increased fetch latency.

## 16. Memory observations

After initialization, two recommendations, and detail navigation, Chrome CDP
reported approximately 3.52 MiB of used JavaScript heap and 6.00 MiB total heap
for the main page target (plus approximately 4.38 MiB embedder heap). This is
consistent with the main thread retaining view data rather than the full runtime.

The dedicated worker heap could not be read reliably through this headless CDP
setup, so Phase 7 does not claim a browser worker-memory figure. The worker
necessarily retains the validated engine index and parsed records needed for
detail lookup. No extra detail `Map`, stringify/parse clone, or frontend dataset
copy was added.

## 17. Client-side viability conclusion

The measured desktop-browser path is viable for the current dataset. Initialization
completed without crashes, recommendations remained in the tens of milliseconds,
and a 10 ms main-thread heartbeat advanced 56 times while the first worker-backed
request completed. Navigation, loading copy, and interaction therefore remained
responsive while parsing and indexing ran off the main thread.

This conclusion does not establish low-memory mobile performance. Representative
mobile-device validation remains appropriate before production deployment.

## 18. Known limitations

- Recommendation and form state are in memory only; refreshing `/results` shows
  the no-session state by design.
- Each browser tab/direct document session owns its own worker and retained index.
- The 9.24 MiB raw runtime payload is substantial even though it compresses well.
- Worker heap usage was not available from the current automated browser tooling.
- Taxonomy search is bounded substring matching, not fuzzy search.
- Landing artwork and editorial samples are still temporary.

## 19. Phase 8 asset boundary

Phase 8 adds a presentation-only image manifest keyed by the canonical ID. It is
not part of the runtime dataset, worker protocol, recommendation result, or detail
record. `PerfumeVisual` accepts only validated local static paths and falls back
to deterministic CSS artwork for all current records because no rights-cleared
production image exists. The landing/discover runtime-fetch behavior and worker
sizes remain unchanged. See [Asset Optimization and Image Delivery](./assets.md).

## 20. Phase 9 readiness and Phase 10 deployment considerations

Phase 9 audits the production build locally. The Phase 7 bundle and browser
measurements above are historical baselines; current measurements are in
[production readiness](./production-readiness.md). Phase 10 Cloudflare deployment
must provide SPA route fallback, immutable caching for hashed assets, suitable
compression and cache headers for runtime JSON, and correct worker/taxonomy MIME
delivery. Deployment validation should repeat direct route, cache, network,
responsiveness, and representative real-device checks. No Cloudflare service or
production deployment has been added.
