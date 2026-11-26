// CORS policy for the Harumnesia API.
//
// Two independent rules:
//  1. Exact allowlist from the `ALLOWED_ORIGINS` Worker variable (production web,
//     www, the retained Pages host, and local development).
//  2. Cloudflare Workers Preview hosts of the frontend Worker:
//     exactly one DNS label immediately before `.harumnesia.web.id`
//     (branch previews such as `feat-…` and unique deployment ids such as `7cef0732`).
//
// Never reflect an origin that is not allowed, and never fall back to `*`.
// Reserved labels are production services that must keep using their own origin
// rules: `api` (backend Worker) and `www` (exact entry in the allowlist anyway).

const PREVIEW_PARENT_DOMAIN = 'harumnesia.web.id';
const RESERVED_PREVIEW_LABELS = new Set(['api', 'www']);
const SINGLE_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function parseAllowedOrigins(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function isPreviewOrigin(origin) {
  if (typeof origin !== 'string' || origin.length === 0) return false;

  let url;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }

  // Only accept the canonical serialization a browser sends in `Origin`.
  if (url.origin !== origin) return false;

  if (url.protocol !== 'https:') return false;
  if (url.port !== '') return false;
  if (url.username !== '' || url.password !== '') return false;
  if (url.pathname !== '/' || url.search !== '' || url.hash !== '')
    return false;

  const hostname = url.hostname;
  const suffix = `.${PREVIEW_PARENT_DOMAIN}`;
  if (!hostname.endsWith(suffix)) return false;

  const label = hostname.slice(0, -suffix.length);
  if (!SINGLE_LABEL_PATTERN.test(label)) return false;
  if (RESERVED_PREVIEW_LABELS.has(label)) return false;

  return true;
}

export function isAllowedOrigin(origin, allowedOrigins) {
  if (typeof origin !== 'string' || origin.length === 0) return false;
  if (allowedOrigins.includes(origin)) return true;
  return isPreviewOrigin(origin);
}

export function corsHeaders(req, env) {
  const allowedOrigins = parseAllowedOrigins(env.ALLOWED_ORIGINS);
  const origin = req.headers.get('Origin') || '';
  const headers = {
    'access-control-allow-methods': 'GET,OPTIONS',
    'access-control-max-age': '86400',
    vary: 'Origin',
  };

  if (isAllowedOrigin(origin, allowedOrigins)) {
    headers['access-control-allow-origin'] = origin;
  }

  return headers;
}
