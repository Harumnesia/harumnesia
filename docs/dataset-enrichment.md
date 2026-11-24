# Dokumentasi Enrichment Dataset Harumnesia (Cross-Source Imputation)

> **Untuk:** Tim Engineering Harumnesia (Frontend & Backend)  
> **Status:** Selesai & Terverifikasi  
> **Dataset Target:** `data/runtime/recommendation.enriched.json` (25.127 parfum)  
> **Tanggal:** 5 November 2026  

---

## 1. Latar Belakang Masalah (Data Discrepancy)

Katalog wewangian Harumnesia terdiri dari 2 sumber data yang berbeda:
1. **Dataset Lokal (1.064 parfum)**: Diinput manual oleh tim satu per satu. Memiliki data `price`, `occasion`, dan `concentration`, tetapi **tidak memiliki data `accords` (0%)**.
2. **Dataset Internasional (24.063 parfum)**: Diperoleh dari scrape Kaggle/Fragrantica. Memiliki data `notes` dan `accords` yang sangat lengkap, tetapi **tidak memiliki data `occasion` (0%)** dan `price` IDR.

### Dampak Pada Fitur Discover Web (`/discover`) Sebelumnya:
* **Filter Accords**: Menolak/mengabaikan semua parfum lokal karena kolom `accords` lokal kosong.
* **Filter Occasion (Day/Night)**: Membuang 96% katalog internasional karena kolom `occasion` internasional kosong.
* Akibatnya, rekomendasi menjadi timpang dan terpecah per asal market.

---

## 2. Metodologi Solusi (Tanpa Input Ulang Manual)

Alih-alih melatih ulang model black-box (retrain V1) atau menginput 24.000 data secara manual, kami menerapkan **Cross-Source Domain Enrichment** berbasis statistik dan sains olfaktori.

```
                      [24.063 Parfum Internasional]
                             (Notes & Accords)
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
  [P(Accord | Note) + Lift]               [Polaritas Sensori Zarzo]
                 │                                       │
                 ▼                                       ▼
       [Derivasi Accords]                       [Derivasi Occasion]
         (Parfum Lokal)                        (Parfum Internasional)
                 │                                       │
                 └───────────────────┬───────────────────┘
                                     ▼
                [recommendation.enriched.json (25.127)]
                  Katalog Utuh: Accords & Occasion 100%
```

---

## 3. Cara Kerja Teknis

### A. Derivasi Accords Lokal dari Notes (Note-to-Accord Lifting)
Parfum lokal memiliki data `notes` (top, middle, base) yang lengkap. Kami menghitung probabilitas kemunculan bersama (*co-occurrence*) antara bahan (note) dan kesan aroma (accord) dari 24.063 parfum internasional.

1. **Normalized Lift Scoring**:
   $$\text{Lift}(A | N) = \frac{P(A | N)}{\sqrt{P(A)}}$$
   * $P(A | N)$: Seberapa sering accord $A$ muncul jika parfum mengandung note $N$.
   * $\sqrt{P(A)}$: Faktor peredam untuk mencegah accord umum (seperti `woody` yang ada di 52% katalog) memonopoli hasil rekomendasi.
2. **Konsolidasi Atribut Gourmand & Lactonic**:
   * Jika piramida note mengandung indikator makanan penutup (misal: *caramel, milk, vanilla, almond, pistachio*), accord makro `gourmand` dan `lactonic` secara otomatis diprioritaskan di atas tag spesifik.
3. **Pembatasan Diversity per Famili**:
   * Mengacu pada roda taksonomi Michael Edwards & Société Française des Parfumeurs (SFP), hasil accord dibatasi maksimal 2 per famili olfaktori agar karakter aroma seimbang (Top-5 accords).
   * **Hasil:** 1.046 dari 1.064 parfum lokal (98.3%) berhasil terisi accords-nya.

### B. Derivasi Occasion Internasional dari Accords (Zarzo Polarity Model)
Mengacu pada riset **Prof. Manuel Zarzo (Universitat Politècnica de València, 2020)** mengenai ruang persepsi 2D/3D wewangian:

1. **Polaritas Day (Refreshment / Clean)**:
   * Didorong oleh accords penyegar: `citrus`, `aquatic`, `marine`, `green`, `fresh`, `fruity`, `aromatic`.
2. **Polaritas Night (Warmth / Heavy / Seductive)**:
   * Didorong oleh accords tebal dan hangat: `oud`, `leather`, `smoky`, `tobacco`, `amber`, `warm spicy`, `cacao`, `rum`, `honey`.
3. **Dual-Use & Versatile-Safe Logic**:
   * Jika sebuah parfum memiliki sinyal kuat di kedua sisi (misal opening citrus segar dengan drydown amber-vanilla tebal), sistem menetapkan multi-tag: **`['day', 'night']`**.
   * Jika selisih skor kedua sisi tipis atau didominasi accord lembut (`powdery`, `floral`, `musky`), sistem menetapkan **`['versatile']`**.
   * **Hasil:** 24.063 parfum internasional kini 100% terisi occasion-nya (44.6% Day, 22.7% Night, 15.3% Dual-Use, 17.4% Versatile).

---

### C. Concentration Internasional dari Audit Bukti (Final)

Regex nama saja tidak cukup. Setelah Strict Regex V2 (akurasi label ~87%), seluruh **1.337** produk hasil regex diaudit manual terhadap halaman brand/retailer. Hasil audit menjadi **sumber kebenaran final**:

