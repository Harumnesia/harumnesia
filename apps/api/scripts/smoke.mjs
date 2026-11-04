// Smoke test — jalankan dengan `npm run dev` aktif di port 8799.
//   node scripts/smoke.mjs                       (lokal)
//   BASE=https://... node scripts/smoke.mjs      (produksi)
const BASE = process.env.BASE ?? 'http://127.0.0.1:8799';
let failed = 0;

async function check(label, path, assert) {
  const res = await fetch(BASE + path, {
    headers: { Origin: 'http://localhost:5173' },
  });
  const body = await res.json();
  const ok = assert(res, body);
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  [${res.status}]`);
  return { res, body };
}

const { body: health } = await check(
  'health',
  '/api/v1/health',
  (r, b) => r.status === 200 && b.data.perfumes === 25127,
);
console.log(
  '      perfumes =',
  health.data?.perfumes,
  '| brands =',
  health.data?.brands,
);

await check(
  'taxonomy',
  '/api/v1/taxonomy',
  (r, b) => r.status === 200 && b.data.notes.values.length > 2000,
);
await check(
  'perfumes page 1',
  '/api/v1/perfumes?limit=5',
  (r, b) => r.status === 200 && b.data.length === 5 && b.total === 25127,
);
await check('list shape = runtime', '/api/v1/perfumes?limit=1', (r, b) => {
  const keys = Object.keys(b.data[0]).sort().join(',');
  return (
    keys ===
    'accords,brand,concentration,gender,id,market,name,notes,occasion,price'
  );
});
await check(
  'detail',
  '/api/v1/perfumes/local-hrmn-0001',
  (r, b) =>
    r.status === 200 && b.data.market === 'local' && b.data.source.dataset,
);
await check(
  'detail 404',
  '/api/v1/perfumes/nggak-ada',
  (r, b) => r.status === 404 && b.error.code === 'NOT_FOUND',
);

// BE-03: /search pakai has_more, tanpa total (tidak ada COUNT(*) lagi)
await check(
  'search q',
  '/api/v1/search?q=glitch',
  (r, b) =>
    r.status === 200 &&
    b.data.length >= 1 &&
    b.has_more === false &&
    !('total' in b),
);
await check(
  'search has_more',
  '/api/v1/search?q=a&limit=5',
  (r, b) => r.status === 200 && b.data.length === 5 && b.has_more === true,
);
await check(
  'search wildcard di-escape',
  '/api/v1/search?q=%25',
  (r, b) => b.data.length === 0,
);
await check(
  'filter kombinasi',
  '/api/v1/search?gender=women&market=international&limit=3',
  (r, b) => r.status === 200 && b.data.every((p) => p.gender === 'women'),
);

// BE-03: /brands dari tabel materialized — bentuk { name, count }
await check(
  'brands',
  '/api/v1/brands?limit=5',
  (r, b) =>
    r.status === 200 &&
    b.data.length === 5 &&
    b.total > 1000 &&
    typeof b.data[0].count === 'number' &&
    typeof b.data[0].name === 'string',
);
await check(
  'brands filter q',
  '/api/v1/brands?q=mykonos',
  (r, b) => r.status === 200 && b.data.length >= 1 && b.has_more === false,
);

await check(
  'CORS origin diizinkan',
  '/api/v1/health',
  (r) =>
    r.headers.get('access-control-allow-origin') === 'http://localhost:5173',
);
await check(
  'limit dibatasi 100',
  '/api/v1/perfumes?limit=9999',
  (r, b) => b.limit === 100,
);
await check('404 endpoint', '/api/v1/nggak-ada', (r) => r.status === 404);

// BE-03: header keamanan + cache
await check(
  'header keamanan',
  '/api/v1/health',
  (r) =>
    r.headers.get('x-content-type-options') === 'nosniff' &&
    r.headers.get('x-frame-options') === 'DENY' &&
    r.headers.get('referrer-policy') === 'no-referrer',
);
await check('cache taxonomy 1 hari', '/api/v1/taxonomy', (r) =>
  (r.headers.get('cache-control') ?? '').includes('max-age=86400'),
);
await check('cache list 60 detik', '/api/v1/perfumes?limit=1', (r) =>
  (r.headers.get('cache-control') ?? '').includes('max-age=60'),
);

// rate limiting belum aktif (butuh KV/DO) — dicatat, bukan diuji
console.log(failed === 0 ? '\nSEMUA PASS' : `\n${failed} CHECK GAGAL`);
process.exit(failed === 0 ? 0 : 1);
