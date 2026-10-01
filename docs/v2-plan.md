# Harumnesia V2 Plan

## Status

- Project: Harumnesia V2
- Status: Phase 9 complete; Phase 10 Cloudflare deployment current
- Repository: `Harumnesia/harumnesia`
- Architecture: Monorepo
- Deployment Target: Cloudflare
- Previous Version: Harumnesia V1 Capstone

Phases 0–8.5 and mini-hardening are complete. The active implementation is a
client-side React SPA with a dedicated recommendation Web Worker and validated
25,127-record static dataset. See [production readiness](./production-readiness.md)
for the Phase 9 decision and [deployment contract](./deployment.md) for Phase 10.

---

## 1. Overview

Harumnesia V2 adalah re-engineering dari Harumnesia V1, sebuah project capstone Coding Camp by DBS Foundation untuk discovery dan recommendation parfum.

V2 bukan kelanjutan langsung dari codebase V1.

V1 tetap dipertahankan sebagai historical reference, sedangkan V2 dibangun ulang dengan arsitektur yang lebih sederhana, maintainable, portable, dan sesuai dengan kebutuhan production saat ini.

Repository V1:

- `harumnesia-febe-capstone`
- `harumnesia-ml-capstone`

Kedua repository tersebut bersifat reference-only dan tidak menjadi tempat development V2.

---

## 2. V2 Goals

Harumnesia V2 memiliki tujuan utama:

1. Menggabungkan frontend, recommendation engine, data pipeline, ML research, dan API dalam satu monorepo.
2. Menghilangkan ketergantungan terhadap VPS.
3. Menjalankan production workload menggunakan Cloudflare.
4. Menyederhanakan data layer menggunakan static JSON selama database belum diperlukan.
5. Mengubah recommendation engine menjadi lebih ringan dan explainable.
6. Memisahkan research ML dari recommendation logic production.
7. Mengurangi operational complexity.
8. Membuat codebase lebih mudah dipahami, diuji, dan dikembangkan.
9. Mempertahankan nilai dan dataset dari V1 tanpa membawa seluruh legacy architecture.
10. Menjadikan V2 sebagai versi aktif utama Harumnesia.

---

## 3. Main Changes from V1

### V1

Harumnesia V1 menggunakan beberapa komponen terpisah:

- React + Vite frontend
- Express backend
- MongoDB Atlas
- Mongoose
- VPS deployment
- PM2
- separate ML services
- Python-based ML pipeline
- TF-IDF
- Autoencoder
- K-Means
- Cosine Similarity
- serialized `.h5` dan `.pkl` model artifacts

### V2

Harumnesia V2 akan menggunakan:

- monorepo
- React + Vite + TypeScript
- Cloudflare deployment
- static JSON dataset
- static perfume assets
- framework-independent recommendation package
- filter-based candidate selection
- cosine similarity
- weighted scoring
- diversification
- explainable recommendation output

V2 tidak menggunakan Autoencoder dan K-Means sebagai core recommendation production.

---

## 4. Target Architecture

Target high-level architecture:

```text
Raw / Existing Dataset
        │
        ▼
ML Research + Scripts
        │
        ▼
Dataset Cleaning & Validation
        │
        ▼
Production JSON
        │
        ▼
Recommendation Engine
        │
        ▼
Web Application
        │
        ▼
Cloudflare
```

Recommendation engine dipisahkan dari frontend agar domain logic tidak bergantung pada UI.

Target runtime:

```text
User
 │
 ▼
React Web
 │
 ▼
Recommendation Package
 │
 ├── Production Dataset
 │
 └── Scoring Logic
 │
 ▼
Top Recommendations
```

Cloudflare Worker API dapat ditambahkan apabila terdapat requirement yang memang membutuhkan server-side processing.

---

## 5. Target Monorepo Structure

Target struktur repository:

```text
harumnesia/
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── features/
│   │   │   │   └── recommendation/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   └── utils/
│   │   │
│   │   └── public/
│   │       └── assets/
│   │           └── perfumes/
│   │
│   └── api/
│       ├── src/
│       │   ├── routes/
│       │   ├── services/
│       │   ├── middleware/
│       │   └── index.ts
│       └── wrangler.jsonc
│
├── packages/
│   ├── recommender/
│   │   ├── src/
│   │   │   ├── filter.ts
│   │   │   ├── similarity.ts
│   │   │   ├── scoring.ts
│   │   │   ├── diversification.ts
│   │   │   └── recommend.ts
│   │   │
│   │   └── tests/
│   │
│   └── shared/
│       ├── types/
│       ├── schemas/
│       └── constants/
│
├── data/
│   ├── perfumes.json
│   ├── taxonomy/
│   │   ├── notes.json
│   │   ├── accords.json
│   │   └── occasions.json
│   └── sample/
│
├── ml/
│   ├── notebooks/
│   ├── preprocessing/
│   └── README.md
│
├── scripts/
│   ├── clean-dataset/
│   ├── convert-csv-to-json/
│   └── validate-dataset/
│
├── docs/
│   ├── v1-context.md
│   ├── v2-plan.md
│   ├── architecture.md
│   ├── recommendation.md
│   └── dataset.md
│
├── .github/
│   └── workflows/
│
├── AGENTS.md
├── package.json
├── README.md
└── .gitignore
```

