# Harumnesia V2 — Phase 2 Dataset Audit

Tanggal audit: 2026-09-28

## Metode dan batas audit

Audit ini membaca snapshot lokal repository V1 berikut tanpa mengubahnya:

- `../harumnesia-ml-capstone` pada branch `main`
- `../harumnesia-febe-capstone` pada branch `final`

Seluruh tujuh CSV di bawah `harumnesia-ml-capstone/Dataset` diperiksa. Hitungan row, schema, missing value, duplicate, vocabulary notes/accords, price, URL, dan overlap record dihasilkan ulang oleh `scripts/audit-dataset/audit.py`; hasil lengkapnya tersimpan di `scripts/audit-dataset/audit-results.json`. SHA-256 setiap CSV sumber turut direkam di hasil audit agar snapshot dapat diidentifikasi.

Istilah yang digunakan:

- **Observed**: dibuktikan langsung oleh file, notebook, source V1, atau hitungan script.
- **Inferred**: hubungan paling mungkin berdasarkan urutan row, kesamaan isi, dan transformasi yang terlihat, tetapi tidak seluruhnya memiliki notebook pembuat.
- **Recommendation**: usulan untuk Phase 3, bukan perubahan data pada Phase 2.
- **Unresolved**: memerlukan keputusan atau evidence tambahan.

Tidak ada dataset V1 yang diubah, notebook tidak dijalankan, URL eksternal tidak diunduh atau diuji, dan audit ini tidak menghasilkan `data/perfumes.json`.

## 1. Executive Summary

**Observed:** tersedia tujuh dataset relevan: dua sumber awal, tiga dataset berlabel clean, satu dataset gabungan untuk similarity, dan satu turunan cosine. Dataset mencakup 1.064 row lokal dan 24.063 row internasional; gabungan keduanya berisi 25.127 row dengan ID unik.

Tidak ada satu file yang cukup kaya sekaligus aman sebagai baseline tunggal:

- Baseline lokal terbaik adalah `Dataset/Dataset_Clean/Dataset_Harumnesia_clean.csv` (1.064 × 13).
- Baseline internasional terbaik adalah `Dataset/Dataset Awal/fra_cleaned.csv` (24.063 × 18), dibaca sebagai Windows-1252 dengan delimiter `;` dan decimal comma untuk rating.
- `Dataset/Dataset_Gabungan/dataset_parfum_gabungan.csv` berguna sebagai mapping legacy ID (`HRMN-*`/`FRGN-*`) dan bukti union, bukan sebagai sumber atribut utama.

Alasan tidak memilih satu file gabungan:

1. `Gabungan Parfum  Lokal & Internasional.csv` menyalin `top notes` ke `mid notes` dan `base notes` pada seluruh 1.064 row lokal. Hanya satu row pada sumber lokal yang memang memiliki tiga stage identik.
2. File tersebut juga mengubah empat nama internasional (`9am`, `9pm`, `015`, `000`) menjadi nilai mirip hasil coercion spreadsheet (`9:00`, `21:00`, `15`, `0`) dan dua nilai `No` menjadi `0:00`.
3. `final_cosine.csv` adalah turunan model-specific: tiga stage notes digabung dan di-lowercase, sementara price, size, concentration, situation, gender, country, ratings, perfumers, accords, source URL, dan image dibuang.
4. Dataset internasional lima kolom mempertahankan notes, tetapi membuang 13 kolom provenance/metadata dan menciptakan lima exact duplicate setelah proyeksi.

Masalah kualitas terbesar adalah kerusakan stage notes pada gabungan “Clean”, duplikasi nama yang belum tentu merupakan duplicate produk, perbedaan encoding, variasi taxonomy notes, currency yang tidak eksplisit, tidak adanya image internasional, dan ketimpangan schema lokal/internasional.

## 2. Dataset Inventory

| Path relatif terhadap repo ML V1                                   | Format                 | Row × column | Cakupan / tahap                                        | Likely purpose                                                                                            |
| ------------------------------------------------------------------ | ---------------------- | -----------: | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `Dataset/Dataset Awal/dataset - PERFUME LOKAL.csv`                 | CSV, UTF-8, `,`        |   1.064 × 13 | Lokal, source/raw                                      | Sumber katalog lokal dengan commerce metadata, staged notes, dan image URL                                |
| `Dataset/Dataset Awal/fra_cleaned.csv`                             | CSV, Windows-1252, `;` |  24.063 × 18 | Internasional, source yang sudah diberi nama “cleaned” | Sumber internasional paling kaya; URL Fragrantica, country, rating, year, perfumer, staged notes, accords |
| `Dataset/Dataset_Clean/Dataset_Harumnesia_clean.csv`               | CSV, UTF-8, `,`        |   1.064 × 13 | Lokal, cleaned                                         | Output notebook cleaning lokal dan input notebook form-based recommender                                  |
| `Dataset/Dataset_Clean/Dataset_Parfum_Luar.csv`                    | CSV, UTF-8, `,`        |   24.063 × 5 | Internasional, cleaned projection                      | Projection display-name + staged notes; metadata lain dibuang                                             |
| `Dataset/Dataset_Clean/Gabungan Parfum  Lokal & Internasional.csv` | CSV, UTF-8, `,`        |   25.127 × 8 | Combined, cleaned/intermediate                         | Union dengan display casing, tetapi memiliki corruption; tidak aman sebagai baseline                      |
| `Dataset/Dataset_Gabungan/dataset_parfum_gabungan.csv`             | CSV, UTF-8, `,`        |   25.127 × 8 | Combined, recommendation input                         | Union lokal + internasional dengan legacy ID dan staged notes untuk cosine notebook                       |
| `Dataset/Dataset_Gabungan/final_cosine.csv`                        | CSV, UTF-8, `,`        |   25.127 × 5 | Combined, model-specific/final similarity metadata     | Exact transformation input cosine: staged notes menjadi satu `Notes` lowercase                            |

