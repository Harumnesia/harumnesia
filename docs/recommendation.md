# Recommendation Engine

## 1. Scope Phase 4

Phase 4 menyediakan recommendation engine yang deterministic, explainable,
framework-independent, dan browser-compatible. Engine hanya melakukan validasi
request, hard filtering, relevance scoring, diversification, serta penyusunan
hasil. Natural-language extraction, UI, API, deployment, dan evaluasi kualitas
tidak termasuk scope ini.

## 2. Runtime dataset

Caller harus memuat dan memberikan `RecommendationPerfume[]` kepada
`createRecommender()`. Satu-satunya artifact runtime V2 adalah
`data/runtime/recommendation.json`; `data/perfumes.json` bukan input runtime
recommender. Package tidak membaca filesystem, network, database, atau
environment variable.

```ts
import { createRecommender } from '@harumnesia/recommender';

const recommender = createRecommender(dataset);
const response = recommender.recommend({
  preferences: { notes: ['vanilla'], accords: ['woody'] },
});
```

Index memvalidasi dan menyalin dataset sekali saat dibuat. Request dan dataset
input tidak dimutasi. Default output adalah lima item dan maksimum request
adalah 20 item.

## 3. Request schema

`RecommendationRequestSchema` adalah Zod schema publik dengan bentuk berikut:

```ts
type RecommendationRequest = {
  filters?: {
    markets?: Array<'local' | 'international'>;
    genders?: Array<'men' | 'women' | 'unisex'>;
    maxPrice?: {
      amount: number;
      currency: 'IDR';
      unknownPolicy?: 'include' | 'exclude';
    };
    concentrations?: {
      values: string[];
      unknownPolicy?: 'include' | 'exclude';
    };
    occasions?: {
      values: string[];
      unknownPolicy?: 'include' | 'exclude';
    };
    excludeNotes?: string[];
    excludeIds?: string[];
  };
  preferences?: {
    notes?: string[];
    accords?: string[];
    genders?: Array<'men' | 'women' | 'unisex'>;
    concentrations?: string[];
    occasions?: string[];
  };
  limit?: number;
};
```

Notes, accords, dan occasions di-trim, dijadikan lowercase, dibersihkan dari
nilai kosong, lalu dideduplikasi. Concentrations di-trim dan dijadikan
uppercase. ID hanya di-trim dan dideduplikasi. Engine menganggap semua term
sebagai canonical terms; tidak ada alias, fuzzy matching, atau ekstraksi bahasa
alami. Preferred notes/accords yang tidak ada di vocabulary diabaikan dan
dilaporkan lewat `diagnostics.ignoredPreferences`.

## 4. Hard filter semantics

- Market dan gender memakai exact canonical match. `unisex` tidak otomatis
  cocok dengan `men` atau `women`.
- Harga IDR yang diketahui dan melebihi `maxPrice` dieliminasi.
- Concentration yang diketahui harus termasuk nilai yang diminta.
- Occasion yang tersedia harus memiliki minimal satu overlap.
- Kandidat yang mengandung exact excluded note dieliminasi.
- Exact excluded ID dieliminasi.

Hard filter tidak berkontribusi pada relevance score atau explanation.

## 5. Unknown dan missing value

Missing bukan mismatch. Default `unknownPolicy` adalah `include`:

- `price: null` tidak dianggap nol atau over budget;
- `concentration: null` tidak dianggap concentration mismatch;
- `occasion: []` tidak dianggap occasion mismatch;
- `accords: []` berarti accord channel tidak tersedia.

Untuk filter price, concentration, dan occasion, caller dapat memilih
`unknownPolicy: 'exclude'`. Pada soft scoring, channel kandidat yang unavailable
tidak dimasukkan ke numerator maupun denominator.

## 6. Feature construction

Notes dari stage top, middle, dan base digabung sebagai binary set untuk
similarity. Note yang muncul di beberapa stage hanya dihitung sekali. Stage
asli tetap disimpan untuk explanation. Accords memakai binary set dan vocabulary
terpisah agar asymmetry antar-market tidak tercampur dengan notes.

Representasi menggunakan `Set`, `Map`, dan precomputed norm; tidak ada dense
matrix `records x vocabulary`.

## 7. IDF

Notes dan accords masing-masing memiliki corpus statistics sendiri. Untuk total
record `N` dan document frequency `df(t)`:

```text
idf(t) = ln((N + 1) / (df(t) + 1)) + 1
```

Term frequency bersifat binary, sehingga bobot term adalah `idf(t)`. Global IDF
dan candidate norm dihitung sekali saat index dibuat, bukan per request.

## 8. Cosine similarity

Untuk sparse vectors `A` dan `B`:

```text
cosine(A, B) = sum(idf(t)^2 untuk t pada intersection) / (norm(A) * norm(B))
```

Hasil di-clamp ke rentang 0..1. No overlap menghasilkan 0; vector identik
menghasilkan sekitar 1. Empty preference berarti signal tidak diminta, sedangkan
empty candidate channel berarti signal unavailable. Keduanya tidak menghasilkan
`NaN` atau `Infinity`.

## 9. Initial weights