Struktur tersebut merupakan target architecture.

Tidak semua directory harus dibuat pada hari pertama apabila belum memiliki fungsi nyata.

---

## 6. Repository Responsibilities

### `apps/web`

Frontend application Harumnesia.

Responsibilities:

- landing page
- perfume catalog
- perfume detail
- preference form
- scent quiz
- recommendation result
- recommendation explanation
- user-facing interaction

Business logic recommendation tidak boleh bergantung pada komponen UI.

---

### `apps/api`

Cloudflare Worker API.

API tidak wajib digunakan pada initial implementation.

Initial V2 diperbolehkan menjalankan recommendation secara client-side apabila:

- dataset masih cukup kecil
- logic tidak membutuhkan secret
- tidak terdapat user-specific persistent data
- performance masih sesuai target

Worker diperkenalkan jika terdapat kebutuhan nyata.

---

### `packages/recommender`

Core recommendation engine.

Package ini menjadi pusat business logic recommendation dan harus independen dari React.

Responsibilities:

- preference normalization
- candidate filtering
- similarity calculation
- weighted scoring
- diversification
- ranking
- Top-N selection
- explanation metadata

---

### `packages/shared`

Shared contracts antara application dan packages.

Contoh:

- TypeScript types
- schema
- enums
- constants
- shared validation rules

---

### `data`

Dataset yang digunakan oleh production application.

Data production harus:

- deterministic
- validated
- normalized
- versionable
- tidak membutuhkan database untuk dibaca

Primary production dataset:

```text
data/perfumes.json
```

---

### `ml`

Research dan experimentation only.

Folder ini dapat berisi:

- notebooks
- exploratory analysis
- feature experimentation
- TF-IDF experiments
- recommendation evaluation
- comparison dengan V1

Code di folder `ml/` tidak menjadi runtime dependency production.

---

### `scripts`

Offline data tooling.

Responsibilities:

- cleaning
- normalization
- transformation
- CSV → JSON conversion
- validation
- data integrity checks

---

## 7. Data Strategy

V2 menggunakan static dataset sebagai initial production data source.

Flow:

```text
Raw CSV
   │
   ▼
Cleaning
   │
   ▼
Normalization
   │
   ▼
Validation
   │
   ▼
Production JSON
   │
   ▼
Application
```

Initial production storage:

```text
data/perfumes.json
```

Database belum digunakan karena initial requirements masih dapat dipenuhi menggunakan static dataset.

### Initial exclusions

V2 belum membutuhkan:

- D1
- R2
- MongoDB
- PostgreSQL
- external database server

Database hanya diperkenalkan ketika terdapat persistent dynamic data yang memang membutuhkannya.

Contoh future requirement:

- authentication
- favorites
- recommendation history
- user profile
- admin management
- dynamic catalog management

---

## 8. Asset Strategy

Perfume images disimpan sebagai static web assets.

Target location:

```text
apps/web/public/assets/perfumes/
```

Preferred formats:

- AVIF
- WebP

Image handling harus mempertimbangkan:

- compression
- lazy loading
- consistent naming
- fallback image
- responsive delivery

R2 belum diperlukan pada initial V2.

---

## 9. Recommendation Engine

Production recommendation V2 menggunakan pipeline:

```text
User Preference
      │
      ▼
Hard Filter
      │
      ▼
Cosine Similarity
      │
      ▼
Weighted Scoring
      │
      ▼
Diversification
      │
      ▼
Ranking
      │
      ▼
Top 5
```

---

## 10. Hard Filtering

Hard filter digunakan untuk membatasi candidate perfumes sebelum ranking.

Potential filtering dimensions:

- gender
- price / budget
- concentration
- occasion
- availability of required attributes

Hard filtering tidak boleh terlalu agresif sampai candidate pool menjadi kosong tanpa fallback strategy.

Fallback behavior harus ditentukan saat recommender diimplementasikan.

---

## 11. Cosine Similarity

Cosine similarity digunakan untuk mengukur similarity antara user scent preference dan representasi parfum.

Potential features:

- notes
- accords
- textual scent profile

TF-IDF dapat digunakan untuk menghasilkan vector representation apabila sesuai dengan hasil evaluation.

