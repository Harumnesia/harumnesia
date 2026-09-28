import { z } from 'zod';

export const MarketSchema = z.enum(['local', 'international']);
export type Market = z.infer<typeof MarketSchema>;

export const GenderSchema = z.enum(['men', 'women', 'unisex', 'unknown']);
export type Gender = z.infer<typeof GenderSchema>;

export const PriceSchema = z
  .object({
    amount: z.number().int().positive(),
    currency: z.string().trim().min(1),
  })
  .strict();
export type Price = z.infer<typeof PriceSchema>;

export const VolumeSchema = z
  .object({
    value: z.number().positive(),
    unit: z.literal('ml'),
  })
  .strict();
export type Volume = z.infer<typeof VolumeSchema>;

const NoteListSchema = z.array(z.string().trim().min(1));

export const NoteStagesSchema = z
  .object({
    top: NoteListSchema,
    middle: NoteListSchema,
    base: NoteListSchema,
  })
  .strict();
export type NoteStages = z.infer<typeof NoteStagesSchema>;

export const RawNotesSchema = z
  .object({
    top: z.string().nullable(),
    middle: z.string().nullable(),
    base: z.string().nullable(),
  })
  .strict();
export type RawNotes = z.infer<typeof RawNotesSchema>;

export const PerfumeSourceSchema = z
  .object({
    dataset: z.string().trim().min(1),
    sourceType: MarketSchema,
    legacyId: z.string().trim().min(1).nullable(),
    sourceUrl: z.string().url().nullable(),
  })
  .strict();
export type PerfumeSource = z.infer<typeof PerfumeSourceSchema>;

export const PerfumeSchema = z
  .object({
    id: z.string().trim().min(1),
    name: z.string().trim().min(1),
    brand: z.string().trim().min(1),
    market: MarketSchema,
    country: z.string().trim().min(1).nullable(),
    gender: GenderSchema,
    concentration: z
      .object({
        value: z.string().trim().min(1).nullable(),
        raw: z.string().nullable(),
      })
      .strict(),
    volume: VolumeSchema.nullable(),
    price: PriceSchema.nullable(),
    notes: NoteStagesSchema,
    rawNotes: RawNotesSchema,
    accords: z.array(z.string().trim().min(1)),
    occasion: z.array(z.string().trim().min(1)),
    rating: z.number().min(0).max(5).nullable(),
    year: z.number().int().min(1700).max(2100).nullable(),
    perfumer: z.string().trim().min(1).nullable(),
    image: z.string().url().nullable(),
    source: PerfumeSourceSchema,
  })
  .strict();
export type Perfume = z.infer<typeof PerfumeSchema>;

export const PerfumeDatasetSchema = z.array(PerfumeSchema);
export type PerfumeDataset = z.infer<typeof PerfumeDatasetSchema>;
