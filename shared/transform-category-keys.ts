/**
 * Transforms an object's keys into display-friendly labels.
 *
 * Rules:
 *  1) If a key exists in KEY_MAP, use that value.
 *  2) Otherwise, auto-title-case the key:
 *     - camelCase / PascalCase => "Title Case"
 *     - snake_case / kebab-case => "Title Case"
 *     - preserves all-uppercase acronyms (e.g., "API", "HTTP", "QA")
 *
 * Keys that are a simple auto-title-case (e.g. "fruit" => "Fruit",
 * "bathroomFixture" => "Bathroom Fixture") can be excluded from KEY_MAP.
 */
export function transformCategoryKeys<T>(
  input: Record<string, T>,
  overrides?: Partial<Record<string, string>>,
): Record<string, T> {
  const out: Record<string, T> = {};

  const map: Record<string, string> = {
    ...KEY_MAP,
    ...(overrides ?? {}),
  } as any;

  for (const [key, value] of Object.entries(input)) {
    const nextKey = map[key] ?? autoTitleCaseKey(key);
    out[nextKey] = value;
  }

  return out;
}

/**
 * Put ONLY exceptions here — i.e., keys that don't come out right by
 * autoTitleCaseKey(), or keys you want to rename to something non-derivable.
 *
 * Examples of what belongs here:
 *  - "reading/writing" => "Reading & Writing" (different separator)
 *  - "body part" => "Body Part" (already spaced but ok; could also omit)
 *  - "musicTerm" => "Music Term" (auto works; omit unless you want different)
 */
const KEY_MAP: Record<string, string> = {
  // add exceptions here as-needed
  // "reading/writing": "Reading & Writing",
};

function autoTitleCaseKey(key: string): string {
  // normalize separators to spaces
  const normalized = key
    .replace(/[_\-\/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // insert spaces for camelCase/PascalCase boundaries, preserving acronym blocks
  // e.g. "bathroomFixture" -> "bathroom Fixture"
  // e.g. "HTTPServerError" -> "HTTP Server Error"
  const spaced = normalized
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

  return spaced
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      // keep acronyms / all-caps tokens as-is (2+ letters), e.g. "API", "HTTP", "QA"
      if (/^[A-Z0-9]{2,}$/.test(word)) return word;

      // normal Title Case
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}
