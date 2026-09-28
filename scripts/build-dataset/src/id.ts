import { createHash } from 'node:crypto';

import { collapseWhitespace } from './normalize.js';

function normalizeLegacyId(value: string): string {
  const normalized = collapseWhitespace(value)
    .toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '');

  if (normalized === '') {
    throw new Error('Local legacy ID cannot be empty after normalization.');
  }

  return normalized;
}

export function normalizeSourceUrl(value: string): string {
  return new URL(collapseWhitespace(value)).toString();
}

export function createLocalCanonicalId(legacyId: string): string {
  return `local-${normalizeLegacyId(legacyId)}`;
}

export function createInternationalCanonicalId(sourceUrl: string): string {
  const hash = createHash('sha256')
    .update(normalizeSourceUrl(sourceUrl), 'utf8')
    .digest('hex')
    .slice(0, 16);

  return `international-${hash}`;
}
