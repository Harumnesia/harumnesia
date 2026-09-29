export type SparseVector = {
  terms: ReadonlySet<string>;
  norm: number;
};

export function computeIdf(
  documentCount: number,
  documents: readonly ReadonlySet<string>[],
): Map<string, number> {
  const documentFrequency = new Map<string, number>();
  for (const document of documents) {
    for (const term of document) {
      documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
    }
  }

  const idf = new Map<string, number>();
  for (const [term, frequency] of documentFrequency) {
    idf.set(term, Math.log((documentCount + 1) / (frequency + 1)) + 1);
  }
  return idf;
}

export function createSparseVector(
  terms: Iterable<string>,
  idf: ReadonlyMap<string, number>,
): SparseVector {
  const knownTerms = new Set<string>();
  let squaredNorm = 0;

  for (const term of terms) {
    const weight = idf.get(term);
    if (weight !== undefined && !knownTerms.has(term)) {
      knownTerms.add(term);
      squaredNorm += weight * weight;
    }
  }

  return { terms: knownTerms, norm: Math.sqrt(squaredNorm) };
}

export function idfWeightedCosine(
  left: SparseVector,
  right: SparseVector,
  idf: ReadonlyMap<string, number>,
): number {
  if (left.norm === 0 || right.norm === 0) {
    return 0;
  }

  const [smaller, larger] =
    left.terms.size <= right.terms.size
      ? [left.terms, right.terms]
      : [right.terms, left.terms];
  let dotProduct = 0;
  for (const term of smaller) {
    if (larger.has(term)) {
      const weight = idf.get(term);
      if (weight !== undefined) {
        dotProduct += weight * weight;
      }
    }
  }

  const similarity = dotProduct / (left.norm * right.norm);
  return Math.min(1, Math.max(0, similarity));
}
