/**
 * Get a hint for any word form.
 *
 * The word is stemmed, then:
 * 1. Check for a custom hint (takes priority)
 * 2. Fall back to the category name
 *
 * Examples:
 *   getHint("blueberries") -> "Fruit" (or custom hint if defined)
 *   getHint("blueberry")   -> "Fruit" (same - both stem to "blueberri")
 *   getHint("lions")       -> "Mammal"
 */

import { stemToken } from "./stem";
import { stemToCategory } from "./stem-to-category";
import { customHints } from "./custom-hints";

/**
 * Title-case a category name for display.
 * "fruit" -> "Fruit"
 * "bathroomFixture" -> "Bathroom Fixture"
 */
function formatCategory(category: string): string {
  // Insert space before capitals (for camelCase)
  const spaced = category
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_\-]+/g, " ");

  // Title case each word
  return spaced
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function getHint(word: string): string | null {
  const stem = stemToken(word);

  if (!stem) {
    return null;
  }

  // Custom hint takes priority
  if (customHints[stem]) {
    return customHints[stem];
  }

  // Fall back to category name
  const category = stemToCategory[stem];
  if (category) {
    return formatCategory(category);
  }

  return null;
}

/**
 * Check if a word (in any form) is valid in the game.
 */
export function isValidWord(word: string): boolean {
  const stem = stemToken(word);
  return stem !== "" && stem in stemToCategory;
}

/**
 * Get all categorized word stems as a Set for efficient lookup.
 */
export function getCategorizedWords(): Set<string> {
  return new Set(Object.keys(stemToCategory));
}

/**
 * Get the stem for a word (useful for debugging).
 */
export { stemToken } from "./stem";
