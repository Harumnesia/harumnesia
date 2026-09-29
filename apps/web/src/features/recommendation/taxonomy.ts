import { TAXONOMY_ASSET_URLS } from './runtime/runtime-assets.js';
import type { DiscoveryTaxonomy } from './types.js';

type TaxonomyArtifact = {
  values: unknown;
};

export type TaxonomyArtifacts = {
  notes: TaxonomyArtifact;
  accords: TaxonomyArtifact;
  genders: TaxonomyArtifact;
  concentrations: TaxonomyArtifact;
};

const GENDER_LABELS = {
  men: 'Men',
  women: 'Women',
  unisex: 'Unisex',
} as const;

function stringValues(artifact: TaxonomyArtifact, name: string): string[] {
  if (!Array.isArray(artifact.values)) {
    throw new Error(`${name} taxonomy does not contain a values array.`);
  }
  const values = artifact.values.filter(
    (value): value is string => typeof value === 'string' && value.length > 0,
  );
  if (values.length !== artifact.values.length) {
    throw new Error(`${name} taxonomy contains an invalid value.`);
  }
  return [...new Set(values)];
}

export function toDiscoveryTaxonomy(
  artifacts: TaxonomyArtifacts,
): DiscoveryTaxonomy {
  const genderValues = stringValues(artifacts.genders, 'Gender').filter(
    (value): value is keyof typeof GENDER_LABELS => value in GENDER_LABELS,
  );
  const concentrations = stringValues(
    artifacts.concentrations,
    'Concentration',
  ).filter((value) => value.toLocaleUpperCase('en-US') !== 'XDP');

  return {
    notes: stringValues(artifacts.notes, 'Notes'),
    accords: stringValues(artifacts.accords, 'Accords'),
    genders: genderValues.map((value) => ({
      value,
      label: GENDER_LABELS[value],
    })),
    occasions: ['day', 'night', 'versatile'],
    concentrations,
  };
}

async function fetchTaxonomyArtifact(
  url: string,
  name: string,
): Promise<TaxonomyArtifact> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${name} taxonomy request failed (${response.status}).`);
  }
  return (await response.json()) as TaxonomyArtifact;
}

let taxonomyPromise: Promise<DiscoveryTaxonomy> | null = null;

export function loadProductionTaxonomy(): Promise<DiscoveryTaxonomy> {
  taxonomyPromise ??= Promise.all([
    fetchTaxonomyArtifact(TAXONOMY_ASSET_URLS.notes, 'Notes'),
    fetchTaxonomyArtifact(TAXONOMY_ASSET_URLS.accords, 'Accords'),
    fetchTaxonomyArtifact(TAXONOMY_ASSET_URLS.genders, 'Gender'),
    fetchTaxonomyArtifact(TAXONOMY_ASSET_URLS.concentrations, 'Concentration'),
  ])
    .then(([notes, accords, genders, concentrations]) =>
      toDiscoveryTaxonomy({ notes, accords, genders, concentrations }),
    )
    .catch((error: unknown) => {
      taxonomyPromise = null;
      throw error;
    });
  return taxonomyPromise;
}
