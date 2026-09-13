/**
 * Temporal / logical markers expected in ordering sentences (A2+/B1).
 * Longer phrases first so "à partir de ce moment-là" wins over "à partir".
 */
export const LOGICAL_MARKERS = [
  "à partir de ce moment-là",
  "à partir de ce moment",
  "ce jour-là",
  "le soir même",
  "le lendemain",
  "au début",
  "d'abord",
  "d’abord",
  "ensuite",
  "cependant",
  "finalement",
  "pourtant",
  "dès que",
  "soudain",
  "toutefois",
  "néanmoins",
  "puis",
  "enfin",
  "alors",
  "donc",
  "après",
  "avant",
  "pendant",
  "lorsque",
  "quand",
  "tandis que",
  "alors que",
  "par contre",
  "en revanche",
  "au contraire",
  "plus tard",
  "tout à coup",
  "aussitôt",
  "immédiatement",
  "en même temps",
  "entre-temps",
  "depuis",
] as const;

function normalizeForMatch(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/** True if the sentence contains at least one curated marker (phrase match). */
export function hasLogicalMarker(sentence: string): boolean {
  const haystack = normalizeForMatch(sentence);
  return LOGICAL_MARKERS.some((marker) =>
    haystack.includes(normalizeForMatch(marker)),
  );
}