File model `.h5`/`.pkl` dan notebook diinventarisasi sebagai evidence provenance, tetapi bukan dataset tabular yang diaudit sebagai record katalog.

## 3. Dataset Lineage / Relationships

### Lineage yang dibuktikan source

```text
dataset - PERFUME LOKAL.csv
    │ Cleaning_Dataset.ipynb
    │ - hapus . dan , pada price
    │ - cast price ke integer
    │ - capitalize gender
    │ - title-case staged notes
    ▼
Dataset_Harumnesia_clean.csv
    │
    └── Perfume_Recommendation_System_using_ML_method_.ipynb
        (form-based V1; image dan No dibuang sebelum feature processing)

dataset_parfum_gabungan.csv
    │ model_cosine_similiarity.ipynb
    │ - drop No
    │ - concatenate top + mid + base
    │ - lowercase Notes
    ▼
final_cosine.csv
```

**Observed:** transform notebook cosine cocok tepat pada 25.127/25.127 row `final_cosine.csv`, termasuk ID, perfume, brand, `is_lokal`, dan hasil concatenation `Notes`.

### Lineage yang diinferensikan dari isi

```text
dataset lokal raw (1.064)
             ┐
             ├── selected fields + generated IDs ──► dataset_parfum_gabungan.csv
             │                                         (25.127)
fra_cleaned  ┘
(24.063)

fra_cleaned ── display normalization / 5-column projection ──► Dataset_Parfum_Luar.csv

local clean + international projection ── unknown/manual processing ──►
Gabungan Parfum Lokal & Internasional.csv
```

Evidence hubungan:

- Semua 1.064 ID lokal memiliki urutan yang sama antara raw dan local clean.
- `dataset_parfum_gabungan.csv` berisi 1.064 row lokal lebih dahulu dan 24.063 row internasional sesudahnya.
- Lima field internasional di `dataset_parfum_gabungan.csv` sama persis dengan `fra_cleaned.csv` pada seluruh 24.063 row.
- Perbedaan lokal pada gabungan non-clean hanya tiga `mid notes` dan lima `base notes`; perbedaannya berupa tambahan titik atau perubahan placeholder `-` menjadi blank, bukan penggantian stage massal.
- Seluruh 24.063 pasangan nama/brand pada `fra_cleaned.csv` cocok dengan projection lima kolom setelah mengabaikan case, spasi, dan punctuation slug.
- Tidak ada code/notebook tracked yang membuktikan langkah pembuatan `fra_cleaned.csv`, `Dataset_Parfum_Luar.csv`, atau kedua file gabungan. Bagian tersebut tetap **inferred**, bukan proven.

## 4. Schema Comparison

### Arti field dan konsistensi lintas dataset

| Field/family                | Makna berdasarkan penggunaan V1                | Konsistensi                                                                                       |
| --------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `No`                        | Ordinal row, bukan identity domain             | Tidak aman sebagai ID; dua nilai berubah menjadi `0:00` pada gabungan clean                       |
| `ID_Perfume`                | Legacy application/model ID                    | Unik di semua file yang memilikinya; lokal `HRMN-*`, internasional generated `FRGN-*`             |
| `perfume` / `Perfume`       | Nama parfum                                    | Lokal display-like mixed case; internasional rich berupa slug; derived clean berupa display title |
| `brand` / `Brand`           | Nama brand                                     | Makna sama; internasional rich berupa slug dan projection berupa display title                    |
| `price`                     | Nominal harga lokal                            | Hanya lokal; currency tidak disimpan                                                              |
| `size`                      | Volume botol, secara penggunaan diasumsikan ml | Hanya lokal; unit tidak ada dalam field                                                           |
| `concentrate`               | Konsentrasi (`EDT`, `EDP`, `XDP`)              | Hanya lokal; nama field dan taxonomy perlu dinormalisasi                                          |
| `top`/`middle`/`base` notes | Staged fragrance notes, comma-separated        | Tersedia di kedua sumber; naming column dan casing berbeda                                        |
| `Notes`                     | Concatenation lowercase dari tiga stage        | Derived untuk cosine; tidak boleh menggantikan staged source                                      |
| `situation`                 | Day/Night/Versatile suitability                | Hanya lokal; berperan sebagai occasion-like field                                                 |
| `gender` / `Gender`         | Audience gender tunggal per row                | Lokal Female/Male/Unisex; internasional women/men/unisex                                          |
| `image`                     | External product image URL                     | Hanya lokal                                                                                       |
| `url`                       | External Fragrantica record page               | Hanya internasional dan bukan image URL                                                           |
| `Country`                   | Country label pada record internasional        | Hanya internasional; semantics kemungkinan country brand/source, tidak dijelaskan eksplisit       |
| `Rating Value/Count`        | Rating decimal-comma dan jumlah rating         | Hanya internasional                                                                               |
| `Year`                      | Release year                                   | Hanya internasional; optional                                                                     |
| `Perfumer1/2`               | Nama perfumer                                  | Hanya internasional; sangat sparse                                                                |
| `mainaccord1..5`            | Ranked main accords                            | Hanya internasional; rank setelah pertama makin optional                                          |
| `is_lokal`                  | Boolean-string penanda source group            | Hanya file gabungan; `TRUE/FALSE` lalu `True/False` di cosine                                     |