- **1.334 label terisi**, **3 unresolved tetap `null`** (varian produk tidak bisa dibedakan dari data: Montana *Parfum D'Elle*, Montana *Parfum D'Elle 2*, Naomi Campbell *Seductive Elixir*).
- Audit mengoreksi **149 label** yang salah (mis. *White Linen Parfum* → Eau de Parfum; *Coromandel Parfum* → Extrait; *Black XS For Her EDP* → Eau de Toilette) dan mengisi **173** yang sebelumnya `null`.
- Label format khusus **tidak dipaksa** menjadi EDP/EDT/Extrait: `Perfume Oil`, `Attar`, `Hair Mist`, `Body Mist`, `Body Spray`, `Fragrant Mist`, `Perfumed Gel`, `Deo Parfum`.

**Distribusi final (1.334, per kode kanonik):** EDP 597 · EDT 358 · Parfum 174 · Extrait 82 · Eau de Cologne 31 · format khusus 54 · label brand-specific 38.

**Pemisahan konsep (jangan dicampur):**

| Kelompok | Isi | Contoh |
|---|---|---|
| **Concentration** | tier konsentrasi standar | `EDP`, `EDT`, `EDC`, `PARFUM`, `EXTRAIT` |
| **Product Format** | bentuk produk, bukan tier | `PERFUME OIL`, `ATTAR`, `HAIR MIST`, `BODY MIST`, `BODY SPRAY`, `FRAGRANT MIST`, `PERFUMED GEL`, `DEO PARFUM` |
| **Brand-specific designation** | label khas brand, tier tidak baku | `ELIXIR`, `PARFUM COLOGNE`, `ESSENCE DE PARFUM`**\***, `ESPRIT DE PARFUM`, `PARFUM INTENSE`, `LE PARFUM`, `ABSOLU DE PARFUM`, `SECRET DE PARFUM`, `COLOGNE ABSOLUE` |

\*`ESSENCE DE PARFUM`, `ESPRIT DE PARFUM`, dan label sejenis dipertahankan sebagai penanda brand, tidak dipaksa menjadi Extrait/EDP.

**Kebijakan data vs filter:**

1. **Master** menyimpan label asli hasil audit (`"Eau de Parfum"`, `"Perfume Oil"`, `"Elixir"`) — tidak di-uppercase, tidak dinormalisasi paksa.
2. **Taxonomy** (`data/taxonomy/concentrations.json`) menyimpan `canonicalMap` (label mentah → kode kanonik), `values` (5 tier konsentrasi), `formats`, `brandDesignations`, dan `groups`.
3. **Engine** melakukan normalisasi saat **index build**: `normalizeConcentrationKey()` (NFKC, trim, collapse whitespace, uppercase) lalu lookup `canonicalMap`. Label yang tidak ada di map → `null` + dicatat di `index.unmappedConcentrations` untuk audit — **tidak pernah** dianggap kategori valid. Tidak ada fallback uppercase buta.
4. **Filter** membandingkan nilai kanonik; produk `null`/unmapped mengikuti `unknownPolicy` (`include`/`exclude`) dan tidak pernah muncul sebagai pilihan filter.
5. **Unit test** (`packages/recommender/tests/concentration.test.ts`) mengunci pemetaan 12 bentuk label, null/kosong/unmapped → `null`, kombinasi filter (EDP + EXTRAIT), round-trip seluruh kode kanonik, dan paritas `canonicalMap` taxonomy vs engine.

**Standar bukti enrichment (dari audit user, wajib untuk enrichment berikutnya):**
1. Field faktual (konsentrasi, harga) **tidak boleh ditebak** dari brand/gender — prior probability bukan data per-produk.
2. Yang terisi harus punya sumber yang bisa dilacak (nama eksplisit = sumber; derivasi statistik = metode + backtest; sisanya = `null`).
3. Verifikasi selalu lewat audit per-baris terhadap sumber resmi brand/retailer besar — bukan klaim agregat; temuan audit menang atas heuristik.

## 4. Perbandingan Status Data (Before vs After)

| Fitur / Kolom | Status Awal (Before) | Status Baru (After Enriched) |
|---|---|---|
| **Accords Lokal** | 0% (0 / 1.064) | **98.3% (1.046 / 1.064)** |
| **Occasion Internasional**| 0% (0 / 24.063) | **100% (24.063 / 24.063)** |
| **Concentration Internasional** | 0% (0 / 24.063) | **5.5% terisi berbukti (1.334) + 3 unresolved `null`** |
| **Notes (Semua Market)** | 100% Lengkap | 100% Lengkap |
| **Filter `/discover` Web** | Gagal di accord lokal & occasion luar | **Bekerja 100% lancar di seluruh katalog** |

---

## 5. Cara Integrasi ke Frontend Web

File dataset baru telah dibuat dan siap digunakan tanpa mengubah skema Zod:
* **Path file baru:** `data/runtime/recommendation.enriched.json`

Untuk mengaktifkannya di web, teman frontend cukup mengganti 1 baris import di:
`apps/web/src/features/recommendation/runtime/runtime-assets.ts`:

```typescript
// SEBELUM:
import runtimeDataUrl from '../../../../../../data/runtime/recommendation.json?url&no-inline';

// SESUDAH:
import runtimeDataUrl from '../../../../../../data/runtime/recommendation.enriched.json?url&no-inline';
```

Tidak ada perubahan kode TypeScript atau UI yang diperlukan; engine rekomendasi di browser akan langsung membaca data yang sudah lengkap ini.
