| ID | Priority | Ticket | Area | Tujuan / masalah yang diselesaikan | Output / Acceptance Criteria |
|---|---|---|---|---|---|
| **UX-01** | **P0** | Finalize Desktop UI Fidelity | UI | Implementasi aktual masih belum sepenuhnya mengikuti visual reference | Landing, Discover, Results, Detail desktop sesuai reference; spacing, typography, hierarchy, component proportions direview |
| **UX-02** | **P0** | Finalize Mobile UI Fidelity | UI | Mobile harus memiliki layout sendiri, bukan desktop yang sekadar dikecilkan | Semua core route usable di ~390px; tidak overflow; hierarchy sesuai mobile reference |
| **UX-03** | **P0** | Clarify Soft vs Strict Preferences | UX | Preferred gender/occasion/concentration bukan hard constraint, tetapi mudah disalahartikan user  | UI membedakan jelas “prefer” vs “must match”; helper copy ditambahkan |
| **UX-04** | **P0** | Clarify Unknown Price Behavior | UX | `includeUnpriced=true` berarti budget bukan jaminan untuk item tanpa harga  | User dapat memahami perbedaan “include products without known price” vs strict budget |
| **DOC-01** | **P0** | Update Deployment Verification Record | Docs / Release | Dokumentasi deployment masih menunjuk commit lama meskipun production sudah mengikuti baseline terbaru  | README/deployment docs menunjukkan verified production commit terbaru |
| **DOC-02** | **P0** | Define Harumnesia V2 Product Positioning | Product | Perlu keputusan eksplisit apakah fokus general discovery, local alternatives, atau gabungan keduanya | `docs/product-positioning.md` berisi primary use cases, target user, non-goals, success criteria |
| **REC-01** | **P1** | Human Review Baseline Recommendations | Evaluation | 159 deterministic query hanya membuktikan behavior engineering, bukan relevansi manusia  | Dataset evaluasi manual; reviewer memberi relevance/diversity/explanation rating; baseline tersimpan |
| **SIM-01** | **P1** | Add Seed Perfume Search | Product / Search | V2 belum punya kemampuan memilih parfum yang sudah disukai user sebagai acuan  | User dapat mencari parfum canonical berdasarkan name/brand dan memilih satu seed perfume |
| **SIM-02** | **P1** | Build Seed Perfume Profile Mapping | Recommender | Seed perfume harus diubah menjadi request notes/accords yang dapat digunakan engine sekarang | Seed menghasilkan profile terstruktur; original ID masuk `excludeIds`; unit tests tersedia |
| **SIM-03** | **P1** | Add “Find Similar” Recommendation Mode | Product / Recommender | Mengembalikan salah satu use case V1 yang paling bernilai tanpa membawa kembali arsitektur lama | Flow Seed → Target Market → Top N Alternatives berfungsi end-to-end |
| **SIM-04** | **P1** | Add Indonesian Alternatives Mode | Product | Harumnesia punya peluang diferensiasi dari recommender parfum generik | Dari seed international, user dapat memilih `Indonesian perfumes`; results hanya local market |
| **SIM-05** | **P1** | Explain Why Alternatives Are Similar | Explainability | Similarity harus tetap mengikuti prinsip explainable V2, bukan hanya angka similarity | Results menunjukkan shared notes, accords, dan metadata yang benar-benar match |
| **IMG-01** | **P1** | Establish Product Image Provenance Policy | Data / Assets | Ada 1.064 external image references tetapi belum menjadi approved production assets  | `docs/assets.md` menetapkan allowed source/provenance/licensing workflow |
| **IMG-02** | **P1** | Populate Local Perfume Image Manifest | Assets | Manifest produk sekarang masih 0 entry | Subset parfum lokal mempunyai verified image mapping; fallback tetap tersedia |
| **DETAIL-01** | **P1** | Expand Perfume Detail Runtime Projection | Data / Runtime | Canonical punya metadata yang tidak tersedia dalam runtime detail projection  | Runtime detail dapat membawa metadata terpilih tanpa membebani recommendation payload secara berlebihan |
| **DETAIL-02** | **P1** | Show Rich Perfume Metadata | UI | Detail saat ini terlalu tipis dibanding informasi canonical | Tampilkan bila tersedia: country, year, perfumer, volume, rating/source sesuai keputusan produk |
| **STATE-01** | **P1** | Persist Recommendation Request | UX / State | Refresh `/results` sekarang menghilangkan sesi rekomendasi  | Refresh mempertahankan query/result context dengan versioned storage atau URL serialization |
| **STATE-02** | **P1** | Add Shareable Recommendation URL | UX | User belum bisa membagikan hasil rekomendasi yang sama | URL menyimpan request yang reproducible dan dapat membuka kembali hasil |
| **DATA-01** | **P2** | Review Duplicate Brand + Name Groups | Data Quality | Masih ada 210 normalized brand+name groups dengan 225 record tambahan  | Review report per group; merge/keep decision eksplisit; canonical IDs tidak rusak sembarangan |
| **DATA-02** | **P2** | Resolve Remaining Note Fragments | Data Quality | Masih ada unresolved taxonomy fragments | `arbutus (madrona` dan `rose (delta damascone` ditentukan hasil normalisasinya atau ditandai intentional |
| **DATA-03** | **P2** | Design Semantic Note Alias Layer | Taxonomy | Exact matching membuat vanilla ≠ madagascar vanilla, oud ≠ agarwood | Alias system dirancang terpisah dari raw canonical values; tidak melakukan blanket merge |
| **DATA-04** | **P2** | Improve Evidence Coverage Labels | Data / UX | Relevance tinggi belum tentu evidence availability tinggi; coverage sekarang disembunyikan dari UI  | UI dapat membedakan strong evidence vs partial metadata tanpa menampilkan pseudo-confidence |
| **PERF-01** | **P2** | Benchmark Recommender on Real Devices | Performance | Node smoke bukan representasi browser/Android sesungguhnya  | Benchmark cold/warm load pada desktop + mid-range Android; latency, memory, payload dicatat |
| **PERF-02** | **P2** | Add Worker Request Timeout & Recovery | Resilience | Pending request worker/fetch belum memiliki app-level timeout yang jelas  | Timeout, error state, retry flow diuji dengan failure injection |
| **PERF-03** | **P2** | Optimize Cold Perfume Detail Loading | Performance | Direct detail saat cold start harus mengambil runtime recommendation penuh | Ukur dahulu; bila signifikan, buat detail lookup projection terpisah dari recommendation index |
| **I18N-01** | **P2** | Add Indonesian UX Copy Strategy | Localization | V2 mayoritas Inggris, sedangkan target pengguna lokal bisa mengalami vocabulary barrier  | Tentukan apakah full i18n atau bilingual helper copy; terminology fragrance konsisten |
| **EDU-01** | **P2** | Add Fragrance Vocabulary Guidance | Education / UX | Structured notes memberi kontrol tetapi membebani pemula untuk memahami istilah | Notes/accords mempunyai short helper descriptions atau educational tooltip |
| **SEO-01** | **P2** | Define Legacy URL Migration Map | SEO / Migration | Route V1 seperti `/catalog`, `/brands`, `/recommendation` tidak memiliki mapping di V2  | Tabel old URL → new URL / retired / redirect tersedia sebelum custom-domain cutover |
| **SEC-01** | **P2** | Add Production Security Headers | Security | Audit tidak menemukan CSP pada production response  | `_headers`/hosting config direview; CSP kompatibel dengan module/Web Worker |
| **SEO-02** | **P3** | Add Static Perfume Catalog Route | Discovery | V2 tidak punya katalog meski dataset 25.127 record | `/perfumes` dapat browse/search dataset tanpa backend |
| **SEO-03** | **P3** | Add Brand Browsing | Discovery | Brand discovery V1 hilang di V2 | `/brands` + brand detail menggunakan canonical index |
| **SEO-04** | **P3** | Add Per-Perfume Metadata & Sitemap | SEO | Detail masih SPA tanpa product-level SEO strategy  | Metadata, canonical URL, sitemap strategy ditentukan |
| **EDU-02** | **P3** | Build Dedicated Fragrance Education Section | Content | V1 punya edukasi khusus, V2 belum setara | Konten edukasi dibuat hanya jika memang mendukung acquisition/onboarding |
| **REC-02** | **P3** | Revisit Recommendation Weights from Human Data | Recommender | Weight jangan diubah lagi hanya berdasarkan proxy internal | Weight/lambda dituning hanya jika human evaluation menunjukkan masalah |
| **ARCH-01** | **P3** | Reassess Backend Requirement | Architecture | Backend belum diperlukan untuk workload saat ini | ADR hanya dibuat bila muncul requirement account/admin/persistent data/secret/runtime compute |


| Urutan | Ticket |
|---:|---|
| 1 | **UX-01 Finalize Desktop UI Fidelity** |
| 2 | **UX-02 Finalize Mobile UI Fidelity** |
| 3 | **UX-03 Clarify Soft vs Strict Preferences** |
| 4 | **UX-04 Clarify Unknown Price Behavior** |
| 5 | **DOC-02 Define Product Positioning** |
| 6 | **REC-01 Human Review Baseline Recommendations** |
| 7 | **SIM-01 Seed Perfume Search** |
| 8 | **SIM-02 Seed Profile Mapping** |
| 9 | **SIM-03 Find Similar Mode** |
| 10 | **SIM-04 Indonesian Alternatives Mode** |
| 11 | **IMG-02 Local Product Images** |
| 12 | **STATE-01/02 Persistence + Shareable Results** |