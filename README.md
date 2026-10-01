# Harumnesia V2

Harumnesia V2 is the active perfume discovery and recommendation application from the Coding Camp by DBS Foundation capstone. It is a React, Vite, and TypeScript single-page application in a pnpm monorepo. Phase 9 has prepared a **production candidate**; no Cloudflare deployment or public production URL exists yet.

## How it works

The validated catalog contains **25,127 perfumes**: 1,064 local and 24,063 international records. Offline scripts generate the canonical `data/perfumes.json`, the smaller recommendation projection `data/runtime/recommendation.json`, and taxonomy files. The browser loads taxonomy on `/discover` and loads the recommendation runtime only when a recommendation or perfume detail is requested.

Preferences pass through hard filtering, cosine similarity, weighted scoring, MMR diversification, ranking, and an explainable Top 5. The framework-independent `@harumnesia/recommender` runs in a dedicated Web Worker. The worker builds its index once per page session and returns only result or detail data to React. There is no production backend, database, account system, or persistent recommendation history. Opening `/results` directly shows a no-session state.

Perfume images use a canonical-ID local asset manifest. Its approved count is currently zero; the UI uses local CSS artwork and does not hotlink source image URLs. Dataset provenance and reuse limitations are documented in [Dataset](docs/dataset.md) and [Assets](docs/assets.md).

## Run locally

Use Node.js **22.12 or later** and pnpm **10.30.3** from this repository root:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Build and preview the production candidate:

```sh
pnpm build
pnpm --filter @harumnesia/web preview
```

The build output is `apps/web/dist`. The main validation commands are:

```sh
pnpm dataset:validate
pnpm assets:audit
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm assets:inventory
pnpm format:check
pnpm recommender:smoke
pnpm integration:smoke
```

The build uses committed generated data and does not need the V1 repositories. Rebuilding the source dataset is a separate offline task that needs the original V1 inputs.

## Repository map

| Path | Purpose |
| --- | --- |
| `apps/web` | SPA, routes, forms, UI, worker, and presentation assets |
| `packages/recommender` | Browser-compatible recommendation engine |
| `packages/shared` | Schemas, types, and shared contracts |
| `data` | Validated canonical, runtime, and taxonomy JSON |
| `scripts` | Offline dataset, asset, and smoke tooling |
| `docs` | Architecture history, implementation notes, readiness, and deployment contract |

Cloudflare Pages is the intended static hosting target for Phase 10. [Production readiness](docs/production-readiness.md) records the Phase 9 evidence and remaining validation; [deployment contract](docs/deployment.md) specifies the hosting work without creating infrastructure. [V2 plan](docs/v2-plan.md) holds the roadmap.

Harumnesia V1 remains historical reference in `Harumnesia/harumnesia-febe-capstone` and `Harumnesia/harumnesia-ml-capstone`. V2 does not deploy their Express, MongoDB, or Python ML services. Their repositories are not changed by V2 development.
