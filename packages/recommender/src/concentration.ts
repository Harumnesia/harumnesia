// Canonical concentration mapping. Sumber kebenaran label: data/taxonomy/concentrations.json.
// Dipakai saat index build supaya filter membandingkan nilai kanonik, bukan label mentah.

export type ConcentrationCanonicalMap = Readonly<Record<string, string>>;

export function normalizeConcentrationKey(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toUpperCase();
}

export function getCanonicalConcentration(
  raw: string | null | undefined,
  map: ConcentrationCanonicalMap = DEFAULT_CONCENTRATION_CANONICAL_MAP,
): string | null {
  if (typeof raw !== 'string') {
    return null;
  }
  const key = normalizeConcentrationKey(raw);
  if (key.length === 0) {
    return null;
  }
  return Object.prototype.hasOwnProperty.call(map, key) ? map[key] ?? null : null;
}

export const DEFAULT_CONCENTRATION_CANONICAL_MAP: ConcentrationCanonicalMap =
  Object.freeze({
  "ABSOLU DE PARFUM": "ABSOLU DE PARFUM",
  "ATTAR": "ATTAR",
  "BODY MIST": "BODY MIST",
  "BODY SPRAY": "BODY SPRAY",
  "COLOGNE ABSOLUE": "COLOGNE ABSOLUE",
  "CONCENTRATED PERFUME OIL": "ATTAR",
  "DEO PARFUM": "DEO PARFUM",
  "EAU DE COLOGNE": "EDC",
  "EAU DE PARFUM": "EDP",
  "EAU DE PARFUM INTENSE": "EDP",
  "EAU DE PARFUM LÉGÈRE": "EDP",
  "EAU DE TOILETTE": "EDT",
  "EAU DE TOILETTE INTENSE": "EDT",
  "EDC": "EDC",
  "EDP": "EDP",
  "EDT": "EDT",
  "ELIXIR": "ELIXIR",
  "ELIXIR / PERFUME EXTRACT": "ELIXIR",
  "ELIXIR DE PARFUM": "ELIXIR",
  "ELIXIR PARFUM": "ELIXIR",
  "ESPRIT DE PARFUM": "ESPRIT DE PARFUM",
  "ESSENCE DE PARFUM": "ESSENCE DE PARFUM",
  "EXTRAIT": "EXTRAIT",
  "EXTRAIT BOTTLE LABEL": "EXTRAIT",
  "EXTRAIT DE PARFUM": "EXTRAIT",
  "EXTRAIT DE PARFUM 25%": "EXTRAIT",
  "FRAGRANT MIST": "FRAGRANT MIST",
  "HAIR MIST": "HAIR MIST",
  "LE PARFUM": "LE PARFUM",
  "PARFUM": "PARFUM",
  "PARFUM COLOGNE": "PARFUM COLOGNE",
  "PARFUM FIN": "PARFUM",
  "PARFUM INTENSE": "PARFUM INTENSE",
  "PERFUME OIL": "PERFUME OIL",
  "PERFUMED GEL": "PERFUMED GEL",
  "PERFUMED GEL / EAU DE SOIN": "PERFUMED GEL",
  "PURE PERFUME": "PARFUM",
  "SECRET DE PARFUM": "SECRET DE PARFUM",
  });
