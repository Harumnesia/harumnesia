# Recommendation Evaluation

## 1. Objective

Phase 5 menyediakan deterministic offline engineering evaluation untuk
recommender Harumnesia V2. Harness mengukur retrieval terhadap explicit query
features, evidence availability, diversity, market behavior, determinism, dan
runtime performance. Ia membandingkan sejumlah kecil weight configuration dan
MMR lambda yang dapat dijelaskan.

Evaluasi ini bukan pengukuran recommendation accuracy atau user satisfaction.

## 2. Absence of human relevance labels

Runtime dataset tidak memiliki human relevance judgments, click/conversion
feedback, preference history, atau hasil eksperimen pengguna. Karena itu,
requested-feature hit rate dan metric lain di dokumen ini adalah intrinsic proxy
metrics. Engine-internal score dilaporkan sebagai diagnostic, bukan ground truth.

Tidak ada satu metric gabungan buatan yang disebut sebagai quality score.
Keputusan konfigurasi memakai per-segment results, delta terhadap baseline, dan
per-query win/tie/loss.

## 3. Evaluation architecture

Tooling berada di luar production package:

- `scripts/recommender/evaluation-cases.ts` membangun query suite;
- `scripts/recommender/evaluation-metrics.ts` menghitung proxy metrics;
- `scripts/recommender/evaluate.ts` menjalankan eksperimen;
- `scripts/recommender/evaluation-report.json` menyimpan report machine-readable.

Jalankan:

```sh
pnpm recommender:evaluate
```

Setiap configuration membangun satu recommender index dan memakai ulang index
tersebut untuk seluruh query. Evaluation code tidak masuk production bundle.

## 4. Deterministic query generation

Query suite dibuat tanpa random sampling:

1. document frequency notes dan accords dihitung dari runtime dataset;
2. vocabulary diurutkan berdasarkan frequency descending lalu term ascending;
3. term common, medium, dan rare dipilih secara evenly spaced dari window
   frekuensi 0–20%, 40–60%, dan 80–100%;
4. anchor local dan international diurutkan menurut canonical ID lalu dipilih
   evenly spaced;
5. setiap anchor dikeluarkan dari hasil melalui `excludeIds`;
6. term anchor diurutkan menurut IDF, lalu dipilih dari posisi tinggi, tengah,
   dan rendah agar query tidak selalu hanya memakai term paling rare.

Hash query set dicatat dalam report sehingga input eksperimen dapat diverifikasi.

## 5. Evaluation segments

Suite penuh memiliki 159 query:

| Segment                  | Queries |
| ------------------------ | ------: |
| Notes only               |      36 |
| Accords only             |      24 |
| Local structured         |      30 |
| International structured |      30 |
| Cross-market mixed       |      24 |
| Filter only              |      14 |
| Empty request            |       1 |

Local anchors memakai notes, gender, occasion/concentration yang tersedia, dan
budget pada subset deterministik. International anchors memakai notes, accords,
dan gender. Cross-market queries tidak memiliki market constraint. Filter-only
dan empty-request cases adalah controls, bukan relevance-tuning ground truth.

## 6. Proxy metrics

- `noteQueryCoverage@5`: bagian unique known requested notes yang muncul minimal
  sekali dalam Top 5.
- `accordQueryCoverage@5`: metric equivalent untuk requested accords.
- Categorical availability: bagian result dengan metadata yang tersedia.
- Categorical match: match rate hanya di antara available evidence.
- Engine score: mean/median Top 1 dan Top 5, diberi label engine-internal.
- Evidence coverage: mean, median, full fraction, `< 0.5` fraction, distribution,
  serta breakdown local/international.
- Zero evidence: rate `score = 0`, no reason, dan keduanya.
- Redundancy: mean pairwise candidate similarity memakai IDF notes cosine dan
  accords cosine hanya ketika mutually available.
- `diversity@5 = 1 - meanPairwiseRedundancy@5`.
- Distinct brands dan largest same-brand share bersifat descriptive saja.
- Duplicate variant metric memakai normalized `brand + name`, tanpa menghapus
  atau membatasi candidate.
- Market distribution hanya dihitung untuk market-unconstrained queries.
- MMR churn memakai Jaccard@5 dan exact ordered-list rate.

## 7. Phase 4 baseline

Baseline direkam secara eksplisit dan tidak mengikuti production constant yang
kemudian dituning:

```text
weights: notes 0.55, accords 0.20, gender 0.10,
         occasion 0.10, concentration 0.05
MMR lambda: 0.85
```