Cosine similarity bukan satu-satunya final ranking signal.

---

## 12. Weighted Scoring

Candidate akan memperoleh final relevance score dari beberapa signals.

Conceptual example:

```text
Final Score =
    note_similarity
  + accord_match
  + occasion_match
  + gender_match
  + budget_match
  + other_relevant_signals
```

Actual weights tidak boleh ditentukan secara arbitrer tanpa evaluation.

Bobot akan dituning menggunakan recommendation scenarios dan evaluation results.

---

## 13. Diversification

Diversification dilakukan setelah relevance scoring.

Tujuannya mencegah Top 5 berisi produk yang terlalu identik.

Potential diversification dimensions:

- brand
- dominant accords
- scent family
- note profile
- price point

Diversification tidak boleh mengorbankan relevance secara berlebihan.

---

## 14. Recommendation Output

Default recommendation result:

```text
Top 5
```

Setiap result idealnya memiliki:

- perfume identity
- ranking score
- relevant attributes
- explanation
- matched preferences

Internal raw scoring tidak harus ditampilkan langsung kepada end user.

---

## 15. Explainability

Recommendation V2 harus explainable.

User harus dapat memahami alasan sebuah parfum direkomendasikan.

Contoh explanation:

```text
Recommended because:

- contains woody and citrus notes matching your preference
- suitable for evening use
- within your selected budget
- has fresh-spicy accords similar to your preferred scent profile
```

Explanation harus berasal dari recommendation signals yang benar-benar digunakan.

Jangan menghasilkan explanation yang tidak memiliki hubungan dengan ranking logic.

---

## 16. Machine Learning Strategy

Machine learning masih dapat digunakan untuk research dan experimentation.

Namun V2 memisahkan:

```text
Research ML
≠
Production runtime
```

Autoencoder dan K-Means dari V1 tidak digunakan sebagai production core pada V2.

Model tersebut tetap dapat digunakan untuk:

- historical comparison
- experimentation
- evaluation baseline
- research documentation

V2 tidak membutuhkan TensorFlow runtime pada production deployment untuk initial architecture.

---

## 17. Cloudflare Strategy

Target infrastructure:

```text
GitHub
   │
   ▼
Cloudflare
   │
   ├── Web application
   │
   └── Worker API when required
```

Initial architecture menghindari VPS.

Initial exclusions:

- VPS
- PM2
- persistent application server
- self-managed database server

Cloudflare services yang belum diperlukan:

- D1
- R2
- Vectorize
- Workers AI

Services tersebut hanya boleh ditambahkan ketika terdapat concrete requirement.

---

## 18. Initial Development Plan

### Phase 0 — Preserve V1

V1 repositories tetap menjadi historical reference.

Do not refactor V1.

Do not migrate V1 repository history into V2.

---

### Phase 1 — Bootstrap V2

Create:

- repository foundation
- monorepo structure
- TypeScript configuration
- workspace configuration
- linting
- formatting
- testing baseline
- CI baseline

---

### Phase 2 — Dataset Audit

Audit existing V1 dataset.

Review:

- schema
- duplicate records
- null values
- inconsistent naming
- brand normalization
- price normalization
- gender values
- concentration values
- notes
- accords
- occasion
- image references

---

### Phase 3 — Dataset V2

Create normalized V2 production dataset.

Target:

```text
data/perfumes.json
```

Add:

- schema validation
- conversion scripts
- integrity validation
- taxonomy normalization

---

### Phase 4 — Recommendation Engine

Implement:

```text
filter
↓
similarity
↓
weighted scoring
↓
diversification
↓
ranking
↓
Top 5
```

Keep recommendation logic framework-independent.

---

### Phase 5 — Evaluation

Create representative user preference scenarios.

Evaluate:

- recommendation relevance
- ranking quality
- filter behavior
- diversity
- edge cases
- empty candidate handling

Compare selected scenarios against V1 when useful.

Tune scoring weights based on evaluation.

---

### Phase 6 — Frontend V2

Build user-facing application.

Initial scope:

- landing page
- perfume catalog
- perfume detail
- scent preference flow
- recommendation interface
- recommendation results
- recommendation explanation

---

### Phase 7 — Integration

Integrate:

```text
Frontend
+
Production Dataset
+
Recommendation Package
```

Determine whether client-side recommendation remains sufficient.

Only introduce Worker API if required.

---

### Phase 8 — Asset Optimization

Optimize:

- perfume images
- static assets
- dataset payload
- caching
- lazy loading
- bundle size

---

### Phase 8.5 — Canonical visual implementation and mini-hardening (complete)

Implement the five canonical Stitch screens and consolidate CSS while preserving
the Phase 7 runtime, data, recommendation behavior, and asset rights boundary.

