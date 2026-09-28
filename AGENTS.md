# AGENTS.md

## Purpose

This file defines how AI coding agents should work inside the Harumnesia V2 workspace.

The main goal is to prevent accidental modification of Harumnesia V1 and keep all new engineering work focused on the V2 architecture.

---

## 1. Workspace Structure

Expected local workspace:

```text
harumnesia/
├── harumnesia-febe-capstone/
├── harumnesia-ml-capstone/
└── harumnesia-v2/
```

Repository roles:

```text
harumnesia-febe-capstone   = V1 frontend/backend reference
harumnesia-ml-capstone     = V1 ML/data reference
harumnesia-v2              = active V2 development repository
```

The two V1 repositories are reference-only.

All new implementation must be created inside:

```text
harumnesia-v2/
```

---

## 2. Mandatory Read Order

Before making architecture, implementation, migration, or recommendation-engine changes, read:

```text
README.md
docs/v1-context.md
docs/v2-plan.md
AGENTS.md
```

If implementation details from V1 are required, inspect the two sibling V1 repositories after reading the documentation above.

---

## 3. V1 Repository Policy

### `../harumnesia-febe-capstone`

Purpose:

- inspect original frontend
- inspect original backend
- understand V1 user flows
- understand old API integration
- understand historical deployment architecture
- identify reusable product/domain concepts

Policy:

```text
READ ONLY
```

Do not:

- edit files
- commit changes
- refactor code
- update dependencies
- rename files
- delete files
- change branches
- migrate V1 code in place
- add V2 implementation
- repair V1 unless explicitly instructed by the user

---

### `../harumnesia-ml-capstone`

Purpose:

- inspect original datasets
- inspect preprocessing notebooks
- understand V1 recommendation behavior
- inspect TF-IDF experiments
- inspect Autoencoder and K-Means research
- inspect Cosine Similarity research
- identify useful dataset fields and taxonomy

Policy:

```text
READ ONLY
```

Do not:

- modify notebooks
- retrain or overwrite V1 models in place
- edit datasets in place
- replace model artifacts
- restructure directories
- commit V2 research into this repository

If V1 data is needed for V2, create a transformed or copied version inside the V2 repository.

Never overwrite the historical source.

---

## 4. V2 Repository Policy

Active repository:

```text
./harumnesia-v2
```

All new work belongs here.

This includes:

- monorepo configuration
- frontend
- recommendation engine
- shared types
- dataset V2
- data cleaning scripts
- validation scripts
- ML research for V2
- tests
- documentation
- CI
- Cloudflare configuration
- future Worker API

V2 is a re-engineering effort.

Do not treat V2 as a direct copy of V1.

---

## 5. Core Architectural Direction

Current V2 direction:

```text
Monorepo
React + Vite + TypeScript
Cloudflare
Static JSON initially
Static perfume assets
Framework-independent recommender
ML research separated from production runtime
```

Production recommendation pipeline:

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

Recommendation output must be explainable.

---

## 6. Initial Non-Goals

Do not introduce the following unless a concrete requirement justifies them:

```text
MongoDB
PostgreSQL
D1
R2
Vectorize
Workers AI
VPS
PM2
Docker production runtime
Microservices
Authentication
User accounts
Admin dashboard
Persistent recommendation history
```

Do not recreate V1 infrastructure by default.

---

## 7. ML Policy

V1 uses or experiments with:

```text
TF-IDF
Autoencoder
K-Means
Cosine Similarity
TensorFlow / Keras
serialized .h5 artifacts
serialized .pkl artifacts
```

For V2:

```text
Autoencoder = research/reference only
K-Means     = research/reference only
TensorFlow  = not required in production
Cosine      = allowed as production building block
```

ML experimentation belongs in:

```text
ml/
```

Production recommendation logic belongs in:

```text
packages/recommender/
```

Do not create a Python ML production service unless the architecture is explicitly changed.

---

## 8. Data Policy

V1 datasets are historical source material.

Do not assume they are production-ready.

Before using data in V2, evaluate:

- duplicates
- missing values
- inconsistent naming
- invalid prices
- inconsistent gender values
- inconsistent concentration values
- note formatting
- accord formatting
- occasion taxonomy
- image references
- field consistency
- local vs international perfume schema differences

Target production dataset:

```text
data/perfumes.json
```

Production data must be:

```text
normalized
validated
deterministic
versionable
```

---

## 9. Asset Policy

Initial perfume images should be static assets.

Target location:

```text
apps/web/public/assets/perfumes/
```

Preferred formats:

```text
AVIF
WebP
```

Do not introduce R2 until static assets become insufficient.

---

## 10. Package Boundaries

Target responsibilities:

### `apps/web`

Owns:

- UI
- routes/pages
- interaction
- presentation
- recommendation result display

Must not own core recommendation logic.

---

### `apps/api`

Optional Cloudflare Worker API.

Do not build it merely because the directory exists.

Use it only when server-side behavior is required.

---

### `packages/recommender`

Owns:

- filtering
- similarity
- scoring
- diversification
- ranking
- recommendation explanation metadata

Must remain independent from React.

---

### `packages/shared`

Owns:

- shared TypeScript types
- schemas
- constants
- enums
- validation contracts

---

### `data`

Owns:

- production-ready normalized data
- taxonomy
- samples

---

### `ml`

Owns:

- notebooks
- experiments
- offline evaluation
- research comparisons

Must not become a production runtime dependency.

---

### `scripts`

Owns:

- cleaning
- transformation
- CSV to JSON conversion
- dataset validation
- integrity checks

---

## 11. Reuse Policy

Reuse V1 selectively.

Good candidates for reuse:

- domain knowledge
- perfume metadata
- dataset fields
- notes
- brand information
- catalog concepts
- recommendation input concepts
- UI flow ideas
- TF-IDF research
- Cosine Similarity research
- content that is still correct

Do not blindly copy:

- entire `src/`
- entire `server/`
- `.env`
- credentials
- old API endpoint configuration
- PM2 configuration
- MongoDB integration
- VPS assumptions
- old ML service wiring
- `.h5` production runtime dependency
- `.pkl` production runtime dependency

Before copying code, determine whether rebuilding it is cleaner.

---

## 12. Security Rules

Never copy secrets from V1.

Treat all historical credentials and endpoints as untrusted references.

Do not commit:

```text
.env
API keys
database credentials
tokens
private URLs containing secrets
service credentials
```

Use environment variables only when actually required.

Provide `.env.example` with placeholders, never real values.

---

## 13. Recommendation Rules

Core recommendation behavior must be:

- deterministic for the same input and dataset
- testable without the frontend
- explainable
- modular
- independent from React
- resilient to empty or small candidate pools

Do not hardcode final scoring weights without evaluation.

Document scoring changes.

Explanation text must correspond to actual signals used in ranking.

Do not fabricate recommendation reasons.

---

## 14. Testing Expectations

Core recommender should have automated tests.

Minimum testing areas:

```text
filtering
similarity
weighted scoring
diversification
ranking
Top-N behavior
empty candidate handling
fallback behavior
determinism
```

Dataset validation should also be automated.

Do not rely only on manual browser testing.

---

## 15. Documentation Policy

Important architectural decisions must be reflected in documentation.

Primary documents:

```text
docs/v1-context.md
docs/v2-plan.md
```

Later implementation documentation may include:

```text
docs/architecture.md
docs/recommendation.md
docs/dataset.md
```

Do not create documentation merely to increase file count.

Create a document when it has a clear ownership and maintenance purpose.

---

## 16. Source of Truth Priority

When sources conflict, use this priority.

For understanding V1:

```text
Actual V1 source code
>
V1 README/documentation
>
assumptions
```

For V2 architecture:

```text
explicit user instruction
>
docs/v2-plan.md
>
AGENTS.md
>
V1 implementation
```

For dataset behavior:

```text
validated V2 dataset/schema
>
raw V1 dataset assumptions
```

---

## 17. Change Discipline

Before making a major change:

1. Identify the requirement.
2. Check whether it conflicts with `docs/v2-plan.md`.
3. Inspect V1 only if useful.
4. Prefer the simplest architecture that satisfies the requirement.
5. Avoid introducing infrastructure prematurely.
6. Keep recommendation logic separated from UI.
7. Add or update tests.
8. Update documentation if the architectural decision changes.

---

## 18. Do Not Overengineer

Avoid:

- unnecessary abstractions
- premature microservices
- unnecessary database layers
- excessive package fragmentation
- unnecessary Cloudflare products
- unnecessary AI runtime
- unnecessary vector databases
- deep generic architecture without a real use case

Prefer:

```text
simple
explicit
testable
maintainable
portable
```

---

## 19. V1 Preservation Rule

V1 exists to preserve the original capstone implementation.

Do not "clean up" V1 to make it look like V2.

Historical imperfections are part of the reference value.

If V1 contains an implementation worth improving:

```text
analyze V1
    ↓
design V2 equivalent
    ↓
implement inside V2
```

Not:

```text
edit V1
    ↓
turn V1 into V2
```

---

## 20. Development Priority

Default project order:

```text
Understand V1
      ↓
Audit Dataset
      ↓
Build Dataset V2
      ↓
Build Recommendation Engine
      ↓
Evaluate
      ↓
Tune
      ↓
Build Frontend
      ↓
Integrate
      ↓
Optimize Assets
      ↓
Deploy to Cloudflare
```

Do not start major UI implementation before the dataset and recommendation foundation are understood, unless explicitly instructed otherwise.

---

## 21. Agent Behavior Summary

When working in this workspace:

```text
READ V1
DO NOT MODIFY V1

UNDERSTAND BEFORE COPYING

WRITE ONLY TO V2

KEEP PRODUCTION SIMPLE

KEEP ML RESEARCH OFFLINE

KEEP RECOMMENDER FRAMEWORK-INDEPENDENT

USE STATIC DATA FIRST

DO NOT ADD INFRASTRUCTURE WITHOUT A REQUIREMENT

TEST CORE LOGIC

DOCUMENT ARCHITECTURAL CHANGES
```

Harumnesia V2 should preserve useful knowledge from V1 without inheriting unnecessary technical complexity.
