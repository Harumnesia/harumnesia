import { describe, expect, it } from 'vitest';

import worker from '../src/index.js';
import { corsHeaders, isAllowedOrigin, isPreviewOrigin } from '../src/cors.js';

const ALLOWED_ORIGINS = [
  'https://harumnesia.web.id',
  'https://www.harumnesia.web.id',
  'https://harumnesia.pages.dev',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].join(',');

const PRODUCTION_ORIGIN = 'https://harumnesia.web.id';
const PREVIEW_ORIGINS = [
  'https://ops-verify-workers-builds-preview.harumnesia.web.id',
  'https://feat-concentration-taxonomy-audit.harumnesia.web.id',
  'https://7cef0732.harumnesia.web.id',
];

const rejectOrigins = [
  'https://evil.example.com',
  'https://harumnesia.web.id.evil.com',
  'https://evil-harumnesia.web.id',
  'https://nested.preview.harumnesia.web.id',
  'https://preview.harumnesia.web.id/',
  'https://@preview.harumnesia.web.id',
  'https://preview.harumnesia.web.id:443',
  'http://ops-preview.harumnesia.web.id',
  'https://api.harumnesia.web.id',
  'https://preview.harumnesia.web.id:8443',
  'null',
  '',
];

const reservedPreviewHosts = [
  'https://api.harumnesia.web.id',
  'https://www.harumnesia.web.id',
];

const requestWithOrigin = (origin) =>
  new Request('https://api.harumnesia.web.id/api/v1/health', {
    headers: origin ? { Origin: origin } : {},
  });

const stubEnv = () => ({
  ALLOWED_ORIGINS,
  DB: {
    prepare: () => ({
      first: async () => ({
        value: JSON.stringify({ perfumeCount: 25127, brandCount: 1194 }),
      }),
      bind: () => ({ all: async () => ({ results: [] }) }),
    }),
  },
});

describe('preview origin policy', () => {
  it('allows the exact production origins', () => {
    const allowed = ALLOWED_ORIGINS.split(',');
    expect(isAllowedOrigin(PRODUCTION_ORIGIN, allowed)).toBe(true);
    expect(isAllowedOrigin('https://www.harumnesia.web.id', allowed)).toBe(
      true,
    );
  });

  it('allows single-label Cloudflare preview origins', () => {
    for (const origin of PREVIEW_ORIGINS) {
      expect(isAllowedOrigin(origin, []), origin).toBe(true);
    }
  });

  it('keeps the legacy pages.dev and local development origins', () => {
    const allowed = ALLOWED_ORIGINS.split(',');
    expect(isAllowedOrigin('https://harumnesia.pages.dev', allowed)).toBe(true);
    expect(isAllowedOrigin('http://localhost:5173', allowed)).toBe(true);
    expect(isAllowedOrigin('http://127.0.0.1:5173', allowed)).toBe(true);
  });

  it('rejects unrelated, nested, insecure, reserved and malformed origins', () => {
    const allowed = ALLOWED_ORIGINS.split(',');
    for (const origin of rejectOrigins) {
      expect(isAllowedOrigin(origin, allowed), origin).toBe(false);
    }
    for (const origin of reservedPreviewHosts) {
      expect(isPreviewOrigin(origin), origin).toBe(false);
    }
  });
});

describe('cors headers', () => {
  it('reflects the exact requesting origin for allowed origins', () => {
    for (const origin of [PRODUCTION_ORIGIN, ...PREVIEW_ORIGINS]) {
      const headers = corsHeaders(requestWithOrigin(origin), {
        ALLOWED_ORIGINS,
      });
      expect(headers['access-control-allow-origin'], origin).toBe(origin);
      expect(headers.vary).toBe('Origin');
      expect(headers['access-control-allow-methods']).toBe('GET,OPTIONS');
    }
  });

  it('never reflects or wildcards a disallowed origin', () => {
    for (const origin of rejectOrigins) {
      const headers = corsHeaders(requestWithOrigin(origin), {
        ALLOWED_ORIGINS,
      });
      expect(headers['access-control-allow-origin'], origin).toBeUndefined();
      expect(headers['access-control-allow-origin'], origin).not.toBe('*');
    }
  });

  it('omits the allow-origin header when no Origin is sent', () => {
    const headers = corsHeaders(requestWithOrigin(''), { ALLOWED_ORIGINS });
    expect(headers['access-control-allow-origin']).toBeUndefined();
    expect(headers.vary).toBe('Origin');
  });
});

describe('cors http behaviour', () => {
  const call = (origin, method = 'GET', path = '/api/v1/health') => {
    const headers = origin ? { Origin: origin } : {};
    const request = new Request(`https://api.harumnesia.web.id${path}`, {
      method,
      headers,
    });
    return worker.fetch(request, stubEnv());
  };

  it('answers production preflight with the exact origin', async () => {
    const response = await call(PRODUCTION_ORIGIN, 'OPTIONS');
    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe(
      PRODUCTION_ORIGIN,
    );
  });

  it('answers preview preflight with the exact origin', async () => {
    for (const origin of PREVIEW_ORIGINS) {
      const response = await call(origin, 'OPTIONS');
      expect(response.status, origin).toBe(204);
      expect(response.headers.get('access-control-allow-origin'), origin).toBe(
        origin,
      );
    }
  });

  it('serves GET health to production and preview origins', async () => {
    for (const origin of [PRODUCTION_ORIGIN, PREVIEW_ORIGINS[0]]) {
      const response = await call(origin);
      expect(response.status).toBe(200);
      expect(response.headers.get('access-control-allow-origin')).toBe(origin);
      const body = await response.json();
      expect(body.data.perfumes).toBe(25127);
    }
  });

  it('serves GET perfumes to a preview origin', async () => {
    const response = await call(
      PREVIEW_ORIGINS[2],
      'GET',
      '/api/v1/perfumes?limit=1',
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBe(
      PREVIEW_ORIGINS[2],
    );
  });

  it('keeps non-browser requests working without an Origin header', async () => {
    const response = await call();
    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('does not grant CORS to an unrelated origin', async () => {
    const response = await call('https://evil.example.com', 'GET');
    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
    expect(response.headers.get('vary')).toBe('Origin');
  });
});
