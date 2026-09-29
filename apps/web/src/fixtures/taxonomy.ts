export const NOTE_OPTIONS = [
  'amber',
  'bergamot',
  'cedarwood',
  'citrus',
  'jasmine',
  'musk',
  'patchouli',
  'rose',
  'sandalwood',
  'vanilla',
] as const;

export const ACCORD_OPTIONS = [
  'amber',
  'citrus',
  'floral',
  'fresh',
  'musky',
  'powdery',
  'spicy',
  'sweet',
  'woody',
] as const;

export const OCCASION_OPTIONS = ['day', 'night', 'versatile'] as const;

export const CONCENTRATION_OPTIONS = ['EDP', 'EDT'] as const;

export const GENDER_OPTIONS = [
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
  { value: 'unisex', label: 'Unisex' },
] as const;
