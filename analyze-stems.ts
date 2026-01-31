import { _categoryWords } from './shared/dictionary/categories';
import { stemToken } from './shared/dictionary/stem';

// Build stem -> [category, word][] map
const stemMap = new Map<string, Array<{category: string, word: string}>>();

for (const [category, words] of Object.entries(_categoryWords)) {
  for (const word of words) {
    const stem = stemToken(word);
    if (!stem) continue;

    if (!stemMap.has(stem)) {
      stemMap.set(stem, []);
    }
    stemMap.get(stem)!.push({ category, word });
  }
}

// Find issues
console.log("=== STEM COLLISIONS (same stem, different categories) ===\n");
let collisionCount = 0;
for (const [stem, entries] of stemMap) {
  const categories = new Set(entries.map(e => e.category));
  if (categories.size > 1) {
    collisionCount++;
    console.log(`Stem "${stem}":`);
    for (const e of entries) {
      console.log(`  - "${e.word}" in ${e.category}`);
    }
    console.log();
  }
}
console.log(`Total collisions: ${collisionCount}\n`);

console.log("=== DUPLICATES WITHIN SAME CATEGORY ===\n");
let dupCount = 0;
for (const [stem, entries] of stemMap) {
  // Group by category
  const byCategory = new Map<string, string[]>();
  for (const e of entries) {
    if (!byCategory.has(e.category)) byCategory.set(e.category, []);
    byCategory.get(e.category)!.push(e.word);
  }

  for (const [cat, words] of byCategory) {
    if (words.length > 1) {
      dupCount++;
      console.log(`In "${cat}", these all stem to "${stem}": ${words.join(', ')}`);
    }
  }
}
console.log(`\nTotal duplicate groups: ${dupCount}`);
