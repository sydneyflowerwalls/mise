/**
 * Normalising a written ingredient name into a lookup key.
 *
 * Pure string work, deliberately separate from canonical.ts so it carries no
 * `server-only` import and can be unit-tested directly. "Brown onions",
 * "1 large brown onion" and "brown onion, finely diced" must all reduce to the
 * same key or the alias cache never hits.
 */

/** Words that describe preparation, not identity. Stripped before lookup. */
const PREP_WORDS = new Set([
  "fresh", "freshly", "finely", "roughly", "coarsely", "thinly", "thickly",
  "chopped", "diced", "sliced", "minced", "grated", "crushed", "peeled",
  "trimmed", "large", "small", "medium", "ripe", "free", "range", "organic",
  "good", "quality", "plus", "extra", "optional", "approx", "about",
]);

/**
 * Lowercase, drop punctuation and prep words, singularise. "Brown onions,
 * finely diced" and "1 large brown onion" both reduce to "brown onion".
 */
export function aliasKey(raw: string): string {
  const cleaned = raw
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")        // parenthetical notes
    .replace(/[^a-z\s-]/g, " ")         // digits, fractions, punctuation
    .split(/\s+/)
    .filter((w) => w && !PREP_WORDS.has(w))
    .map(singularise)
    .join(" ")
    .trim();
  return cleaned || raw.toLowerCase().trim();
}

function singularise(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.endsWith("oes")) return word.slice(0, -2);
  if (word.endsWith("ss")) return word;
  if (word.endsWith("s")) return word.slice(0, -1);
  return word;
}
