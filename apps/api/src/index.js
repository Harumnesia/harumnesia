// Harumnesia API — Cloudflare Worker (D1)
// BE-03: total dari meta ('stats') — tanpa COUNT(*) per request; /brands dari tabel `brand`
//        materialized; /search tanpa hitung total (has_more); header keamanan + cache.
// Rate limit belum di sini (butuh KV/DO) — langkah tersendiri.
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;
const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };
const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'x-frame-options': 'DENY',
};

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cors = corsHeaders(req, env);
    if (req.method === 'OPTIONS')
      return new Response(null, {
        status: 204,
        headers: { ...SECURITY_HEADERS, ...cors },
      });
    if (req.method !== 'GET')
      return respond(
        {
          success: false,
          error: {
            code: 'METHOD_NOT_ALLOWED',
            message: 'Hanya GET yang didukung',
          },
        },
        405,
        cors,
      );
    try {
      const { status, body, headers } = await route(url, env);
      return respond(body, status, cors, headers);
    } catch (err) {
      console.error('unhandled', err && err.stack ? err.stack : err);
      return respond(
        {
          success: false,
          error: { code: 'INTERNAL', message: 'Kesalahan internal' },
        },
        500,
        cors,
      );
    }
  },
};

function respond(body, status, cors, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...SECURITY_HEADERS, ...cors, ...extra },
  });
}

function corsHeaders(req, env) {
  const allowed = String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const origin = req.headers.get('Origin') || '';
  const ok = allowed.includes(origin);
  return {
    'access-control-allow-origin': ok ? origin : allowed[0] || '*',
    'access-control-allow-methods': 'GET,OPTIONS',
    'access-control-max-age': '86400',
    vary: 'Origin',
  };
}

const num = (v, def, max) => {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : def;
};
const likeArg = (raw) =>
  '%' + String(raw).replace(/[\\%_]/g, (m) => '\\' + m) + '%';

// 1 baris meta = 1 row read, bukan 25.127
async function stats(db) {
  const row = await db
    .prepare("SELECT value FROM meta WHERE key = 'stats'")
    .first();
  return row ? JSON.parse(row.value) : { perfumeCount: 0, brandCount: 0 };
}

async function route(url, env) {
  const p = url.pathname.replace(/\/+$/, '') || '/';
  const q = url.searchParams;
  const db = env.DB;

  if (p === '/api/v1/health') {
    const s = await stats(db);
    return {
      status: 200,
      headers: { 'cache-control': 'no-store' },
      body: {
        success: true,
        data: {
          status: 'ok',
          perfumes: s.perfumeCount,
          brands: s.brandCount,
          version: '2',
        },
      },
    };
  }

  if (p === '/api/v1/taxonomy') {
    const row = await db
      .prepare("SELECT value FROM meta WHERE key = 'taxonomy'")
      .first();
    if (!row) return notFound('Taxonomy belum di-seed');
    return {
      status: 200,
      headers: { 'cache-control': 'public, max-age=86400' },
      body: { success: true, data: JSON.parse(row.value) },
    };
  }

  if (p === '/api/v1/perfumes') {
    const page = num(q.get('page'), 1, 1e6);
    const limit = num(q.get('limit'), DEFAULT_LIMIT, MAX_LIMIT);
    const s = await stats(db);
    const rows = await db
      .prepare(
        'SELECT payload_list FROM perfume ORDER BY brand, name LIMIT ? OFFSET ?',
      )
      .bind(limit, (page - 1) * limit)
      .all();
    return {
      status: 200,
      headers: { 'cache-control': 'public, max-age=60' },
      body: {
        success: true,
        data: rows.results.map((r) => JSON.parse(r.payload_list)),
        page,
        limit,
        total: s.perfumeCount,
      },
    };
  }

  const detail = p.match(/^\/api\/v1\/perfumes\/(.+)$/);
  if (detail) {
    const id = decodeURIComponent(detail[1]);
    const row = await db
      .prepare('SELECT payload_detail FROM perfume WHERE id = ?')
      .bind(id)
      .first();
    if (!row) return notFound('Parfum tidak ditemukan');
    return {
      status: 200,
      headers: { 'cache-control': 'public, max-age=300' },
      body: { success: true, data: JSON.parse(row.payload_detail) },
    };
  }

  if (p === '/api/v1/search') {
    const page = num(q.get('page'), 1, 1e6);
    const limit = num(q.get('limit'), DEFAULT_LIMIT, MAX_LIMIT);
    const where = [];
    const args = [];
    const term = q.get('q');
    if (term && term.trim()) {
      where.push(
        "(name LIKE ? ESCAPE '\\' COLLATE NOCASE OR brand LIKE ? ESCAPE '\\' COLLATE NOCASE)",
      );
      args.push(likeArg(term.trim()), likeArg(term.trim()));
    }
    for (const f of ['brand', 'gender', 'market', 'concentration']) {
      const v = q.get(f);
      if (v && v.trim()) {
        where.push(`${f} = ? COLLATE NOCASE`);
        args.push(v.trim());
      }
    }
    const clause = where.length ? ` WHERE ${where.join(' AND ')}` : '';
    // limit+1 = tahu ada lanjutan atau tidak, tanpa COUNT(*) (full scan 25.127 baris)
    const rows = await db
      .prepare(
        `SELECT payload_list FROM perfume${clause} ORDER BY brand, name LIMIT ? OFFSET ?`,
      )
      .bind(...args, limit + 1, (page - 1) * limit)
      .all();
    const hasMore = rows.results.length > limit;
    return {
      status: 200,
      headers: { 'cache-control': 'public, max-age=60' },
      body: {
        success: true,
        data: rows.results
          .slice(0, limit)
          .map((r) => JSON.parse(r.payload_list)),
        page,
        limit,
        has_more: hasMore,
      },
    };
  }

  if (p === '/api/v1/brands') {
    const page = num(q.get('page'), 1, 1e6);
    const limit = num(q.get('limit'), DEFAULT_LIMIT, MAX_LIMIT);
    const term = q.get('q');
    const filtered = term && term.trim();
    const clause = filtered
      ? " WHERE name LIKE ? ESCAPE '\\' COLLATE NOCASE"
      : '';
    const args = filtered ? [likeArg(term.trim())] : [];
    const rows = await db
      .prepare(
        `SELECT name, count FROM brand${clause} ORDER BY name LIMIT ? OFFSET ?`,
      )
      .bind(...args, limit + 1, (page - 1) * limit)
      .all();
    const hasMore = rows.results.length > limit;
    const body = {
      success: true,
      data: rows.results.slice(0, limit),
      page,
      limit,
      has_more: hasMore,
    };
    if (!filtered) body.total = (await stats(db)).brandCount;
    return {
      status: 200,
      headers: { 'cache-control': 'public, max-age=3600' },
      body,
    };
  }

  return notFound('Endpoint tidak dikenal');
}

const notFound = (message) => ({
  status: 404,
  body: { success: false, error: { code: 'NOT_FOUND', message } },
});