Aggregate baseline:

| Metric                          |   Result |
| ------------------------------- | -------: |
| Note query coverage@5           | 0.883333 |
| Accord query coverage@5         | 0.984848 |
| Gender match / available        | 0.930952 |
| Occasion match / available      | 0.911917 |
| Concentration match / available | 0.986207 |
| Mean Top-5 evidence coverage    | 0.899796 |
| Full evidence coverage fraction | 0.864151 |
| Zero-score/no-reason rate       | 0.179874 |
| Mean pairwise redundancy@5      | 0.196621 |
| Diversity@5                     | 0.803379 |
| Distinct brands@5               | 4.622642 |
| Engine-internal Top-1 mean      | 0.554685 |
| Engine-internal Top-5 mean      | 0.435872 |

Zero evidence terutama mencakup filter-only dan empty-request controls, yang
memang tidak memiliki soft preference, ditambah beberapa diversified result
pada single-term notes/accord queries. Nilai ini bukan otomatis recommendation
failure tanpa human labels.

## 8. Weight experiments

Semua weight experiments memakai baseline lambda 0.85:

| Configuration    | Notes | Accords | Gender | Occasion | Concentration |
| ---------------- | ----: | ------: | -----: | -------: | ------------: |
| Baseline         |  0.55 |    0.20 |   0.10 |     0.10 |          0.05 |
| Notes Heavy      |  0.65 |    0.15 |   0.08 |     0.08 |          0.04 |
| Balanced Content |  0.50 |    0.25 |   0.10 |     0.10 |          0.05 |
| Accord Aware     |  0.45 |    0.30 |   0.10 |     0.10 |          0.05 |
| Metadata Aware   |  0.50 |    0.20 |   0.10 |     0.15 |          0.05 |

Observed aggregate trade-offs:

| Configuration    | Note coverage | Accord coverage | Occasion match | Diversity |
| ---------------- | ------------: | --------------: | -------------: | --------: |
| Baseline         |      0.883333 |        0.984848 |       0.911917 |  0.803379 |
| Notes Heavy      |      0.883333 |        0.931818 |       0.842932 |  0.791790 |
| Balanced Content |      0.877778 |        0.984848 |       0.917098 |  0.810006 |
| Accord Aware     |      0.877778 |        1.000000 |       0.928205 |  0.815790 |
| Metadata Aware   |      0.879167 |        0.984848 |       0.979695 |  0.811779 |

Notes Heavy kehilangan accord dan categorical matches. Balanced Content dan
Accord Aware meningkatkan beberapa metrics tetapi masing-masing kehilangan dua
note queries. Metadata Aware meningkatkan occasion behavior tetapi kehilangan
dua note queries dan satu accord query. Tidak ada weight alternative yang secara
konsisten mendominasi baseline lintas segment, sehingga weights tidak diubah.

## 9. MMR lambda experiments

Semua lambda experiments memakai baseline weights:

| Lambda | Note coverage | Accord coverage | Diversity | Internal Top-5 score | Jaccard vs 1.00 |
| -----: | ------------: | --------------: | --------: | -------------------: | --------------: |
|   1.00 |      0.862500 |        0.946970 |  0.761896 |             0.438429 |        1.000000 |
|   0.90 |      0.876389 |        0.954545 |  0.791847 |             0.437447 |        0.679844 |
|   0.85 |      0.883333 |        0.984848 |  0.803379 |             0.435872 |        0.623989 |
|   0.80 |      0.886111 |        0.992424 |  0.815016 |             0.433757 |        0.568109 |
|   0.70 |      0.890278 |        0.992424 |  0.840416 |             0.425911 |        0.457273 |

Terhadap lambda 0.85, lambda 0.80 memberi satu note-query win tanpa loss, satu
accord-query win tanpa loss, enam categorical-query wins tanpa loss, coverage
yang praktis tetap, dan diversity delta `+0.011637`. Engine-internal score turun
sedikit, sesuai trade-off diversification, dan tidak dipakai sebagai ground
truth. Lambda 0.70 memberi diversity lebih tinggi tetapi menimbulkan satu
note-query loss dan churn lebih besar.

## 10. Segment-level results

Baseline segment summary:

| Segment                  | Note coverage | Accord coverage | Coverage | Diversity |
| ------------------------ | ------------: | --------------: | -------: | --------: |
| Notes only               |      1.000000 |             n/a | 1.000000 |  0.817491 |
| Accords only             |           n/a |        1.000000 | 1.000000 |  0.838044 |
| Local structured         |      0.711111 |             n/a | 0.995833 |  0.870665 |
| International structured |      0.988889 |        0.966667 | 1.000000 |  0.660201 |
| Cross-market mixed       |      0.791667 |        1.000000 | 0.966358 |  0.723783 |

Filter-only dan empty-request controls memiliki score/coverage nol secara
intentional tetapi tetap menghasilkan deterministic Top 5.

## 11. Missingness analysis

Pada cross-market mixed queries, result distribution adalah 39.1667% local dan
60.8333% international. Mean coverage local adalah 0.977315 dan international
0.959304, keduanya median 1. Local structured coverage adalah 0.995833;
international structured coverage adalah 1.

Pada seluruh market-unconstrained suite, hasil terdiri dari 20.4255% local dan
79.5745% international. Angka ini descriptive dan tidak dibandingkan dengan
target 50/50 karena dataset sendiri sangat asymmetric. Hasil cross-market tidak
menunjukkan missing field otomatis menjadi mismatch; perbedaan coverage tetap
terlihat terpisah dari relevance.

## 12. Diversity, brands, dan variants

Baseline redundancy@5 adalah 0.196621 dan diversity@5 adalah 0.803379. Lambda
0.80 menurunkan redundancy menjadi 0.184984 dan menaikkan diversity menjadi
0.815016. Mean distinct brands naik tipis dari 4.622642 ke 4.628931.

Tidak ada evaluated Top-5 list yang memuat duplicate normalized brand+name pair.
Ini hanya observasi pada query suite ini, bukan bukti bahwa catalog-level entity
resolution tidak dibutuhkan. Brand metrics tidak digunakan sebagai scoring
signal atau optimization target.

## 13. Selected configuration

Selected production configuration:

```text
weights: notes 0.55, accords 0.20, gender 0.10,
         occasion 0.10, concentration 0.05
MMR lambda: 0.80
```

Baseline weights dipertahankan. Default MMR lambda berubah dari 0.85 menjadi
0.80 karena improvement pada explicit-feature proxies dan diversity cukup
konsisten tanpa note, accord, atau categorical per-query regression terhadap
baseline. Ini adalah engineering selection berdasarkan offline proxies, bukan
nilai optimal atau bukti peningkatan kepuasan pengguna.

## 14. Production changes

Satu-satunya perubahan ranking parameter adalah `DEFAULT_MMR_LAMBDA` dari 0.85
ke 0.80. IDF, binary TF, score weights, missingness denominator, coverage,
filters, candidate pool, redundancy weights, result schema, dan maximum limit
tidak berubah.

## 15. Explanation ordering analysis

Static-weight ordering dan contribution ordering berbeda pada 181 dari 795
baseline results (22.7673%). Beberapa contoh menunjukkan categorical exact
matches dapat memiliki contribution lebih tinggi daripada partial notes cosine,
walaupun static ordering tetap menempatkan notes lebih dulu.

Contribution ordering terlihat informatif pada contoh tersebut, tetapi tidak
ada human explanation judgments untuk menentukan ordering yang lebih mudah
dipahami atau lebih berguna. Production explanation ordering tetap static dan
deterministic; perubahan ditunda sampai ada evaluation khusus atau user data.

## 16. Limitations

- Tidak ada human relevance labels, feedback, click, conversion, atau survey.
- Anchor queries berasal dari metadata catalog dan hanya mengukur content
  retrieval behavior.
- Proxy hit rate tidak mengukur semantic similarity atau user intent.
- Local tidak memiliki accords; international tidak memiliki price, occasion,
  dan concentration.
- Query suite berukuran terbatas dan deterministic, bukan distribusi traffic
  pengguna nyata.
- Brand dan variant metrics bersifat descriptive.
- Timing tergantung mesin dan tidak memiliki pass/fail threshold.
- Belum ada typo/fuzzy matching, semantic embeddings, personalization, atau
  collaborative filtering.

## 17. Future online evaluation

Phase berikutnya sebaiknya mempertahankan query/result telemetry yang
privacy-aware, kemudian mengumpulkan explicit relevance judgments atau outcome
seperti save, detail view, dan structured feedback. Online atau human evaluation
perlu membandingkan konfigurasi secara controlled, mengaudit segment coverage,
dan menilai usefulness explanation. Hanya bukti tersebut yang dapat mendukung
klaim tentang user satisfaction atau recommendation quality di dunia nyata.
