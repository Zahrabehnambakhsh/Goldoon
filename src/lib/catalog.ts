// Search over the plant catalog (table `plant_catalog`) for the name suggestions in the plant form.

export type CatalogPlant = {
  name_fa: string;
  aliases: string[];
  latin_name: string;
  type: string;
  light_level: string | null;
  watering_interval_days: number | null;
};

// Character codes (written as numbers so no invisible characters live in the source).
const SAME_AS: Record<number, string> = {
  0x064a: "ی", // Arabic yeh
  0x0649: "ی", // alef maksura
  0x0643: "ک", // Arabic kaf
  0x0623: "ا", // alef with hamza above
  0x0625: "ا", // alef with hamza below
  0x0622: "ا", // alef with madda
  0x0629: "ه", // teh marbuta
  0x0624: "و", // waw with hamza
};
const IGNORED = new Set([0x0640, 0x0670, 0x200c, 0x200d, 0x200e, 0x200f]); // tatweel, dagger alef, joiners, direction marks

/** Makes Persian text comparable: unifies Arabic/Persian letter variants, digits, and drops spaces and marks. */
export function normalize(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (IGNORED.has(code) || (code >= 0x064b && code <= 0x065f)) continue; // diacritics
    if (SAME_AS[code]) out += SAME_AS[code];
    else if (code >= 0x06f0 && code <= 0x06f9)
      out += String(code - 0x06f0); // Persian digits
    else if (code >= 0x0660 && code <= 0x0669)
      out += String(code - 0x0660); // Arabic-Indic digits
    else if (/[\s\-_.]/.test(ch)) continue;
    else out += ch.toLowerCase();
  }
  return out;
}

type Indexed = { plant: CatalogPlant; names: string[]; latin: string };

export function buildIndex(catalog: CatalogPlant[]): Indexed[] {
  return catalog.map((plant) => ({
    plant,
    names: [plant.name_fa, ...plant.aliases].map(normalize),
    latin: normalize(plant.latin_name),
  }));
}

/** Best matches first: the exact name, names that start with the text, then names that contain it. */
export function searchCatalog(index: Indexed[], query: string, limit = 6): CatalogPlant[] {
  const q = normalize(query);
  if (!q) return [];
  const scored: Array<{ plant: CatalogPlant; score: number }> = [];
  for (const { plant, names, latin } of index) {
    let score = 0;
    names.forEach((n, i) => {
      const primary = i === 0 ? 1 : 0; // the main name wins ties over aliases
      if (n === q) score = Math.max(score, 100 + primary);
      else if (n.startsWith(q))
        score = Math.max(score, 60 + primary * 5 - Math.min(n.length - q.length, 20) / 4);
      else if (q.length >= 2 && n.includes(q)) score = Math.max(score, 30 + primary * 5);
    });
    if (q.length >= 3 && latin.includes(q)) score = Math.max(score, 20);
    if (score > 0) scored.push({ plant, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.plant.name_fa.localeCompare(b.plant.name_fa, "fa"))
    .slice(0, limit)
    .map((s) => s.plant);
}

/** The catalog entry whose main name or alias is exactly what was typed, if any. */
export function exactMatch(index: Indexed[], query: string): CatalogPlant | null {
  const q = normalize(query);
  if (!q) return null;
  return index.find(({ names }) => names.includes(q))?.plant ?? null;
}
