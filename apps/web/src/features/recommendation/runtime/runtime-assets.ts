import runtimeDataUrl from '../../../../../../data/runtime/recommendation.json?url&no-inline';
import accordsTaxonomyUrl from '../../../../../../data/taxonomy/accords.json?url&no-inline';
import concentrationsTaxonomyUrl from '../../../../../../data/taxonomy/concentrations.json?url&no-inline';
import gendersTaxonomyUrl from '../../../../../../data/taxonomy/genders.json?url&no-inline';
import notesTaxonomyUrl from '../../../../../../data/taxonomy/notes.json?url&no-inline';

export const RUNTIME_DATA_URL = runtimeDataUrl;

export const TAXONOMY_ASSET_URLS = {
  notes: notesTaxonomyUrl,
  accords: accordsTaxonomyUrl,
  genders: gendersTaxonomyUrl,
  concentrations: concentrationsTaxonomyUrl,
} as const;
