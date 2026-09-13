import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  createTextStreamResponse,
  generateText,
  Output,
  streamText,
  toTextStream,
} from "ai";
import type { AuditSentence } from "@/lib/checks/audit";
import {
  buildFicheSectionUserPrompt,
  buildFicheUserPrompt,
  buildOrderingAuditUserPrompt,
  ORDERING_AUDIT_SYSTEM_PROMPT,
  SYSTEM_PROMPT,
} from "@/lib/prompts";
import {
  type FichePayload,
  type FicheSection,
  ficheSchema,
  orderingAuditResultSchema,
  orderingSectionSchema,
  questionsSectionSchema,
  textSectionSchema,
} from "@/lib/schemas";
import { getModelId, getOpenRouterApiKey } from "./env";
import { costFromStreamResult } from "./usage";

const TEMPERATURE = 0.8;
const AUDIT_TEMPERATURE = 0;

/** OpenRouter model options: request usage accounting for billed cost. */
const MODEL_USAGE = { usage: { include: true } } as const;

export type StreamFicheInput = {
  theme: string;
  category: string | null;
  /** Lexicon reinjection (US-7.1). Pass [] until then. */
  reviewWords?: readonly string[];
};

export type StreamFicheSectionInput = {
  section: FicheSection;
  payload: FichePayload;
  /** Lexicon reinjection (US-7.1). Pass [] until then. */
  reviewWords?: readonly string[];
};

type StreamResult = ReturnType<typeof streamText>;

function createModel() {
  const openrouter = createOpenRouter({
    apiKey: getOpenRouterApiKey(),
  });
  return openrouter(getModelId(), MODEL_USAGE);
}

/**
 * Stream a full worksheet object via OpenRouter.
 * Callers get the SDK result: stream to the client, await `output` to persist.
 */
export function streamFiche(input: StreamFicheInput) {
  return streamText({
    model: createModel(),
    temperature: TEMPERATURE,
    system: SYSTEM_PROMPT,
    prompt: buildFicheUserPrompt({
      theme: input.theme,
      category: input.category,
      reviewWords: input.reviewWords ?? [],
    }),
    output: Output.object({
      schema: ficheSchema,
      name: "FicheFLE",
      description:
        "Fiche d'exercices FLE A2+/B1 : texte, vocabulaire, questions, remise en ordre",
    }),
  });
}

/**
 * Stream one section of an existing worksheet via OpenRouter.
 * Schema is a Zod `.pick()` of ficheSchema; the rest of the fiche is prompt context.
 */
export function streamFicheSection(input: StreamFicheSectionInput) {
  const prompt = buildFicheSectionUserPrompt({
    section: input.section,
    payload: input.payload,
    reviewWords: input.reviewWords ?? [],
  });

  const common = {
    model: createModel(),
    temperature: TEMPERATURE,
    system: SYSTEM_PROMPT,
    prompt,
  } as const;

  switch (input.section) {
    case "text":
      return streamText({
        ...common,
        output: Output.object({
          schema: textSectionSchema,
          name: "FicheFLE_text",
          description: "Texte seul de la fiche FLE (150–200 mots)",
        }),
      });
    case "questions":
      return streamText({
        ...common,
        output: Output.object({
          schema: questionsSectionSchema,
          name: "FicheFLE_questions",
          description: "Six questions de compréhension pour la fiche FLE",
        }),
      });
    case "ordering":
      return streamText({
        ...common,
        output: Output.object({
          schema: orderingSectionSchema,
          name: "FicheFLE_ordering",
          description: "Exercice de remise en ordre pour la fiche FLE",
        }),
      });
  }
}

/** Convert a streamFiche / streamFicheSection result into an HTTP text stream for useObject. */
export function ficheStreamResponse(result: StreamResult): Response {
  return createTextStreamResponse({
    stream: toTextStream({ stream: result.stream }),
  });
}

/**
 * Blind reorder of shuffled ordering sentences (US-5.2).
 * Temperature 0; never receives positions or rationale.
 * Also returns billed USD when OpenRouter reports it (null if unavailable).
 */
export async function auditOrderingSentences(
  sentences: readonly AuditSentence[],
): Promise<{ labels: string[]; costUsd: number | null }> {
  const result = await generateText({
    model: createModel(),
    temperature: AUDIT_TEMPERATURE,
    system: ORDERING_AUDIT_SYSTEM_PROMPT,
    prompt: buildOrderingAuditUserPrompt(sentences),
    output: Output.object({
      schema: orderingAuditResultSchema,
      name: "OrderingAudit",
      description: "Ordre unique des six phrases (étiquettes a–f)",
    }),
  });

  if (!result.output) {
    throw new Error("Audit ordering: empty model output");
  }

  const costUsd = await costFromStreamResult(result);
  return { labels: result.output.labels, costUsd };
}
