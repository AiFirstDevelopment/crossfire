/**
 * Lightweight Porter-ish stemming for word-game use case.
 * Goal: collapse obvious morphological variants without pulling in a dependency.
 */

function hasVowel(s: string): boolean {
  return /[aeiou]/.test(s);
}

export function stemToken(token: string): string {
  let t = token.toLowerCase().trim();

  // Remove common punctuation and collapse spaces
  t = t.replace(/\s+/g, "").replace(/[''""".,/\\()\-_:;!?]/g, "");

  if (!t) return "";

  // --- Step 1a: plurals ---
  if (t.endsWith("sses")) {
    // classes -> class
    t = t.slice(0, -2);
  } else if (t.endsWith("ies")) {
    // berries -> berri, ponies -> poni
    t = t.slice(0, -3) + "i";
  } else if (t.endsWith("oes") && t.length > 3) {
    // potatoes -> potato, tomatoes -> tomato
    t = t.slice(0, -2);
  } else if (t.endsWith("ss")) {
    // glass -> glass (no change)
  } else if (t.endsWith("s") && t.length > 1) {
    // apples -> apple
    t = t.slice(0, -1);
  }

  // --- Step 1b: -ed and -ing ---
  if (t.endsWith("ed") && t.length > 4) {
    const stem = t.slice(0, -2);
    // Only remove if stem has a vowel (roasted -> roast, but not "red" -> "r")
    if (hasVowel(stem)) {
      t = stem;
    }
  } else if (t.endsWith("ing") && t.length > 5) {
    const stem = t.slice(0, -3);
    // Only remove if stem has a vowel (roasting -> roast, but not "ring" -> "r")
    if (hasVowel(stem)) {
      t = stem;
    }
  }

  // --- Step 1c: turn terminal y -> i ---
  // blueberry -> blueberri, fly -> fli, cherry -> cherri
  // Always convert for consistency (so fly/flies both become fli)
  if (t.endsWith("y") && t.length > 2) {
    t = t.slice(0, -1) + "i";
  }

  return t;
}
