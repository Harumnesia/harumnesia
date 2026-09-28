import { createHash } from 'node:crypto';

import type { Market } from '@harumnesia/shared';

import { normalizeIdentityText } from './normalize.js';

export type CanonicalIdInput = {
  market: Market;
  brand: string;
  name: string;
  identity: unknown;
};

function slugify(value: string): string {
  const slug = value
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-|-$/gu, '')
    .slice(0, 36)
    .replace(/-$/u, '');

  return slug || 'unknown';
}

export function createCanonicalId(input: CanonicalIdInput): string {
  const hashInput = JSON.stringify({
    market: input.market,
    brand: normalizeIdentityText(input.brand),
    name: normalizeIdentityText(input.name),
    identity: input.identity,
  });
  const hash = createHash('sha256')
    .update(hashInput, 'utf8')
    .digest('hex')
    .slice(0, 16);

  return `${input.market}-${slugify(input.brand)}-${slugify(input.name)}-${hash}`;
}