### Phase 9 — Production Readiness / Pre-Deployment (complete)

Audit the clean build, generated data, recommender, routes, lazy loading, worker,
performance, memory, accessibility, security, CI, documentation, and rights
boundary. Record evidence and a GO / NO-GO decision before infrastructure work.

### Phase 10 — Cloudflare Deployment & Production Release (current)

**Phase 10A — Cloudflare Pages Setup, Preview Deployment, and Verification:
COMPLETE.** The Git-integrated [production site](https://harumnesia.pages.dev)
serves commit `d500f13533031ed92bec76aa8bab966574d12c0b`, verified against
the immutable deployment URL. Direct SPA routes, MIME, Brotli, cache headers,
taxonomy requests, lazy worker/runtime loading, and recommendation/detail flows
passed on the production URL. Discover displayed and selected exact `vanilla`;
the amber/vanilla scenario reached an explainable Top 5. See the
[deployment record](./deployment.md) for the deployment ID and checks.

**Phase 10B — Custom Domain & Production Cutover: NEXT.** Choose the hostname
with the domain owner, prepare the cutover and rollback, then verify the final
domain. DNS and the custom domain remain unchanged after Phase 10A.

### Phase 10H — Production Verification / Release Hardening (pending)

Verify the released site on the production domain and representative real devices,
monitor failures and performance, and resolve release-specific issues.

The roadmap formerly placed Cloudflare deployment in Phase 9. The Phase 9
readiness gate now separates application validation from Phase 10 infrastructure
and release work. Historical architecture and implementation decisions above
remain as originally scoped.

---

## 19. Future Capabilities

The following features are intentionally deferred:

- authentication
- user accounts
- favorites
- recommendation history
- personalized profile
- admin dashboard
- D1 database
- R2 storage
- Cloudflare Vectorize
- Workers AI

Future architecture changes must be driven by actual requirements.

---

## 20. Engineering Principles

Harumnesia V2 follows these principles:

### Simplicity

Do not introduce infrastructure without clear value.

### Static-first

Prefer static data and assets when the data does not require dynamic persistence.

### Explainability

Recommendation ranking should be understandable and traceable.

### Separation of Concerns

UI, recommendation logic, research, data, and infrastructure must have clear boundaries.

### Testability

Core recommendation logic should be testable without running the frontend.

### Portability

Domain logic should not be unnecessarily coupled to Cloudflare or React.

### Incremental Complexity

Add backend services, databases, vector databases, or AI runtime only when concrete requirements justify them.

### Historical Integrity

V1 remains a historical reference.

V2 should learn from V1 without blindly reproducing its architecture.

---

## 21. Non-Goals for Initial V2

Initial Harumnesia V2 is not intended to:

- reproduce the complete V1 architecture
- maintain MongoDB compatibility
- reuse Autoencoder as production core
- reuse K-Means as production core
- run TensorFlow in production
- operate a VPS
- introduce microservices
- introduce a database without requirement
- introduce a vector database without requirement
- maximize infrastructure complexity

---

## 22. Definition of Initial V2 Success

Initial V2 can be considered functionally successful when:

- production perfume dataset is clean and validated
- recommendation engine produces deterministic Top 5 results
- recommendation results are relevant across defined test scenarios
- recommendation reasons can be explained
- core recommender has automated tests
- frontend can complete the recommendation flow
- project can be deployed without VPS
- production application runs successfully on Cloudflare
- V1 remains intact as historical reference

---

## 23. Development Order

The project should generally follow this sequence:

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
Weight Tuning
    ↓
Frontend
    ↓
Integration
    ↓
    Asset Optimization
    ↓
Production Readiness / Pre-Deployment
    ↓
Cloudflare Deployment
    ↓
Production Verification / Release Hardening
    ↓
Optional Backend Features
```

Do not prioritize UI implementation before the dataset and recommendation foundation are understood.

---

## 24. Current Architectural Decision

For the initial version of Harumnesia V2:

```text
Monorepo                     YES
React + Vite                 YES
TypeScript                   YES
Cloudflare target            YES (Pages production live; custom domain next)
Static JSON                  YES
Static perfume assets        YES

Cosine similarity            YES
Weighted scoring             YES
Diversification              YES
Explainability               YES

Express production server    NO
MongoDB                      NO
VPS                          NO
PM2                          NO
Autoencoder production       NO
K-Means production           NO

D1                           NOT YET
R2                           NOT YET
Workers AI                   NOT YET
Vectorize                    NOT YET
Authentication               NOT YET
```

This document defines the initial engineering direction of Harumnesia V2.

Detailed implementation decisions may evolve based on dataset analysis, evaluation results, and concrete product requirements.
