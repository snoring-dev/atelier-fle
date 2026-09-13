import type { z } from "zod";
import type { FichePayload } from "@/lib/schemas";
import { orderingAuditResultSchema, orderingLabelSchema } from "@/lib/schemas";

export type OrderingLabel = z.infer<typeof orderingLabelSchema>;

export type AuditSentence = {
  label: OrderingLabel;
  text: string;
};

export type OrderingAuditResult = {
  ambiguous: boolean;
  expected: OrderingLabel[];
  actual: OrderingLabel[];
};

export type RandomFn = () => number;

/** Fisher–Yates shuffle. `random` defaults to Math.random (injectable for tests). */
export function shuffleInPlace<T>(
  items: T[],
  random: RandomFn = Math.random,
): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = items[i];
    const b = items[j];
    if (a === undefined || b === undefined) continue;
    items[i] = b;
    items[j] = a;
  }
  return items;
}

/** Strip positions/rationale and shuffle for the blind audit prompt. */
export function prepareAuditSentences(
  sentences: FichePayload["ordering"]["sentences"],
  random: RandomFn = Math.random,
): AuditSentence[] {
  const stripped: AuditSentence[] = sentences.map((s) => ({
    label: s.label,
    text: s.text,
  }));
  return shuffleInPlace(stripped, random);
}

/** Expected label order: sort by stored position ascending. */
export function expectedLabelOrder(
  sentences: FichePayload["ordering"]["sentences"],
): OrderingLabel[] {
  return [...sentences]
    .sort((a, b) => a.position - b.position)
    .map((s) => s.label);
}

/** True if `labels` is exactly the set {a,b,c,d,e,f} once each. */
export function isLabelPermutation(labels: readonly string[]): boolean {
  if (labels.length !== 6) return false;
  const sorted = [...labels].sort();
  const expected = ["a", "b", "c", "d", "e", "f"];
  return sorted.every((l, i) => l === expected[i]);
}

export function labelsEqual(
  a: readonly OrderingLabel[],
  b: readonly OrderingLabel[],
): boolean {
  return a.length === b.length && a.every((label, i) => label === b[i]);
}

/**
 * Compare the model's proposed order to the expected order.
 * Invalid permutations count as ambiguous.
 */
export function compareOrderingAudit(
  expected: readonly OrderingLabel[],
  actual: readonly string[],
): OrderingAuditResult {
  const parsed = orderingAuditResultSchema.safeParse({ labels: actual });
  if (!parsed.success || !isLabelPermutation(parsed.data.labels)) {
    const fallback = actual.filter(
      (l): l is OrderingLabel => orderingLabelSchema.safeParse(l).success,
    );
    return {
      ambiguous: true,
      expected: [...expected],
      actual: fallback.length === 6 ? fallback : [...expected],
    };
  }
  const actualLabels = parsed.data.labels;
  return {
    ambiguous: !labelsEqual(expected, actualLabels),
    expected: [...expected],
    actual: actualLabels,
  };
}

/** Prompt text for the blind reorder — never includes positions or rationale. */
export function buildOrderingAuditPrompt(
  sentences: readonly AuditSentence[],
): string {
  const lines = [
    "Voici six phrases mélangées, étiquetées a–f.",
    "Remets-les dans le seul ordre chronologique ou logique possible.",
    "Réponds uniquement avec la liste des six étiquettes dans cet ordre.",
    "N'explique rien.",
    "",
    ...sentences.map((s) => `${s.label}. ${s.text}`),
  ];
  return lines.join("\n");
}