Default terpusat di `src/constants.ts`:

| Signal              | Weight |
| ------------------- | -----: |
| Notes cosine        |   0.55 |
| Accords cosine      |   0.20 |
| Gender match        |   0.10 |
| Occasion match      |   0.10 |
| Concentration match |   0.05 |

Weights dapat dioverride melalui opsi `createRecommender(dataset, { weights })`.
Konfigurasi custom harus menghasilkan total weight yang positif dan finite.
Initial weights ini adalah engineering defaults, bukan nilai yang telah
dioptimalkan secara empiris.

## 10. Missingness-aware weighted scoring

Gender, occasion, dan concentration soft preferences menghasilkan 1 untuk match
dan 0 untuk mismatch yang diketahui. Relevance hanya memakai signal yang diminta
dan tersedia pada kandidat:

```text
weightedSum = sum(signalScore * signalWeight)
applicableWeight = sum(weight untuk requested + available signal)
relevance = weightedSum / applicableWeight
```

Jika tidak ada signal yang applicable, relevance adalah 0. Metadata yang hilang
tidak dikonversi menjadi skor 0. Score selalu berada dalam rentang 0..1.

## 11. Coverage

Coverage memisahkan jumlah evidence dari relevance:

```text
requestedWeight = sum(weight untuk requested signal yang dikenal)
coverage = applicableWeight / requestedWeight
```

Tanpa soft preference, coverage adalah 0. Coverage tidak dikalikan dengan score
dan tidak menjadi hidden missingness penalty. Ia hanya metadata dan tie-break
setelah relevance.

## 12. Ranking sebelum diversification

Urutan awal selalu:

1. relevance score descending;
2. coverage descending;
3. notes similarity descending;
4. accords similarity descending;
5. canonical ID ascending.

Request tanpa soft preference tetap menghasilkan fallback deterministic dengan
score dan coverage 0, lalu canonical ID ascending.

## 13. Diversification dan MMR

Greedy Maximal Marginal Relevance berjalan pada pool
`max(limit * 10, 50)`, dibatasi jumlah kandidat. Item relevance tertinggi dipilih
lebih dulu, lalu setiap tahap memilih:

```text
mmr = lambda * relevance - (1 - lambda) * maxRedundancyToSelected
```

Default `lambda` adalah 0.85. Redundancy memakai notes cosine berbobot 0.80 dan
accords cosine berbobot 0.20, lalu dinormalisasi hanya atas channel yang tersedia
pada kedua kandidat. Tie-break MMR memakai canonical ID ascending. Tidak ada
same-brand cap atau brand penalty. Lambda dan channel weights adalah engineering
defaults, bukan nilai empirically optimized.

## 14. Explanation

Setiap hasil memuat score, coverage, component scores, pre-diversification rank,
final `rank`, `mmrScore`, matched terms, maksimum tiga reasons, dan perfume
runtime record. Matched notes menyertakan stage top/middle/base. Reason dibangun
hanya dari actual positive match, diurutkan berdasarkan bobot signal lalu urutan
signal yang tetap. Signal unavailable atau mismatch tidak menghasilkan reason;
tidak ada generated prose atau klaim kualitas.

## 15. Deterministic guarantees

Tidak ada random state, waktu, network, atau insertion-order eksternal sebagai
ranking signal. Semua tahap memiliki tie-break canonical ID. Dataset dan request
yang sama menghasilkan ordered IDs yang sama, termasuk setelah index dibuat
ulang. Canonical ID hanya dipakai untuk identity dan tie-break, bukan relevance.

## 16. Index dan performance architecture

`createRecommender()` memvalidasi dataset, menolak duplicate ID, menghitung
document frequencies/IDF, membangun sparse feature sets, dan menyimpan norms.
Index dipakai ulang oleh semua query dan tidak diekspos dalam result. Query tidak
meng-clone seluruh dataset dan hanya meng-clone record hasil agar caller tidak
dapat memutasi state index. `pnpm recommender:smoke` mengukur load, parse,
indexing, query latency, dan observed process heap delta tanpa timing threshold
CI yang flaky.

## 17. Known limitations

- Notes taxonomy masih memiliki dua intentionally unresolved malformed terms.
- Accords tidak tersedia untuk record local.
- Price, occasion, dan concentration tidak tersedia untuk record international.
- Sebanyak 285 local XDP memiliki concentration yang unresolved (`null`).
- Tidak ada semantic embeddings atau semantic similarity.
- Tidak ada typo/fuzzy matching saat recommendation runtime.
- Tidak ada LLM preference extraction.
- Tidak ada personalization/history atau collaborative filtering.
- Rating tidak digunakan sebagai signal.
- Belum ada empirical weight atau MMR tuning.
- Browser performance akan divalidasi lebih lanjut saat frontend integration.

## 18. Phase 5 evaluation items

Phase 5 perlu mengukur ranking relevance, coverage distribution, cross-market
behavior, redundancy/diversity, sensitivity terhadap weights dan lambda,
representative query sets, serta browser memory/latency. Evaluasi tersebut yang
akan menentukan perubahan parameter; Phase 4 tidak mengklaim hasilnya baik,
akurat, atau optimal.
