import type { FichePayload, QuestionType } from "@/lib/schemas";
import { hasLogicalMarker } from "./markers";

export type CheckStatus = "ok" | "warn" | "neutral";

export type CheckId =
  | "textLength"
  | "questionTypes"
  | "markers"
  | "positions"
  | "reviewWords"
  | "vocabulary"
  | "overflow"
  | "orderingAmbiguity";

export type CheckResult = {
  id: CheckId;
  status: CheckStatus;
  /** Short French label for the pill. */
  label: string;
  /** Hover explanation — set for amber (warn) pills. */
  detail?: string;
};

export type EvaluateFicheChecksInput = {
  payload: FichePayload;
  /** Review words injected at generation (US-7.1). Empty → neutral. */
  reviewWords?: readonly string[];
  /** Overflowing page from the live preview, or null if none. */
  overflowPage?: 1 | 2 | 3 | null;
  /**
   * Ordering ambiguity audit (US-5.2).
   * `null` / omitted → pending/failed (neutral). `true` → warn. `false` → ok.
   */
  orderingAmbiguous?: boolean | null;
  /** Model's proposed label order — shown in the amber tooltip. */
  orderingAuditActual?: readonly string[] | null;
};

const EXPECTED_TYPES: readonly QuestionType[] = [
  "litterale",
  "litterale",
  "inference",
  "inference",
  "contexte",
  "opinion",
];

const TEXT_MIN = 140;
const TEXT_MAX = 210;

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

function normalizeForMatch(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/** Case- and accent-insensitive substring match of `needle` in `haystack`. */
export function textContainsTerm(haystack: string, needle: string): boolean {
  const n = needle.trim();
  if (!n) return false;
  return normalizeForMatch(haystack).includes(normalizeForMatch(n));
}

export function isExactPermutation(positions: readonly number[]): boolean {
  if (positions.length !== 6) return false;
  const sorted = [...positions].sort((a, b) => a - b);
  return sorted.every((p, i) => p === i + 1);
}

export function evaluateFicheChecks(
  input: EvaluateFicheChecksInput,
): CheckResult[] {
  const {
    payload,
    reviewWords = [],
    overflowPage = null,
    orderingAmbiguous = null,
    orderingAuditActual = null,
  } = input;
  const results: CheckResult[] = [];

  // textLength
  const wordCount = countWords(payload.text);
  const textOk = wordCount >= TEXT_MIN && wordCount <= TEXT_MAX;
  results.push({
    id: "textLength",
    status: textOk ? "ok" : "warn",
    label: "Texte",
    detail: textOk
      ? undefined
      : `Texte : ${wordCount} mots (attendu ${TEXT_MIN}–${TEXT_MAX})`,
  });

  // questionTypes
  const types = payload.questions.map((q) => q.type);
  const typesOk =
    types.length === EXPECTED_TYPES.length &&
    types.every((t, i) => t === EXPECTED_TYPES[i]);
  results.push({
    id: "questionTypes",
    status: typesOk ? "ok" : "warn",
    label: "Questions",
    detail: typesOk
      ? undefined
      : `Types : ${types.join(", ") || "(vide)"} (attendu litterale ×2, inference ×2, contexte, opinion)`,
  });

  // markers
  const markerHits = payload.ordering.sentences.filter((s) =>
    hasLogicalMarker(s.text),
  ).length;
  const markersOk = markerHits === 6;
  results.push({
    id: "markers",
    status: markersOk ? "ok" : "warn",
    label: "Marqueurs",
    detail: markersOk ? undefined : `Marqueurs : ${markerHits}/6 phrases`,
  });

  // positions
  const positions = payload.ordering.sentences.map((s) => s.position);
  const positionsOk = isExactPermutation(positions);
  results.push({
    id: "positions",
    status: positionsOk ? "ok" : "warn",
    label: "Positions",
    detail: positionsOk ? undefined : "Positions : permutation incomplète",
  });

  // reviewWords
  if (reviewWords.length === 0) {
    results.push({
      id: "reviewWords",
      status: "neutral",
      label: "Révision",
    });
  } else {
    const found = reviewWords.filter((w) =>
      textContainsTerm(payload.text, w),
    ).length;
    const reviewOk = found >= 3;
    results.push({
      id: "reviewWords",
      status: reviewOk ? "ok" : "warn",
      label: "Révision",
      detail: reviewOk ? undefined : `Révision : ${found}/3 mots retrouvés`,
    });
  }

  // vocabulary
  const vocabMissing = payload.vocabulary.filter(
    (item) => !textContainsTerm(payload.text, item.term),
  ).length;
  const vocabOk = vocabMissing === 0 && payload.vocabulary.length === 6;
  results.push({
    id: "vocabulary",
    status: vocabOk ? "ok" : "warn",
    label: "Vocabulaire",
    detail: vocabOk
      ? undefined
      : `Vocabulaire : ${vocabMissing}/6 mots absents du texte`,
  });

  // overflow
  const overflowOk = overflowPage === null;
  results.push({
    id: "overflow",
    status: overflowOk ? "ok" : "warn",
    label: "Pages",
    detail: overflowOk
      ? undefined
      : `Débordement : un bloc dépasse la page ${overflowPage}`,
  });

  // orderingAmbiguity (US-5.2)
  if (orderingAmbiguous === null) {
    results.push({
      id: "orderingAmbiguity",
      status: "neutral",
      label: "Ordre",
    });
  } else if (orderingAmbiguous) {
    const orderHint =
      orderingAuditActual && orderingAuditActual.length > 0
        ? orderingAuditActual.join("-")
        : null;
    results.push({
      id: "orderingAmbiguity",
      status: "warn",
      label: "ordre ambigu",
      detail: orderHint
        ? `L'audit propose un autre ordre : ${orderHint}`
        : "L'audit propose un autre ordre",
    });
  } else {
    results.push({
      id: "orderingAmbiguity",
      status: "ok",
      label: "Ordre",
    });
  }

  return results;
}
