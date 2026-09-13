import type { FichePayload, FicheSection } from "@/lib/schemas";

type PartialQuestion = Partial<{
  type: FichePayload["questions"][number]["type"];
  prompt: string;
  answer: string;
  hints: Array<string | undefined>;
}>;

type PartialSentence = Partial<{
  label: FichePayload["ordering"]["sentences"][number]["label"];
  text: string;
  position: number;
}>;

export type SectionPartial = {
  text?: string;
  questions?: Array<PartialQuestion | undefined>;
  ordering?: {
    sentences?: Array<PartialSentence | undefined>;
    rationale?: string;
  };
};

/**
 * Overlay a streaming section partial onto a full fiche without shrinking
 * arrays: keep previous slots until the new one has content.
 */
export function mergeSectionPartial(
  base: FichePayload,
  section: FicheSection,
  partial: SectionPartial | undefined,
): FichePayload {
  if (!partial) return base;

  if (section === "text") {
    return {
      ...base,
      text: typeof partial.text === "string" ? partial.text : base.text,
    };
  }

  if (section === "questions") {
    if (!partial.questions) return base;
    const questions = base.questions.map((q, i) => {
      const p = partial.questions?.[i];
      if (!p) return q;
      const hints =
        p.hints && p.hints.length > 0
          ? p.hints.map((h, hi) =>
              typeof h === "string" ? h : (q.hints[hi] ?? ""),
            )
          : q.hints;
      return {
        type: p.type ?? q.type,
        prompt: typeof p.prompt === "string" ? p.prompt : q.prompt,
        answer: typeof p.answer === "string" ? p.answer : q.answer,
        hints,
      };
    });
    return { ...base, questions };
  }

  if (!partial.ordering) return base;
  const partialSentences = partial.ordering.sentences ?? [];
  const candidateLabels = partialSentences.map((p) => p?.label);
  const labelsComplete =
    candidateLabels.length === 6 &&
    candidateLabels.every((l) => typeof l === "string") &&
    new Set(candidateLabels).size === 6;

  const sentences = base.ordering.sentences.map((s, i) => {
    const p = partialSentences[i];
    if (!p) return s;
    return {
      // Keep slot labels stable until the full unique a–f set arrives —
      // mid-stream label reshuffles collide on preview keys.
      label: labelsComplete && p.label ? p.label : s.label,
      text: typeof p.text === "string" ? p.text : s.text,
      position:
        typeof p.position === "number" && Number.isFinite(p.position)
          ? p.position
          : s.position,
    };
  });
  return {
    ...base,
    ordering: {
      sentences,
      rationale:
        typeof partial.ordering.rationale === "string"
          ? partial.ordering.rationale
          : base.ordering.rationale,
    },
  };
}