### Local raw dan local clean (schema sama)

Missing adalah gabungan null, blank, dan placeholder (`-`, `unknown`, dan sejenisnya). CSV ini tidak mempunyai actual parser-null.

| Column        | Inferred type raw → clean          |    Missing | Unique raw → clean | Contoh                         |
| ------------- | ---------------------------------- | ---------: | -----------------: | ------------------------------ |
| `No`          | integer → integer                  |          0 |      1.064 → 1.064 | `1`, `2`                       |
| `ID_Perfume`  | string → string                    |          0 |      1.064 → 1.064 | `HRMN-0001`                    |
| `perfume`     | string → string                    |          0 |      1.031 → 1.031 | `glitch`, `Cafe Drops`         |
| `brand`       | string → string                    |          0 |          134 → 134 | `mykonos`, `HMNS`              |
| `price`       | formatted numeric string → integer |          0 |          233 → 227 | `249000`, `320.000`            |
| `size`        | integer                            |          0 |                 18 | `50`, `100`, `30`              |
| `concentrate` | string category                    |          0 |                  3 | `XDP`, `EDP`, `EDT`            |
| `top notes`   | comma-separated string             |  2 (0,19%) |          998 → 984 | `Bergamot, Apple`              |
| `mid notes`   | comma-separated string             | 24 (2,26%) |          994 → 975 | `Lavender, Jasmine`            |
| `base notes`  | comma-separated string             | 27 (2,54%) |          953 → 924 | `Musk, Amber`                  |
| `situation`   | string category                    |          0 |                  3 | `Day`, `Night`, `Versatile`    |
| `image`       | URL                                |          0 |              1.060 | Tokopedia/Shopee/brand CDN URL |
| `gender`      | string category                    |          0 |    7 raw → 3 clean | `Unisex`, `Female`, `Male`     |

### International rich source: `fra_cleaned.csv`

| Column         | Inferred type          |         Missing |                 Unique | Contoh                           |
| -------------- | ---------------------- | --------------: | ---------------------: | -------------------------------- |
| `url`          | URL                    |               0 |                 24.063 | Fragrantica perfume page         |
| `Perfume`      | slug string            |               0 |                 22.840 | `accento-overdose-pride-edition` |
| `Brand`        | slug string            |               0 |                  1.060 | `jean-paul-gaultier`             |
| `Country`      | string category        |               0 |                     54 | `France`, `USA`, `UAE`           |
| `Gender`       | string category        |               0 |                      3 | `women`, `unisex`, `men`         |
| `Rating Value` | decimal-comma string   |               0 |                    221 | `1,42`, `4,5`                    |
| `Rating Count` | integer                |               0 |                  2.721 | `201`, `6865`                    |
| `Year`         | integer-like string    |   2.037 (8,47%) |                    145 | `2022`, `2024`                   |
| `Top`          | comma-separated string |               0 |                 18.771 | `fruity notes, aldehydes`        |
| `Middle`       | comma-separated string |               0 |                 19.690 | `rose, jasmine`                  |
| `Base`         | comma-separated string |               0 |                 16.393 | `musk, woods`                    |
| `Perfumer1`    | string                 | 12.320 (51,20%) | 869 termasuk `unknown` | `natalie gracia-cetto`           |
| `Perfumer2`    | string                 | 22.727 (94,45%) |                    259 | `quentin bisch`                  |
| `mainaccord1`  | string category        |               0 |                     66 | `woody`, `citrus`                |
| `mainaccord2`  | string category        |      13 (0,05%) |                     71 | `white floral`                   |
| `mainaccord3`  | string category        |     114 (0,47%) |                     72 | `sweet`                          |
| `mainaccord4`  | string category        |     388 (1,61%) |                     69 | `fresh spicy`                    |
| `mainaccord5`  | string category        |     981 (4,08%) |                     77 | `musky`                          |

### International five-column projection

| Column       | Inferred type          | Missing | Unique | Contoh                           |
| ------------ | ---------------------- | ------: | -----: | -------------------------------- |
| `perfume`    | display string         |       0 | 22.840 | `Accento Overdose Pride Edition` |
| `brand`      | display string         |       0 |  1.060 | `Jean Paul Gaultier`             |
| `top notes`  | comma-separated string |       0 | 18.771 | `Fruity Notes, Aldehydes`        |
| `mid notes`  | comma-separated string |       0 | 19.690 | `Bulgarian Rose, Jasmine`        |
| `base notes` | comma-separated string |       0 | 16.393 | `Musk, Blonde Woods`             |

