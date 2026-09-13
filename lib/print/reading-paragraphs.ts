/**
 * Split reading text into print paragraphs.
 * Prefer blank-line breaks from the model; fall back to sentence groups for
 * legacy single-block payloads so old fiches still get a journal layout.
 */
export function splitReadingParagraphs(text: string, groups = 3): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const byBlank = trimmed
    .split(/\n\s*\n/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  if (byBlank.length >= 2) return byBlank;

  const single = byBlank[0] ?? trimmed.replace(/\s+/g, " ").trim();
  return splitIntoSentenceGroups(single, groups);
}

/** Split a continuous string into roughly equal sentence groups. */
function splitIntoSentenceGroups(text: string, groups: number): string[] {
  const sentences =
    text
      .match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g)
      ?.map((s) => s.trim())
      .filter(Boolean) ?? [];

  if (sentences.length === 0) return [text];
  if (sentences.length <= groups) return sentences;

  const result: string[] = [];
  const base = Math.floor(sentences.length / groups);
  const remainder = sentences.length % groups;
  let offset = 0;

  for (let i = 0; i < groups; i++) {
    const size = base + (i < remainder ? 1 : 0);
    const chunk = sentences.slice(offset, offset + size);
    offset += size;
    if (chunk.length > 0) result.push(chunk.join(" "));
  }

  return result;
}
