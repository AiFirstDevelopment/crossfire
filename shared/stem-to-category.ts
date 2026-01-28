/**
 * Inverted lookup: stem -> category name
 * Built from _categoryWords at module load time.
 */

import { _categoryWords } from "./categories";
import { stemToken } from "./stem";

function buildStemToCategory(): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [category, words] of Object.entries(_categoryWords)) {
    for (const word of words) {
      const stem = stemToken(word);
      if (stem && !result[stem]) {
        // First category wins if a word appears in multiple categories
        result[stem] = category;
      }
    }
  }

  return result;
}

export const stemToCategory = buildStemToCategory();
