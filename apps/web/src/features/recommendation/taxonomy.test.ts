import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

import { toDiscoveryTaxonomy, type TaxonomyArtifacts } from './taxonomy.js';

async function artifact(name: string): Promise<{ values: unknown }> {
  const path = new URL(
    `../../../../../data/taxonomy/${name}.json`,
    import.meta.url,
  );
  return JSON.parse(await readFile(path, 'utf8')) as { values: unknown };
}

describe('production discovery taxonomy', () => {
  it('maps generated artifacts and excludes unresolved user choices', async () => {
    const [notes, accords, genders, concentrations] = await Promise.all([
      artifact('notes'),
      artifact('accords'),
      artifact('genders'),
      artifact('concentrations'),
    ]);
    const taxonomy = toDiscoveryTaxonomy({
      notes,
      accords,
      genders,
      concentrations,
    } satisfies TaxonomyArtifacts);

    expect(taxonomy.notes).toHaveLength(2_505);
    expect(taxonomy.accords).toHaveLength(84);
    expect(taxonomy.genders.map(({ value }) => value)).toEqual([
      'men',
      'women',
      'unisex',
    ]);
    expect(taxonomy.concentrations).toEqual(['EDP', 'EDT']);
    expect(taxonomy.concentrations).not.toContain('XDP');
    expect(taxonomy.occasions).toEqual(['day', 'night', 'versatile']);
  });
});
