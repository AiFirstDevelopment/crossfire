/**
 * Custom hints for specific word stems.
 * These take priority over the default category-based hints.
 *
 * Key = stemmed form of the word (use stemToken to find it)
 * Value = hint text (do NOT include the word or any form of it)
 *
 * Add entries here to override the default category hint.
 */

export const customHints: Record<string, string> = {
  // Examples - add your own as needed:
  // "blueberri": "small round fruit that grows on bushes",
  // "avocado": "creamy green fruit used in guacamole",
  // "platypus": "egg-laying mammal with a duck-like bill",
};
