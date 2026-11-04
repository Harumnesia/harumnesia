# harumnesia-api (@harumnesia/api)

API data parfum Harumnesia (Cloudflare Workers + D1). Baca-saja, tanpa auth.
Bagian dari monorepo ini (`apps/api`); deploy manual via wrangler dari folder ini.

**LIVE**: **https://api.harumnesia.web.id/api/v1** (custom domain; `harumnesia-api.sgg-game.workers.dev` juga masih aktif sebagai cadangan) — D1 `harumnesia` (`25f90834-93a0-4dfc-8aed-3d6a584ebc5b`, region APAC), 25.127 parfum / 1.194 brand.
Verifikasi produksi: **18/18 smoke PASS**.

### Biaya `rows_read` per request (BE-03, terukur)

| Endpoint | Sebelum | Sesudah | Kapasitas/hari (kuota 5 jt) |
|---|---|---|---|
| `GET /perfumes` | 25.240 | **114** | ~198 → ~43.000 |
| `GET /search` (kata umum) | ≥25.127 | **~2.100** (scan berhenti saat 51 match) | ~198 → ~2.300 |
| `GET /brands` | ~50.000 | **51** (dari tabel `brand`) | ~100 → ~98.000 |
| `GET /perfumes/:id` | 1 | 1 | ~5 juta |

### Bentuk respons (BERUBAH di BE-03 — kabari frontend)

- `/perfumes`: `{ success, data, page, limit, total }` (total dari `meta`, bukan COUNT).
- `/search`: `{ success, data, page, limit, has_more }` — **tanpa** `total`.
- `/brands`: item kini `{ name, count }` (**dulu** `{ brand, count }`); `{ success, data, page, limit, has_more, total }` (total hanya bila tanpa filter `q`).
- Semua respons bawa header keamanan (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`) + `Cache-Control` (taxonomy 1 hari, brands 1 jam, list/search 60 dtk, health no-store).
Custom domain **`api.harumnesia.web.id`** sudah terpasang (zone `harumnesia.web.id` kini di Cloudflare, NS `john/sloan.ns.cloudflare.com`, aktif 08 Okt 2026). CORS mengizinkan `https://harumnesia.web.id`, `https://www.harumnesia.web.id`, `https://harumnesia.pages.dev`, localhost.
Karena zone sudah di Cloudflare, **rate limit bisa memakai WAF** (1 rule gratis) — tidak perlu Durable Object.
Sumber data: output pipeline V2 (`D:/repos/harumnesia/data`) — 25.127 parfum (1.064 lokal + 24.063 internasional).

## Jalankan lokal

```bash
pnpm install                                    # dari root monorepo
pnpm --filter @harumnesia/api seed:generate     # baca ../../data (dataset kanonik monorepo) -> seed/*.sql
pnpm --filter @harumnesia/api db:seed           # schema + seed ke D1 lokal (.wrangler/state)
pnpm --filter @harumnesia/api dev               # http://127.0.0.1:8799  (8787 dipakai panel lain)
pnpm --filter @harumnesia/api smoke             # 13 check terhadap server yang sedang jalan
```

## Endpoint (`/api/v1`)

| Endpoint | Keterangan |
|---|---|
| `GET /health` | `{ status, perfumes, version }` |
| `GET /taxonomy` | notes/accords/genders/concentrations (dari `data/taxonomy`) |
| `GET /perfumes?page=&limit=` | daftar, bentuk runtime (RecommendationPerfume) |
| `GET /perfumes/:id` | detail, bentuk canonical (Perfume) — mis. `local-hrmn-0001` |
| `GET /search?q=&brand=&gender=&market=&concentration=&page=&limit=` | pencarian + filter |
| `GET /brands?q=&page=&limit=` | daftar brand + jumlah parfum |

Envelope: `{ success, data, page, limit, total }` / error `{ success:false, error:{ code, message } }`.
Batas `limit` = 100. `q` di-escape (anti-ReDoS / anti wildcard).

## Deploy (Cloudflare)

```bash
# 1) token + account id di env sesi (jangan commit)
#    CLOUDFLARE_API_TOKEN=<token "Edit Cloudflare Workers">  CLOUDFLARE_ACCOUNT_ID=<id akun>
# kredensial: file `.env.auth` (JANGAN pakai `.env` — wrangler meng-inject isi `.env` sebagai
# variabel Worker saat dev). Muat: set -a && . ./.env.auth && set +a
npx wrangler d1 create harumnesia        # salin database_id ke wrangler.jsonc
npm run db:seed -- --remote              # isi D1 remote (8 file, ~25rb tulis — hemat kuota!)
node scripts/apply-seed.mjs --remote --only=schema.sql,seed/stats.sql   # perubahan skema saja
npm run deploy                           # worker live
npx wrangler d1 execute harumnesia --remote --command "SELECT COUNT(*) FROM perfume;"
```

Custom domain: Worker → Settings → Domains & Routes → Add custom domain, atau
`PUT /accounts/{id}/workers/domains` body `{zone_id, hostname, service, environment:"production"}`.
Untuk `harumnesia.web.id` zone_id = `605c19233329612daf64370dd0f0923c`.

## Belum dikerjakan (fase berikutnya)

- **Rate limit** (sisa BE-03): **WAF rate-limiting rule** (60 req/menit per IP) — zone sudah di Cloudflare jadi ini jalur termurah.
- `/search` masih biaya variabel (~2.100 read untuk kata umum, ~25.127 kalau tanpa hasil) — FTS5 kalau nanti perlu.
- **BE-04/BE-05**: ML service (`POST /recommend` di `api.harumnesia.web.id`) + fallback engine V2.
- Backup D1 berkala (free tier tanpa backup bawaan).
