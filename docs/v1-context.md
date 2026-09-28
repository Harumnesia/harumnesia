# Harumnesia V1 Context

## Purpose

Dokumen ini memberikan konteks teknis Harumnesia V1 untuk membantu pengembangan Harumnesia V2.

Harumnesia V1 merupakan original implementation dari project capstone Coding Camp by DBS Foundation.

V1 dipertahankan sebagai historical reference dan tidak menjadi codebase aktif untuk pengembangan V2.

Repository V1:

- `../harumnesia-febe-capstone`
- `../harumnesia-ml-capstone`

Repository aktif V2:

- `../harumnesia-v2`

---

## 1. V1 Repository Layout

Workspace lokal:

```text
harumnesia/
├── harumnesia-febe-capstone/
├── harumnesia-ml-capstone/
└── harumnesia-v2/
```

Role masing-masing repository:

### `harumnesia-febe-capstone`

Original frontend dan backend Harumnesia V1.

Berisi:

- React frontend
- Vite
- Tailwind CSS
- Express backend
- MongoDB integration
- REST API
- ML service integration
- deployment configuration
- UI dan recommendation flow V1

Canonical branch:

```text
final
```

Historical branches yang masih tersedia:

```text
api
backend-express
backup-main
final
mlservice-formbased
mlservice-similiarity
```

Branch `final` digunakan sebagai baseline utama untuk memahami V1.

---

### `harumnesia-ml-capstone`

Original machine learning repository Harumnesia V1.

Berisi:

- raw dataset
- cleaned dataset
- merged dataset
- preprocessing notebooks
- TF-IDF experiments
- Autoencoder
- K-Means
- Cosine Similarity
- serialized model artifacts

Canonical branch:

```text
main
```

---

## 2. V1 Product Context

Harumnesia V1 adalah platform discovery dan recommendation parfum.

Fitur utama yang dapat ditemukan pada implementation V1 meliputi:

- landing page
- perfume catalog
- perfume detail
- brand listing
- brand detail
- educational content
- preference-based recommendation
- similarity-based recommendation
- recommendation result pages

V1 menggunakan kombinasi application logic, database data, dan ML services untuk menyediakan recommendation.

---

## 3. V1 High-Level Architecture

Simplified architecture:

```text
                    Harumnesia V1

┌─────────────────────────────────────────┐
│ React + Vite Frontend                   │
│                                         │
│ Catalog                                 │
│ Brand                                   │
│ Perfume Detail                          │
│ Recommendation UI                       │
└───────────────────┬─────────────────────┘
                    │
        ┌───────────┼────────────┐
        │           │            │
        ▼           ▼            ▼
┌─────────────┐ ┌───────────┐ ┌───────────────┐
│ Express API │ │ ML Service│ │ ML Service    │
│             │ │ Similarity│ │ Form-based    │
└──────┬──────┘ └───────────┘ └───────────────┘
       │
       ▼
┌─────────────┐
│ MongoDB     │
│ Atlas       │
└─────────────┘
```

V1 menggunakan beberapa service terpisah sehingga frontend bergantung pada external API endpoints untuk data dan recommendation.

---

## 4. V1 Frontend Stack

Frontend V1 menggunakan:

```text
React
Vite
JavaScript
React Router
Tailwind CSS
```

Representative structure:

```text
src/
├── components/
├── config/
├── pages/
├── styles/
├── App.jsx
└── main.jsx
```

Beberapa halaman utama:

```text
AboutUs.jsx
BrandDetail.jsx
Brands.jsx
Catalog.jsx
Edukasi.jsx
EdukasiDetail.jsx
Home.jsx
PerfumeDetail.jsx
Recommendation.jsx
RecommendationMethod.jsx
RecommendationResults.jsx
SimilarityRecommendation.jsx
```

Frontend memiliki direct knowledge terhadap beberapa backend dan ML service endpoints.

Hal ini menjadi salah satu coupling yang dikurangi pada V2.

---

## 5. V1 Backend Stack

Backend V1 berada di:

```text
harumnesia-febe-capstone/server/
```

Stack utama:

```text
Node.js
Express
MongoDB Atlas
Mongoose
dotenv
CORS
PM2
```

Representative structure:

```text
server/
├── config/
├── controllers/
├── models/
├── routes/
├── ecosystem.config.js
├── seeder.js
└── server.js
```