### Combined datasets: non-clean → clean

| Column       | Type                   | Missing non-clean → clean | Unique non-clean → clean | Finding                                                       |
| ------------ | ---------------------- | ------------------------: | -----------------------: | ------------------------------------------------------------- |
| `No`         | integer → mixed string |                     0 → 0 |          25.127 → 25.126 | Dua `0:00` pada clean                                         |
| `ID_Perfume` | string                 |                     0 → 0 |          25.127 → 25.127 | Unique                                                        |
| `perfume`    | string                 |                     0 → 0 |          23.871 → 23.729 | Casing/slug transform dan empat coercion nama                 |
| `brand`      | string                 |                     0 → 0 |            1.194 → 1.194 | Local style + international display style                     |
| `top notes`  | string                 |                     2 → 2 |          19.758 → 19.599 | Local title-case; placeholders tetap                          |
| `mid notes`  | string                 |                    24 → 2 |          20.669 → 20.623 | Missing tampak “membaik” karena stage lokal ditimpa top notes |
| `base notes` | string                 |                    27 → 2 |          17.313 → 17.349 | Missing tampak “membaik” karena corruption yang sama          |
| `is_lokal`   | boolean-string         |                     0 → 0 |                    2 → 2 | 1.064 TRUE, 24.063 FALSE                                      |

### Cosine projection

| Column       | Inferred type   | Missing | Unique | Semantics                                                                           |
| ------------ | --------------- | ------: | -----: | ----------------------------------------------------------------------------------- |
| `ID_Perfume` | string          |       0 | 25.127 | Legacy model ID                                                                     |
| `perfume`    | string          |       0 | 23.871 | Nama dari combined non-clean                                                        |
| `brand`      | string          |       0 |  1.194 | Brand dari combined non-clean                                                       |
| `is_lokal`   | boolean-string  |       0 |      2 | `True`/`False`                                                                      |
| `Notes`      | combined string |       0 | 24.978 | Lowercase concatenation top/mid/base; nonblank walau individual stage dapat missing |

## 5. Data Quality Findings

### Temuan kritis

1. **Stage notes lokal rusak pada combined clean.** `top notes == mid notes == base notes` pada 1.064/1.064 row, dibanding hanya 1/1.064 pada local clean.
2. **Spreadsheet-like coercion pada combined clean.** `9am→9:00`, `9pm→21:00`, `015→15`, `000→0`; dua ordinal `No` juga menjadi `0:00`.
3. **Projection internasional bersifat lossy.** Dataset lima kolom membuang URL unik, country, gender, rating, year, perfumer, dan accords; lima pasangan row kemudian menjadi exact duplicate.
4. **Encoding tidak seragam.** `fra_cleaned.csv` harus dibaca sebagai Windows-1252. Projection UTF-8 lima kolom mengandung 51 cell dengan C1 control characters (`U+0092`/`U+0099`), sedangkan source Windows-1252 dapat didecode menjadi punctuation/trademark yang benar.
5. **Whitespace tersembunyi.** Local source mempunyai 10 nama dengan trailing whitespace, tiga brand, tiga top notes, tiga mid notes, enam base notes (termasuk leading), satu image URL, dan tiga zero-width spaces dalam base notes. International rich mempunyai 90 trailing spaces pada `Country` (`Arabia saudi `).

### Temuan lain

- Semua source ID lokal unik; semua ID gabungan unik dan mengikuti prefix `HRMN`/`FRGN`.
- `description` tidak tersedia di ketujuh CSV. Description pada model/seeder backend V1 bukan bukti data katalog penuh.
- Local raw dan rich international source tidak memiliki exact duplicate row.
- Label “clean” atau “final” tidak berkorelasi otomatis dengan completeness atau correctness.
- Source internasional menyimpan nama/brand sebagai slug; bentuk display pada projection adalah transformasi, bukan field sumber terpisah.

## 6. Missing Values

| Dataset            | Column         | Actual null |  Blank |      Placeholder |   Total missing |
| ------------------ | -------------- | ----------: | -----: | ---------------: | --------------: |
| Local raw/clean    | `top notes`    |           0 |      0 |                2 |       2 (0,19%) |
| Local raw/clean    | `mid notes`    |           0 |      0 |               24 |      24 (2,26%) |
| Local raw/clean    | `base notes`   |           0 |      0 |               27 |      27 (2,54%) |
| International rich | `Year`         |           0 |  2.037 |                0 |   2.037 (8,47%) |
| International rich | `Perfumer1`    |           0 |      0 | 12.320 `unknown` | 12.320 (51,20%) |
| International rich | `Perfumer2`    |           0 | 22.727 |                0 | 22.727 (94,45%) |
| International rich | `mainaccord2`  |           0 |     13 |                0 |      13 (0,05%) |
| International rich | `mainaccord3`  |           0 |    114 |                0 |     114 (0,47%) |
| International rich | `mainaccord4`  |           0 |    388 |                0 |     388 (1,61%) |
| International rich | `mainaccord5`  |           0 |    981 |                0 |     981 (4,08%) |
| Combined non-clean | `top/mid/base` |           0 |  0/1/3 |          2/23/24 |         2/24/27 |

