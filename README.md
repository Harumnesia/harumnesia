# Harumnesia

Harumnesia V2 is a re-engineered perfume discovery and recommendation platform originally developed as a Coding Camp by DBS Foundation capstone project.

This repository contains the active Harumnesia V2 codebase.

V2 is not a direct continuation of the V1 implementation. It is a clean redesign that preserves useful domain knowledge, datasets, and recommendation research from V1 while simplifying the production architecture.

---

## Status

```text
Version: V2
Status: Planning / Re-engineering
Architecture: Monorepo
Deployment Target: Cloudflare
```

Current focus:

```text
V1 Analysis
    ↓
Dataset Audit
    ↓
Dataset V2
    ↓
Recommendation Engine
    ↓
Evaluation
    ↓
Frontend
    ↓
Cloudflare Deployment
```

---

## Project History

Harumnesia V1 was developed as a capstone project for Coding Camp by DBS Foundation.

The original implementation is preserved in two separate repositories:

- `Harumnesia/harumnesia-febe-capstone`
- `Harumnesia/harumnesia-ml-capstone`

These repositories are historical references and are not modified as part of V2 development.

V1 contains:

- React + Vite frontend
- Express backend
- MongoDB Atlas
- separate ML services
- TF-IDF
- Autoencoder
- K-Means
- Cosine Similarity
- VPS / PM2 deployment model

Harumnesia V2 redesigns this architecture for a simpler and more maintainable production setup.

---

## V2 Direction

Harumnesia V2 is designed around:

- one monorepo
- React + Vite + TypeScript
- Cloudflare deployment
- static JSON production dataset
- static perfume assets
- framework-independent recommendation engine
- ML research separated from production runtime
- explainable recommendation output

Initial V2 intentionally avoids unnecessary infrastructure.

Not used initially:

- VPS
- PM2
- MongoDB
- D1
- R2
- Vectorize
- Workers AI
- Autoencoder as production core
- K-Means as production core

These may only be introduced later if a concrete requirement justifies them.

---

## Recommendation Pipeline

The planned production recommendation flow is:

```text
User Preference
      ↓
Hard Filter
      ↓
Cosine Similarity
      ↓
Weighted Scoring
      ↓
Diversification
      ↓
Ranking
      ↓
Top 5
```

Recommendation results should be explainable.

Example factors:

- notes match
- accords match
- occasion suitability
- budget compatibility
- gender preference
- scent profile similarity

The explanation shown to users must reflect the actual ranking signals used by the recommender.

---

## Target Monorepo Structure

```text
harumnesia/
├── apps/
│   ├── web/
│   └── api/
│
├── packages/
│   ├── recommender/
│   └── shared/
│
├── data/
│   ├── perfumes.json
│   ├── taxonomy/
│   └── sample/
│
├── ml/
│   ├── notebooks/
│   └── preprocessing/
│
├── scripts/
├── docs/
├── .github/
├── AGENTS.md
├── package.json
└── README.md
```

Not every directory must exist immediately.

The structure will be introduced progressively as each part of V2 is implemented.

---

## Repository Responsibilities

### `apps/web`

User-facing web application.

Planned responsibilities:

- landing page
- perfume catalog
- perfume detail
- scent preference flow
- recommendation interface
- recommendation result
- recommendation explanation

---

### `apps/api`

Optional Cloudflare Worker API.

This is not required for the initial architecture.

It should only be introduced when server-side behavior is genuinely needed.

---

### `packages/recommender`

Core recommendation engine.

Responsibilities:

- preference normalization
- filtering
- similarity calculation
- weighted scoring
- diversification
- ranking
- Top-N selection
- explanation metadata

This package should remain independent from React.

---

### `packages/shared`

Shared contracts such as:

- TypeScript types
- schemas
- enums
- constants
- validation rules

---

### `data`

Validated production data.

Initial target:

```text
data/perfumes.json
```

The V1 dataset is treated as source material and must be audited before becoming V2 production data.

---

### `ml`

Offline research and experimentation only.

Examples:

- TF-IDF experiments
- recommendation evaluation
- V1 vs V2 comparison
- feature exploration

ML research must not become a production runtime dependency by default.

---

### `scripts`

Offline tooling for:

- dataset cleaning
- normalization
- CSV to JSON conversion
- validation
- integrity checks

---

## Data Strategy

Initial V2 uses static data.

```text
Raw V1 Dataset
      ↓
Audit
      ↓
Cleaning
      ↓
Normalization
      ↓
Validation
      ↓
Production JSON
```

Static data is preferred while the product does not require dynamic persistence.

A database may be introduced later for features such as:

- authentication
- favorites
- recommendation history
- user profiles
- admin management
- dynamic catalog management

---

## Asset Strategy

Perfume images are initially stored as static assets.

Planned location:

```text
apps/web/public/assets/perfumes/
```

Preferred formats:

- AVIF
- WebP

R2 is not required initially.

---

## Documentation

Project documentation:

- [`docs/v1-context.md`](docs/v1-context.md)  
  Historical and technical context of Harumnesia V1.

- [`docs/v2-plan.md`](docs/v2-plan.md)  
  Current architecture, scope, development plan, and engineering direction for V2.

- [`AGENTS.md`](AGENTS.md)  
  Rules and context for AI coding agents working inside the Harumnesia workspace.

Future documentation may include:

```text
docs/architecture.md
docs/recommendation.md
docs/dataset.md
```

These should only be created when implementation reaches the relevant stage.

---

## Local Workspace

Recommended local layout:

```text
harumnesia/
├── harumnesia-febe-capstone/
├── harumnesia-ml-capstone/
└── harumnesia-v2/
```

Roles:

```text
harumnesia-febe-capstone   → V1 FE/BE reference only
harumnesia-ml-capstone     → V1 ML/data reference only
harumnesia-v2              → active development
```

Do not modify the V1 repositories during normal V2 development.

---

## Engineering Principles

Harumnesia V2 follows several core principles.

### Simplicity

Prefer the simplest architecture that satisfies actual requirements.

### Static-first

Use static data and assets where persistence is unnecessary.

### Explainability

Recommendation results should be traceable to real ranking signals.

### Separation of Concerns

Keep UI, recommendation logic, research, data, and infrastructure clearly separated.

### Testability

Core recommendation behavior should be testable without the frontend.

### Portability

Domain logic should not be unnecessarily coupled to React or Cloudflare.

### Incremental Complexity

Do not introduce infrastructure before it is needed.

### Historical Integrity

Use V1 as a reference without rewriting or mutating the original capstone repositories.

---

## Development Order

Default implementation order:

```text
1. Understand V1
2. Audit dataset
3. Build normalized V2 dataset
4. Build recommendation engine
5. Evaluate recommendation quality
6. Tune scoring
7. Build frontend
8. Integrate frontend + recommender + data
9. Optimize assets
10. Deploy to Cloudflare
```

The recommendation foundation should be understood before major UI work begins.

---

## Initial Success Criteria

The first stable V2 milestone should satisfy:

- normalized and validated production perfume dataset
- deterministic recommendation output
- Top 5 recommendation ranking
- explainable recommendation reasons
- automated tests for core recommender logic
- complete recommendation flow in the frontend
- no dependency on VPS
- successful Cloudflare deployment
- V1 preserved unchanged as historical reference

---

## V1 vs V2

```text
V1                                  V2

Separate FE/BE + ML repositories    Monorepo
VPS                                 Cloudflare
Express server                      Optional Worker API
MongoDB Atlas                       Static JSON initially
Separate ML services                In-process recommender
Autoencoder production              Removed from core production
K-Means production                  Removed from core production
Cosine Similarity                   Cosine + weighted scoring
Limited explainability              Explainable recommendation
Python ML runtime                   Offline research only
```

---

## Repository Scope

This repository is the active home of Harumnesia V2.

V1 remains available for historical, academic, and portfolio reference.

For detailed architecture and planning decisions, read:

```text
docs/v1-context.md
docs/v2-plan.md
AGENTS.md
```
