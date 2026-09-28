import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const REPOSITORY_ROOT = fileURLToPath(
  new URL('../../../', import.meta.url),
);
export const V1_ML_ROOT = process.env.HARUMNESIA_V1_ML_PATH
  ? path.resolve(process.env.HARUMNESIA_V1_ML_PATH)
  : path.resolve(REPOSITORY_ROOT, '../harumnesia-ml-capstone');

export const SOURCE_PATHS = {
  local: path.join(
    V1_ML_ROOT,
    'Dataset',
    'Dataset_Clean',
    'Dataset_Harumnesia_clean.csv',
  ),
  international: path.join(
    V1_ML_ROOT,
    'Dataset',
    'Dataset Awal',
    'fra_cleaned.csv',
  ),
  historicalCleanCombined: path.join(
    V1_ML_ROOT,
    'Dataset',
    'Dataset_Clean',
    'Gabungan Parfum  Lokal & Internasional.csv',
  ),
  historicalLegacyCombined: path.join(
    V1_ML_ROOT,
    'Dataset',
    'Dataset_Gabungan',
    'dataset_parfum_gabungan.csv',
  ),
  historicalCosine: path.join(
    V1_ML_ROOT,
    'Dataset',
    'Dataset_Gabungan',
    'final_cosine.csv',
  ),
} as const;

export const OUTPUT_PATHS = {
  perfumes: path.join(REPOSITORY_ROOT, 'data', 'perfumes.json'),
  runtimeRecommendation: path.join(
    REPOSITORY_ROOT,
    'data',
    'runtime',
    'recommendation.json',
  ),
  notes: path.join(REPOSITORY_ROOT, 'data', 'taxonomy', 'notes.json'),
  accords: path.join(REPOSITORY_ROOT, 'data', 'taxonomy', 'accords.json'),
  genders: path.join(REPOSITORY_ROOT, 'data', 'taxonomy', 'genders.json'),
  concentrations: path.join(
    REPOSITORY_ROOT,
    'data',
    'taxonomy',
    'concentrations.json',
  ),
  report: path.join(
    REPOSITORY_ROOT,
    'scripts',
    'build-dataset',
    'build-report.json',
  ),
  noteQualityReport: path.join(
    REPOSITORY_ROOT,
    'scripts',
    'build-dataset',
    'note-quality-report.json',
  ),
} as const;