`final_cosine.Notes` memiliki nol missing hanya karena concatenation menghasilkan string meskipun salah satu stage kosong. Angka nol tersebut tidak boleh ditafsirkan sebagai kelengkapan notes penuh.

## 7. Duplicate Analysis

| Dataset                   | Exact duplicate extra rows | Duplicate perfume-name extra rows/groups | Duplicate perfume+brand extra rows/groups |
| ------------------------- | -------------------------: | ---------------------------------------: | ----------------------------------------: |
| Local raw                 |                          0 |                                  36 / 32 |                                     8 / 8 |
| Local clean               |                          0 |                                  36 / 32 |                                     8 / 8 |
| International rich        |                          0 |                              1.223 / 820 |                                 217 / 202 |
| International five-column |               5 / 5 groups |                              1.223 / 820 |                                 217 / 202 |
| Combined non-clean        |                          0 |                              1.362 / 900 |                                 225 / 210 |
| Combined clean            |                          0 |                              1.400 / 928 |                                 225 / 210 |
| Final cosine              |                          0 |                              1.362 / 900 |                                 225 / 210 |

Delapan duplicate key lokal tidak otomatis duplicate record. Contoh `Cherry Pop`, `Juliette`, `Nectar of Nile`, `Plain Jane`, `Portrait of Kyoto`, dan `Teamomile` dari The Body Tale berbeda size/price; `Noble` dan `Zephyr` memerlukan review karena atributnya berbeda walau name+brand sama.

Pada internasional, nama yang sama dapat mewakili release/gender/formulation berbeda. Contoh `Gold`/Commodity memiliki lima row dengan URL, year, gender, dan notes berbeda. Karena itu dedupe tidak boleh dilakukan hanya pada normalized `name + brand`.

Lima exact duplicate pada projection internasional adalah hasil metadata pembeda yang dibuang, bukan exact duplicate di source rich. Contohnya `Paper`/Commodity dan `Book`/Commodity.

Potential punctuation/case variants juga ada: lokal mempunyai `FLO/Flo`, `Joie de Vivre/Joie De Vivre`, dan `OLD MONEY/Old Money`; internasional mempunyai 25 group seperti `agarwood/agar-wood`, `bitter-sweet/bittersweet`, dan `rendez-vous/rendezvous`. Group ini hanya kandidat review, bukan bukti entitas sama.

## 8. Categorical Value Analysis

### Lokal

| Field         | Values dan frequency                                                    | Finding                                                                         |
| ------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `gender` raw  | Unisex 549; Female 350; Male 147; MALE 10; FEMALE 5; unisex 2; UNISEX 1 | Casing-only inconsistency; local clean menjadi Unisex 552, Female 355, Male 157 |
| `concentrate` | EDP 762; XDP 285; EDT 17                                                | Konsisten secara ejaan; arti/standardisasi `XDP` perlu keputusan                |
| `situation`   | Day 378; Versatile 363; Night 323                                       | Lengkap dan konsisten, tetapi taxonomy sangat coarse                            |
| `size`        | 18 nilai; dominan 50 (535), 100 (204), 30 (182), 35 (57)                | Semua integer; unit ml hanya inferred dari penggunaan V1, tidak tersimpan       |

### Internasional

| Field            | Values dan frequency                                                   | Finding                                                                                                                |
| ---------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `Gender`         | women 11.376; unisex 7.698; men 4.989                                  | Lengkap dan konsisten, tetapi label berbeda dari lokal                                                                 |
| `Country`        | 54 nilai; France 7.261, USA 4.473, Italy 3.310, UK 1.724, Brazil 1.338 | `Arabia saudi ` memiliki trailing space pada 90 row; `Bahrain` 29 dan `Bahrein` 5 adalah likely synonym/spelling issue |
| `mainaccord1..5` | 84 normalized accord terms secara gabungan                             | Rank 1 lengkap; rank selanjutnya semakin sparse                                                                        |

`is_lokal` konsisten dengan pembagian row: 1.064 true dan 24.063 false. `final_cosine.csv` hanya mengubah casing literal boolean.

## 9. Price Analysis

Price hanya tersedia untuk 1.064 parfum lokal.

- Raw representation: 1.033 digits-only dan 31 values dengan `.` sebagai apparent thousands separator.
- Enam nominal memiliki dua format sekaligus, misalnya `199000` dan `199.000`.
- Cleaning notebook menghapus `.` dan `,`, lalu cast ke integer; 1.064/1.064 values berhasil diparse.
- Tidak ada blank, invalid string, zero, atau negative value.
- Range: 41.500 sampai 2.999.999.
- P25 169.000; median 229.000; P75 320.000; P95 725.000.
- Nilai tertinggi berasal dari brand seperti UCCA OUD dan Hutan Aromantika. Angka ini potential high-end outlier, tetapi tidak ada evidence bahwa nilainya salah.
- Currency tidak ada pada CSV. UI/seeder V1 menggunakan format `Rp`, sehingga IDR adalah **inference kuat**, bukan observed field.
- Dataset internasional tidak mempunyai price maupun currency.

**Recommendation Phase 3:** parse local price ke integer tanpa conversion, simpan currency hanya setelah keputusan eksplisit, dan review high outliers sebagai business validation—jangan winsorize atau membuangnya otomatis.

