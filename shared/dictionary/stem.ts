/**
 * Porter Stemmer for word-game use case.
 * Uses the standard Porter Stemmer algorithm via the 'stemmer' package.
 */

import { stemmer } from "stemmer";

export function stemToken(token: string): string {
  let t = token.toLowerCase().trim();

  // Remove common punctuation and collapse spaces
  t = t.replace(/\s+/g, "").replace(/[''""".,/\\()\-_:;!?]/g, "");

  if (!t) return "";

  return stemmer(t);
}
