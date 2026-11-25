import { readFile } from 'node:fs/promises';

import { validateConcentrationTaxonomy } from './validation.js';

export type ConcentrationArtifactDecision = {
  text: string;
  preserved: boolean;
};

/**
 * `data/taxonomy/concentrations.json` is an audited artifact (schemaVersion 2).
 * The build pipeline must never replace it with the legacy generated projection.
 * Fail closed before any output is written when the artifact is missing, still
 * legacy-shaped, or incompatible with the generated concentration values.
 */
export async function resolveConcentrationArtifact(
  artifactPath: string,
  generated: { text: string; values: string[] },
): Promise<ConcentrationArtifactDecision> {
  let existing: string;
  try {
    existing = await readFile(artifactPath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(
        `${artifactPath} is missing. The build pipeline no longer generates this artifact; restore the audited schemaVersion 2 taxonomy before building.`,
      );
    }
    throw error;
  }

  const parsed = JSON.parse(existing) as { schemaVersion?: unknown };
  if (parsed.schemaVersion !== 2) {
    throw new Error(
      `${artifactPath} has schemaVersion ${String(parsed.schemaVersion)}; only the audited schemaVersion 2 taxonomy is accepted and it will not be overwritten.`,
    );
  }

  validateConcentrationTaxonomy(
    existing,
    { values: generated.values },
    artifactPath,
  );
  return { text: existing, preserved: true };
}