## 10. Notes & Accords Analysis

### Notes lokal

- Tersimpan terpisah sebagai top/mid/base, comma-separated string.
- Missing: 2 top, 24 middle, 27 base.
- 9.411 token occurrences dan 1.353 normalized token strings.
- 98 repeated token occurrences di dalam record/stage aggregation; pengulangan dapat sah jika note muncul pada lebih dari satu stage.
- 31 tokens memiliki trailing punctuation dan tiga base-note cells mengandung zero-width space.
- Raw source memiliki 310 case/punctuation variant groups; title-case cleaning mengurangi ini menjadi 26, tetapi tidak menyelesaikan synonym.

### Notes internasional

- Tersimpan terpisah sebagai Top/Middle/Base, comma-separated string.
- Tidak ada missing stage pada 24.063 row.
- 238.362 token occurrences dan 1.671 normalized token strings.
- 1.377 repeated token occurrences lintas stage per record.
- Encoding Windows-1252 harus dipertahankan saat membaca accented names, apostrophe, `®`, dan `™`.

### Vocabulary/taxonomy issues

Observed equivalent-looking forms antara dua sumber meliputi:

- `lily-of-the-valley` vs `lily of the valley`
- `oakmoss` vs `oak moss`
- `ylang-ylang` vs `ylang ylang`
- `black currant` vs `blackcurrant`
- `sandalwood` vs `sandal wood`
- `guaiac wood` vs `guaiacwood`
- `cedarwood` vs `cedar wood`
- `drywoods` vs `dry woods`

Potential semantic synonyms yang tidak boleh digabung tanpa review mencakup `cedar`/`cedarwood`, `moss`/`oakmoss`, `oud`/`agarwood`, dan istilah generik seperti `woody notes`, `floral notes`, atau `fruity notes`.

### Accords

- Hanya source internasional rich yang memiliki accords.
- Disimpan sebagai lima ranked columns, bukan list tunggal.
- `mainaccord1` selalu ada; missing rank 2–5 berturut-turut 13, 114, 388, dan 981.
- Terdapat 84 normalized accord terms. Yang paling sering antara lain woody, citrus, aromatic, sweet, fruity, powdery, floral, warm spicy, white floral, dan fresh spicy.
- Dataset lokal tidak memiliki accords, dan kedua dataset gabungan membuang seluruh accord data.

**Conclusion:** taxonomy konsisten belum tersedia. Phase 3 perlu membangun alias map yang versioned dan dapat diaudit; Phase 2 tidak menetapkan taxonomy final.

## 11. Local vs International Comparison

| Field                 | Local                            | International                                        | Compatible?             | Issue                                                              |
| --------------------- | -------------------------------- | ---------------------------------------------------- | ----------------------- | ------------------------------------------------------------------ |
| Identity              | `HRMN-*` tersedia                | `FRGN-*` hanya di gabungan; source URL unik tersedia | Partial                 | FRGN ID bergantung urutan merge; URL lebih kuat sebagai provenance |
| Name                  | Display-like mixed casing        | Slug di rich source, display transform di projection | Yes after normalization | Jangan memakai title-case buta untuk trademark/numeric names       |
| Brand                 | Display-like mixed casing        | Slug di rich source                                  | Yes after normalization | Perlu canonical display + normalized key                           |
| Top/middle/base notes | Ada, sebagian missing            | Ada dan lengkap                                      | Yes                     | Alias, casing, punctuation, encoding berbeda                       |
| Gender                | Female/Male/Unisex               | women/men/unisex                                     | Yes with mapping        | Pilih satu canonical vocabulary                                    |
| Price                 | Ada, apparent IDR                | Tidak ada                                            | Nullable only           | Currency lokal tidak eksplisit                                     |
| Volume                | `size`, integer                  | Tidak ada                                            | Nullable only           | Unit tidak eksplisit                                               |
| Concentration         | EDT/EDP/XDP                      | Tidak ada                                            | Nullable only           | `XDP` perlu definisi                                               |
| Occasion              | `situation`: Day/Night/Versatile | Tidak ada                                            | Nullable only           | Coarse taxonomy dan tidak simetris                                 |
| Country               | Tidak ada; local status implied  | 54 country labels                                    | Partial                 | Arti country perlu dipastikan; country normalization diperlukan    |
| Accords               | Tidak ada                        | Ranked 1–5                                           | Nullable only           | Tidak boleh fabricate accords lokal                                |
| Rating/year/perfumer  | Tidak ada                        | Ada, sebagian missing                                | Nullable only           | Metadata enrichment internasional saja                             |
| Image                 | External product image URL       | Tidak ada                                            | Nullable only           | Source URL internasional bukan image                               |
| Source record URL     | Tidak ada                        | Fragrantica URL unik                                 | Nullable only           | Provenance/licensing perlu diputuskan                              |
| Description           | Tidak ada                        | Tidak ada                                            | No                      | Jangan migrate description buatan seeder sebagai catalog truth     |

Kedua source dapat masuk satu canonical schema jika atribut yang tidak simetris dibuat nullable/empty dan provenance tetap disimpan. Mengisi gap dengan fabricated/default values tidak direkomendasikan.

## 12. Image Reference Analysis

### Dataset lokal

