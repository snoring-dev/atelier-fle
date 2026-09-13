import type { Database, Fiche } from "@/lib/db";

/**
 * Return the fiche's stored lexicon draw, or draw and persist one if missing.
 * Used by generation and the fiche page so the Révision pill stays stable.
 */
export async function ensureReviewWords(
  db: Database,
  fiche: Fiche,
): Promise<string[]> {
  if (fiche.reviewWords !== null) {
    return fiche.reviewWords;
  }
  const words = await db.lexique.draw(4);
  const updated = await db.fiches.setReviewWords(fiche.numero, words);
  return updated.reviewWords ?? words;
}
