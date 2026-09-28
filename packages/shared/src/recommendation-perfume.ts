import { z } from 'zod';

import {
  GenderSchema,
  MarketSchema,
  NoteStagesSchema,
  PriceSchema,
} from './perfume.js';

export const RecommendationPerfumeSchema = z
  .object({
    id: z.string().trim().min(1),
    name: z.string().trim().min(1),
    brand: z.string().trim().min(1),
    market: MarketSchema,
    gender: GenderSchema,
    concentration: z.string().trim().min(1).nullable(),
    price: PriceSchema.nullable(),
    notes: NoteStagesSchema,
    accords: z.array(z.string().trim().min(1)),
    occasion: z.array(z.string().trim().min(1)),
  })
  .strict();

export type RecommendationPerfume = z.infer<typeof RecommendationPerfumeSchema>;

export const RecommendationDatasetSchema = z.array(RecommendationPerfumeSchema);
export type RecommendationDataset = z.infer<typeof RecommendationDatasetSchema>;