- 1.064/1.064 row memiliki external HTTP(S) image URL; 1.060 URL unik.
- Ada empat duplicate URL groups, masing-masing dipakai dua parfum berbeda. Contohnya SENOPARTY/CHILLIN' BABY dan Mansion Heir/Under the Moonlight.
- Domain terbanyak: `images.tokopedia.net` 954, `down-id.img.susercontent.com` 52, lalu beberapa brand/CDN domain.
- 284 URL memakai query string.
- 1.053 raw references memiliki recognizable image extension pada path; sisanya berupa CDN/product paths tanpa extension, bukan otomatis broken.
- Satu image value memiliki trailing whitespace pada raw source.
- Availability/HTTP status tidak diuji, sehingga tidak ada klaim bahwa URL aktif atau mati.

### Dataset internasional dan FE/BE V1

- International rich mempunyai `url`, tetapi seluruhnya adalah halaman perfume di `www.fragrantica.com`, bukan image.
- Dataset internasional tidak mempunyai image reference.
- FE V1 hanya mempunyai tiga foto parfum fallback (`parfum-chno.jpg`, `parfum-farhampton.jpg`, `parfum-luminos.jpg`) plus logo; ini bukan asset mapping untuk 25.127 record.
- UI V1 menggunakan external URL jika field dimulai dengan `http`, lalu jatuh ke tiga fallback images.

**Recommendation Phase 3:** pertahankan source URL sebagai provenance sementara, audit hak penggunaan dan availability terpisah, dan jangan menganggap external marketplace URL sebagai durable static asset.

## 13. Baseline Dataset Recommendation

### Recommended baseline composition

1. **Local attribute source:** `Dataset/Dataset_Clean/Dataset_Harumnesia_clean.csv`.
   - Memiliki ID, price, size, concentration, situation, image, gender, dan correct staged notes.
   - Transformasinya dibuktikan notebook dan seluruh 1.064 row tetap align dengan raw source.
2. **International attribute source:** `Dataset/Dataset Awal/fra_cleaned.csv`.
   - Memiliki schema paling kaya, 24.063 URL unik, staged notes lengkap, gender, country, rating, year, perfumers, dan accords.
   - Harus dibaca sebagai Windows-1252 + semicolon; jangan mulai dari lossy five-column projection.
3. **Legacy ID mapping/cross-check:** `Dataset/Dataset_Gabungan/dataset_parfum_gabungan.csv`.
   - Gunakan hanya untuk memetakan urutan source ke `HRMN-*`/`FRGN-*`, `is_lokal`, dan membuktikan compatibility.
   - Jangan jadikan sumber utama atribut karena banyak field sudah dibuang.

### Dataset yang tidak direkomendasikan sebagai baseline utama

- `Gabungan Parfum  Lokal & Internasional.csv`: rejected karena corruption notes dan name/ordinal coercion.
- `final_cosine.csv`: model-specific dan lossy.
- `Dataset_Parfum_Luar.csv`: berguna sebagai display normalization cross-check, tetapi kehilangan metadata dan membawa control-character issue.
- Raw local: tetap menjadi cross-check untuk perubahan cleaning, tetapi local clean lebih praktis karena price/gender normalization sudah terbukti.

Recommended Phase 3 starting set tetap berjumlah 25.127 source rows. Setelah entity-resolution, jumlah canonical product belum boleh diasumsikan sama karena 210 duplicate `name+brand` groups perlu klasifikasi variant vs duplicate.

## 14. Draft Canonical V2 Schema

Proposal ini mengikuti actual fields; field derived/future ditandai jelas.

```json
{
  "id": "<canonical-id>",
  "legacyId": "<HRMN-or-FRGN-id-or-null>",
  "name": "<display-name>",
  "brand": "<display-brand>",
  "market": "local | international",
  "country": null,
  "gender": "female | male | unisex | null",
  "concentration": null,
  "volumeMl": null,
  "price": null,
  "notes": {
    "top": [],
    "middle": [],
    "base": []
  },
  "accords": [],
  "occasions": [],
  "imageUrl": null,
  "sourceUrl": null,
  "releaseYear": null,
  "rating": null,
  "perfumers": [],
  "provenance": {
    "dataset": "<source-path>",
    "sourceRow": 0
  }
}
```

