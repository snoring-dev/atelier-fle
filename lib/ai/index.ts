import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createTextStreamResponse, Output, streamText, toTextStream } from "ai";
import { buildFicheUserPrompt, SYSTEM_PROMPT } from "@/lib/prompts";
import { ficheSchema } from "@/lib/schemas";
import { getModelId, getOpenRouterApiKey } from "./env";

const TEMPERATURE = 0.8;

export type StreamFicheInput = {
  theme: string;
  category: string | null;
  /** Lexicon reinjection (US-7.1). Pass [] until then. */
  reviewWords?: readonly string[];
};

/**
 * Stream a full worksheet object via OpenRouter.
 * Callers get the SDK result: stream to the client, await `output` to persist.
 */
export function streamFiche(input: StreamFicheInput) {
  const openrouter = createOpenRouter({
    apiKey: getOpenRouterApiKey(),
  });

  return streamText({
    model: openrouter(getModelId()),
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

/** Convert a streamFiche result into an HTTP text stream for useObject. */
export function ficheStreamResponse(
  result: ReturnType<typeof streamFiche>,
): Response {
  return createTextStreamResponse({
    stream: toTextStream({ stream: result.stream }),
  });
}
