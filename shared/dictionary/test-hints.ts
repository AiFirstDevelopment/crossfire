/**
 * Quick test script for the hint system.
 * Run with: npx tsx shared/test-hints.ts
 */

import { getHint, isValidWord, stemToken } from "./get-hint";

const testWords = [
  // Plurals and variants
  "blueberry",
  "blueberries",
  "strawberry",
  "strawberries",

  // Animals
  "lion",
  "lions",
  "elephant",
  "elephants",

  // Vegetables
  "carrot",
  "carrots",
  "potato",
  "potatoes",
  "tomato",
  "tomatoes",

  // Past tense / -ing forms
  "roast",
  "roasted",
  "roasting",

  // Edge cases - y endings
  "fly",
  "flies",
  "butterfly",
  "butterflies",
  "cherry",
  "cherries",

  // More edge cases
  "glass",
  "glasses",
  "class",
  "classes",

  // Invalid word
  "xyznotaword",
];

console.log("Testing hint system:\n");
console.log("Word".padEnd(20), "Stem".padEnd(15), "Valid".padEnd(8), "Hint");
console.log("-".repeat(70));

for (const word of testWords) {
  const stem = stemToken(word);
  const valid = isValidWord(word);
  const hint = getHint(word);

  console.log(
    word.padEnd(20),
    stem.padEnd(15),
    String(valid).padEnd(8),
    hint ?? "(no hint)"
  );
}