| Proposed field  | Required? / type                                   | Actual source                      | Normalization needed                                         | Reason                                                 |
| --------------- | -------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------ |
| `id`            | Required string                                    | Existing ID + source identity      | Tentukan stable generation; jangan bergantung row order      | Canonical identity                                     |
| `legacyId`      | Optional string                                    | `ID_Perfume` pada local/combined   | Validate prefix/uniqueness                                   | Traceability ke V1                                     |
| `name`          | Required string                                    | perfume/Perfume                    | Trim; safe slug-to-display; preserve numeric/trademark forms | Product identity/display                               |
| `brand`         | Required string                                    | brand/Brand                        | Trim; canonical display + comparison key                     | Grouping dan identity                                  |
| `market`        | Required enum                                      | Source split / `is_lokal`          | Boolean-to-enum                                              | Mengganti ambiguous localized boolean                  |
| `country`       | Optional string                                    | International `Country`            | Trim; spelling/ISO mapping setelah review                    | International provenance/filter candidate              |
| `gender`        | Optional enum string                               | Local gender, international Gender | Map Female↔women dan Male↔men                                | Shared category without inventing missing data         |
| `concentration` | Optional string                                    | Local `concentrate`                | Rename; decide XDP semantics                                 | Product attribute/filter candidate                     |
| `volumeMl`      | Optional positive number                           | Local `size`                       | Confirm ml unit                                              | Typed volume                                           |
| `price`         | Optional `{amount: integer, currency: string       | null}`                             | Local `price`                                                | Parse separators; decide currency explicitly           | Avoid formatted strings/currency assumption |
| `notes`         | Required object of string arrays; arrays may empty | Three staged note columns          | Split, trim, Unicode normalize, alias taxonomy later         | Preserve stage semantics for recommender               |
| `accords`       | Optional ordered string array                      | `mainaccord1..5`                   | Compact blanks, preserve rank, alias later                   | Recommendation signal actually present internationally |
| `occasions`     | Optional string array                              | Local `situation`                  | Map only after taxonomy decision                             | Preserve observed local suitability                    |
| `imageUrl`      | Optional URL                                       | Local `image`                      | Trim and validate syntax/availability separately             | Existing image reference                               |
| `sourceUrl`     | Optional URL                                       | International `url`                | Preserve exactly after decode                                | Provenance and disambiguation                          |
| `releaseYear`   | Optional integer                                   | International `Year`               | Blank→null; range validation                                 | Distinguishes releases with same name                  |
| `rating`        | Optional `{value: number, count: integer}`         | Rating Value/Count                 | Decimal comma→decimal point                                  | Preserve observed popularity metadata                  |
| `perfumers`     | Optional string array                              | Perfumer1/2                        | `unknown`/blank→empty; decode/trim names                     | Preserve creator metadata                              |
| `provenance`    | Required derived object                            | Source path + row                  | Generated during Phase 3                                     | Auditable migration and conflict resolution            |

Fields intentionally not proposed as canonical source fields:

- `No`: row ordinal only.
- Combined `Notes`: safely derivable from staged notes.
- Separate `mainaccord1..5`: collapse to ordered array.
- `description`: tidak didukung CSV aktual; future/derived only.
- Static `assetPath`: future field setelah asset audit/migration, bukan observed V1 data.

## 15. Issues Requiring Decisions

1. **International canonical ID:** reuse generated `FRGN-*` atau generate stable ID dari source URL/identity?
2. **Duplicate policy:** kapan same name+brand adalah size variant, reformulation, gender edition, release year, atau true duplicate?
3. **Currency:** bolehkah semua local price dinyatakan IDR berdasarkan product context/UI evidence?
4. **Volume unit:** bolehkah seluruh `size` dinyatakan ml?
5. **Concentration:** definisi dan canonical representation `XDP`.
6. **Gender vocabulary:** `female/male/unisex` atau `women/men/unisex`.
7. **Country semantics:** country brand, manufacture, atau listing origin; serta ISO normalization.
8. **Notes taxonomy:** alias mana yang aman digabung dan mana yang harus tetap berbeda.
9. **Accords asymmetry:** apakah local accords dibiarkan kosong atau dienrich pada fase terpisah; jangan fabricate.
10. **Image rights/durability:** penggunaan marketplace/CDN URLs dan sumber image internasional.
11. **Source rights/provenance:** izin penggunaan data Fragrantica dan attribution requirements.
12. **Missing notes:** apakah record lokal dengan stage missing tetap dipertahankan dan bagaimana validation severity-nya.
13. **Historical security issue:** satu notebook V1 berisi credential plaintext. Nilainya tidak disalin ke V2; credential tersebut perlu revoke/rotation dan remediation terpisah tanpa mengubah repo V1 dalam task ini.

## 16. Recommendations for Phase 3

1. Pin tiga input source dengan SHA-256 dari audit result: local clean, international rich, dan combined non-clean untuk mapping.
2. Decode international rich secara eksplisit dengan Windows-1252, delimiter `;`, dan decimal-comma hanya untuk `Rating Value`.
3. Bangun staging records terpisah untuk local dan international; jangan mulai dari combined clean/final cosine.
4. Simpan raw value dan provenance selama transform agar setiap canonical field dapat ditelusuri.
5. Normalisasi whitespace, zero-width spaces, Unicode, casing, dan URL syntax sebelum entity resolution.
6. Pisahkan display value dari normalized comparison key untuk name/brand; hindari title-case buta.
7. Parse staged notes menjadi arrays tanpa menggabungkan stage; bangun alias map secara versioned setelah review.
8. Ubah accords ranked columns menjadi ordered array dan pertahankan empty list untuk lokal.
9. Lakukan duplicate classification dengan source URL, year, gender, notes, size, dan price—bukan name+brand saja.
10. Validasi price tanpa currency conversion dan jangan membuang high outliers otomatis.
11. Tambahkan schema validation dan invariant tests sebelum menghasilkan production JSON.
12. Lakukan image availability/licensing audit terpisah sebelum download atau asset conversion.

Phase 2 berhenti pada proposal ini. Tidak ada cleaning production, taxonomy final, CSV-to-production JSON, recommendation logic, atau frontend work yang dilakukan.
