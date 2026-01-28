// Word categories for hint system
// Words are mapped to simple, recognizable categories
import { transformCategoryKeys } from "../transform-category-keys"; // adjust path
import { _categoryWords } from "../categories";
import fs from "node:fs";

function hasVowel(s: string): boolean {
  return /[aeiou]/.test(s);
}

/**
 * Lightweight Porter-ish stemming for your word-game use case.
 * Goal: collapse obvious morphological variants without pulling in a dependency.
 */
function stemToken(token: string): string {
  let t = token;

  // --- Step 1a (very small subset) ---
  if (t.endsWith("sses")) {
    // classes -> class
    t = t.slice(0, -2); // remove "es"
  } else if (t.endsWith("ies")) {
    // berries -> berri, ponies -> poni
    t = t.slice(0, -3) + "i";
  } else if (t.endsWith("ss")) {
    // glass -> glass (no change)
  } else if (t.endsWith("s") && t.length > 1) {
    // apples -> apple
    t = t.slice(0, -1);
  }

  // --- Step 1c (subset): turn terminal y -> i if stem has a vowel ---
  // blueberry -> blueberri
  if (t.endsWith("y") && t.length > 2) {
    const stem = t.slice(0, -1);
    if (hasVowel(stem)) {
      t = stem + "i";
    }
  }

  return t;
}

function normalizeToken(raw: string): string {
  const normalized = raw
    .trim()
    .toLowerCase()
    // collapse spaces + remove common punctuation that breaks "single token" matching
    .replace(/\s+/g, "")
    .replace(/['’"“”.,/\\()\-_:;!?]/g, "");

  if (!normalized) return "";
  return stemToken(normalized);
}

function normalizeCategoryWords(
  words: Record<string, string[]>,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};

  for (const [category, list] of Object.entries(words)) {
    const seen = new Set<string>();
    const cleaned: string[] = [];

    for (const item of list ?? []) {
      if (typeof item !== "string") continue;
      const token = normalizeToken(item);
      if (!token) continue;

      if (!seen.has(token)) {
        seen.add(token);
        cleaned.push(token);
      }
    }

    out[category] = cleaned;
  }

  return out;
}

/**
 * NEW: flatten all stemmed terms across all categories into one unique array.
 */
function flattenUniqueTerms(
  wordsByCategory: Record<string, string[]>,
): string[] {
  const all = new Set<string>();

  for (const list of Object.values(wordsByCategory)) {
    for (const term of list ?? []) {
      if (typeof term === "string" && term) all.add(term);
    }
  }

  // deterministic output (helps diffs/tests)
  return Array.from(all).sort();
}

export const categoryWordStems = transformCategoryKeys(
  normalizeCategoryWords(_categoryWords),
);

export const allStemmedTerms = flattenUniqueTerms(categoryWordStems);

// Write the full list to disk (no console truncation)
fs.writeFileSync(
  "all-stemmed-terms.json",
  JSON.stringify(allStemmedTerms, null, 2),
  "utf8",
);

console.log(
  `Wrote ${allStemmedTerms.length} stemmed terms -> all-stemmed-terms.json`,
);