Backend digunakan untuk:

- perfume API
- brand API
- international perfume API
- MongoDB access
- ML proxy behavior
- health endpoint
- supporting recommendation data retrieval

---

## 6. V1 Data Layer

V1 menggunakan MongoDB sebagai production data store.

Frontend mengambil data melalui Express API.

General flow:

```text
Frontend
   │
   ▼
Express API
   │
   ▼
Mongoose
   │
   ▼
MongoDB Atlas
```

V1 juga memiliki dataset CSV pada ML repository yang digunakan untuk model training dan experimentation.

---

## 7. V1 Dataset Structure

ML repository menyimpan beberapa tahap dataset.

Representative structure:

```text
Dataset/
├── Dataset Awal/
│   ├── dataset - PERFUME LOKAL.csv
│   └── fra_cleaned.csv
│
├── Dataset_Clean/
│   ├── Dataset_Harumnesia_clean.csv
│   ├── Dataset_Parfum_Luar.csv
│   └── Gabungan Parfum Lokal & Internasional.csv
│
└── Dataset_Gabungan/
    ├── dataset_parfum_gabungan.csv
    └── final_cosine.csv
```

Dataset tersebut menjadi sumber utama untuk audit dan pembangunan dataset V2.

Dataset V2 tidak boleh diasumsikan langsung siap production.

Sebelum digunakan kembali, lakukan audit terhadap:

- duplicate records
- missing values
- inconsistent brand naming
- inconsistent gender values
- inconsistent concentration values
- price formats
- notes representation
- image references
- taxonomy consistency
- local vs international perfume fields

---

## 8. V1 Recommendation Systems

V1 memiliki dua pendekatan recommendation utama.

---

### 8.1 Form-Based Recommendation

General flow:

```text
User Preference
      │
      ▼
Form Input
      │
      ▼
Description Processing
      │
      ▼
Feature Preprocessing
      │
      ├── TF-IDF
      ├── One-Hot Encoding
      └── Scaling
      │
      ▼
Autoencoder
      │
      ▼
K-Means
      │
      ▼
Cosine Similarity
      │
      ▼
Recommended Perfumes
```

User preference dapat mencakup:

- gender
- situation
- concentration
- bottle size
- price range
- aroma description

V1 ML documentation juga menggunakan Gemini API dan LangChain dalam preprocessing description untuk menghasilkan atau mengekstrak scent-related information.

---

### 8.2 Similarity Recommendation

General flow:

```text
Selected Perfume
      │
      ▼
Perfume Notes
      │
      ▼
TF-IDF Vectorization
      │
      ▼
Cosine Similarity
      │
      ▼
Similar Perfumes
```

Approach ini lebih sederhana dibandingkan form-based recommendation.

Konsep Cosine Similarity dari V1 tetap relevan sebagai salah satu building block V2, tetapi bukan satu-satunya ranking mechanism.

---

## 9. V1 ML Artifacts

Representative artifacts:

```text
Model recomendation/
├── autoencoder_model.h5
├── encoder_model.h5
├── kmeans.pkl
├── label_encoder.pkl
├── ohe.pkl
├── scaler.pkl
└── vectorizer.pkl
```

Similarity model:

```text
Model/
└── Model_Cosine/
    └── tfidf_vectorizer.pkl
```

Research notebooks:

```text
Cleaning_Dataset.ipynb
Perfume_Recommendation_System_using_ML_method_.ipynb
model_cosine_similiarity.ipynb
```

Artifacts tersebut merupakan historical implementation V1.

Mereka tidak otomatis menjadi production dependency V2.

---

## 10. V1 Deployment Model

V1 dirancang menggunakan infrastructure yang bergantung pada long-running server.

Representative deployment model:

```text
Frontend
   │
   ├── Express API
   ├── Database service
   ├── Similarity ML service
   └── Form-based ML service

Backend / Services
   │
   ▼
VPS
   │
   ▼
PM2
```

V1 configuration dan source juga menunjukkan penggunaan domain/service endpoints terpisah untuk:

- database API
- similarity ML API
- form-based ML API

Endpoint tersebut harus dianggap historical references.

Jangan mengasumsikan service V1 masih aktif atau masih menjadi target deployment.

---

## 11. V1 Characteristics

Karakteristik utama V1:

### Strengths

- memiliki end-to-end working product structure
- memiliki dataset lokal dan gabungan
- memiliki multiple recommendation approaches
- memiliki ML experimentation yang nyata
- memiliki catalog dan recommendation user flow
- memiliki reusable domain knowledge tentang parfum

### Limitations Relevant to V2

- frontend, backend, ML, dan data tersebar
- operational dependency terhadap VPS
- MongoDB diperlukan untuk data yang relatif static
- recommendation production memiliki runtime complexity tinggi
- Autoencoder dan K-Means menambah complexity
- beberapa service harus tersedia bersamaan
- recommendation explanation belum menjadi first-class output
- application logic cukup tightly coupled dengan external endpoints
- historical configuration dan documentation memiliki beberapa drift

---

## 12. Why V2 Is a Re-engineering

V2 bukan sekadar:

```text
V1
↓
move hosting to Cloudflare
```

V2 adalah:

```text
V1 domain knowledge
+ useful dataset
+ useful recommendation concepts
        │
        ▼
Architectural reassessment
        │
        ▼
Simpler production design
        │
        ▼
Harumnesia V2
```

Perubahan utama:

```text
V1                               V2

Multiple repositories            Monorepo
VPS                              Cloudflare
Express runtime                  Optional Worker API
MongoDB                          Static JSON initially
Separate ML services             In-process recommender
Autoencoder production           Removed from core production
K-Means production               Removed from core production
Cosine-only paths                Cosine + scoring
Limited explainability           Explainable recommendation
ML runtime dependency            ML research separated
```

---

## 13. What V2 Should Reuse

V2 boleh menggunakan V1 sebagai reference untuk:

- perfume datasets
- domain terminology
- notes information
- perfume metadata
- brand information
- recommendation input concepts
- user flow ideas
- catalog structure
- perfume detail content
- TF-IDF research
- Cosine Similarity research
- previous recommendation scenarios
- lessons learned from V1

Reuse harus dilakukan secara selective.

---

## 14. What V2 Should Not Blindly Copy

Jangan copy secara otomatis:

- complete `src/` folder
- complete `server/` folder
- MongoDB architecture
- PM2 configuration
- VPS deployment assumptions
- old API endpoint configuration
- old `.env` files
- credentials
- old ML service integration
- `.h5` production dependency
- `.pkl` production dependency
- Autoencoder production pipeline
- K-Means production pipeline
- legacy folder organization

Setiap bagian V1 harus dievaluasi berdasarkan kebutuhan V2.

---

## 15. Security Context

V1 merupakan historical capstone repository dan memiliki configuration/documentation yang berasal dari development lama.

Ketika membaca V1:

- jangan menyalin credential
- jangan menggunakan secret lama
- jangan menganggap `.env.example` sebagai secure source
- jangan mengaktifkan kembali endpoint lama tanpa verification
- jangan menyalin connection string ke V2
- jangan memasukkan secret ke repository V2

Configuration V1 digunakan hanya untuk memahami historical architecture.

---

## 16. V1 as Evaluation Baseline

V1 dapat digunakan sebagai baseline ketika mengevaluasi recommender V2.

Potential comparison:

```text
Same user preference
        │
        ├── V1 recommendation
        │
        └── V2 recommendation
```

Comparison dapat melihat:

- relevance
- diversity
- interpretability
- determinism
- runtime complexity
- infrastructure dependency
- maintainability

Tujuan comparison bukan membuktikan V2 selalu lebih baik, tetapi memahami trade-off dan memastikan redesign tetap menghasilkan recommendation yang masuk akal.

---

## 17. Relationship to V2 Plan

Dokumen ini menjelaskan kondisi historis V1.

Arah engineering V2 didefinisikan di:

```text
docs/v2-plan.md
```

Gunakan:

```text
v1-context.md
```

untuk memahami:

```text
Where the project came from
```

dan:

```text
v2-plan.md
```

untuk memahami:

```text
Where the project is going
```

---

## 18. Source of Truth Rule

Jika terdapat perbedaan antara dokumentasi V1 dan actual V1 source code:

```text
actual source code
>
historical documentation
```

Untuk keputusan V2:

```text
docs/v2-plan.md
>
V1 implementation assumptions
```

V1 adalah reference.

V2 adalah active engineering direction.
