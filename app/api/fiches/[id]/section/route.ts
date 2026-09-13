import { after } from "next/server";
import { ficheStreamResponse, streamFicheSection } from "@/lib/ai";
import { requireSession } from "@/lib/auth/require-session";
import { getDatabase } from "@/lib/db";
import { PROMPT_VERSION } from "@/lib/prompts";
import { ficheSchema, ficheSectionSchema } from "@/lib/schemas";

export const maxDuration = 30;

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: Request, context: RouteContext) {
  if (!(await requireSession())) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await context.params;
  const numero = Number(id);
  if (!Number.isFinite(numero) || numero < 1) {
    return new Response("Identifiant invalide", { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return new Response("Corps invalide", { status: 400 });
  }

  const sectionResult = ficheSectionSchema.safeParse(
    (body as { section?: unknown }).section,
  );
  if (!sectionResult.success) {
    return new Response("section manquante ou invalide", { status: 400 });
  }

  const payloadResult = ficheSchema.safeParse(
    (body as { payload?: unknown }).payload,
  );
  if (!payloadResult.success) {
    return new Response("payload manquant ou invalide", { status: 400 });
  }

  const section = sectionResult.data;
  const payload = payloadResult.data;

  const db = getDatabase();
  const fiche = await db.fiches.getByNumero(numero);
  if (!fiche) {
    return new Response("Fiche introuvable", { status: 404 });
  }

  if (fiche.status === "validee") {
    return new Response("Fiche déjà validée", { status: 409 });
  }

  const result = streamFicheSection({
    section,
    payload,
    reviewWords: [],
  });

  // Keep the model stream draining if the client aborts (tab close / Stop).
  // Do not forward req.signal — that would cancel persist on disconnect.
  void result.consumeStream();

  // Persist the merged object after the response finishes (US-4.2).
  after(async () => {
    try {
      const partial = await result.output;
      const merged = ficheSchema.parse({ ...payload, ...partial });
      await db.fiches.saveDraft({
        numero,
        payload: JSON.stringify(merged),
        promptVersion: PROMPT_VERSION,
      });
    } catch (err: unknown) {
      console.error("Failed to save fiche draft after section regen:", err);
    }
  });

  return ficheStreamResponse(result);
}
