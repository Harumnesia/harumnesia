import {
  RecommendationDatasetSchema,
  type Perfume,
  type RecommendationDataset,
} from '@harumnesia/shared';

export const RUNTIME_SIZE_LIMIT_BYTES = 20 * 1024 * 1024;

export function projectRecommendationDataset(
  records: readonly Perfume[],
): RecommendationDataset {
  return RecommendationDatasetSchema.parse(
    records.map((record) => ({
      id: record.id,
      name: record.name,
      brand: record.brand,
      market: record.market,
      gender: record.gender,
      concentration: record.concentration.value,
      price: record.price,
      notes: record.notes,
      accords: record.accords,
      occasion: record.occasion,
    })),
  );
}

export function assertRuntimeConsistency(
  canonical: readonly Perfume[],
  runtime: RecommendationDataset,
): void {
  RecommendationDatasetSchema.parse(runtime);

  if (runtime.length !== canonical.length) {
    throw new Error(
      `Runtime record count ${runtime.length} does not match canonical count ${canonical.length}.`,
    );
  }

  const runtimeIds = runtime.map((record) => record.id);
  if (new Set(runtimeIds).size !== runtime.length) {
    throw new Error('Runtime dataset contains duplicate IDs.');
  }

  const expected = projectRecommendationDataset(canonical);
  for (let index = 0; index < expected.length; index += 1) {
    const expectedRecord = expected[index];
    const runtimeRecord = runtime[index];
    if (JSON.stringify(runtimeRecord) !== JSON.stringify(expectedRecord)) {
      throw new Error(
        `Runtime record at index ${index} does not match the canonical projection.`,
      );
    }
  }
}
