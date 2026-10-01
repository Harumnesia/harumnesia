# Harumnesia V2

Harumnesia V2 is the active perfume discovery and recommendation application from the Coding Camp by DBS Foundation capstone. It is a React, Vite, and TypeScript single-page application in a pnpm monorepo. **Phase 10A is complete:** the production deployment at [harumnesia.pages.dev](https://harumnesia.pages.dev) serves commit `d500f13533031ed92bec76aa8bab966574d12c0b`. **Phase 10B, Custom Domain & Production Cutover, is next.**

## How it works

The validated catalog contains **25,127 perfumes**: 1,064 local and 24,063 international records. Offline scripts generate the canonical `data/perfumes.json`, the smaller recommendation projection `data/runtime/recommendation.json`, and taxonomy files. The browser loads taxonomy on `/discover` and loads the recommendation runtime only when a recommendation or perfume detail is requested.

Preferences pass through hard filtering, cosine similarity, weighted scoring, MMR diversification, ranking, and an explainable Top 5. The framework-independent `@harumnesia/recommender` runs in a dedicated Web Worker. The worker builds its index once per page session and returns only result or detail data to React. There is no production backend, database, account system, or persistent recommendation history. Opening `/results` directly shows a no-session state.

Perfume images use a canonical-ID local asset manifest. Its approved count is currently zero; the UI uses local CSS artwork and does not hotlink source image URLs. Dataset provenance and reuse limitations are documented in [Dataset](docs/dataset.md) and [Assets](docs/assets.md).

## Run locally

Use Node.js **22.22.2 or later** and pnpm **10.30.3** from this repository root:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Build and preview the production application locally:

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

Cloudflare Pages hosts the production application. [Production readiness](docs/production-readiness.md) records the Phase 9 gate; [deployment record](docs/deployment.md) contains the Phase 10A production verification and Phase 10B handoff. [V2 plan](docs/v2-plan.md) holds the roadmap. No custom domain or DNS change was made in Phase 10A.

Harumnesia V1 remains historical reference in `Harumnesia/harumnesia-febe-capstone` and `Harumnesia/harumnesia-ml-capstone`. V2 does not deploy their Express, MongoDB, or Python ML services. Their repositories are not changed by V2 development.
