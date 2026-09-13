import { after } from "next/server";
import { ficheStreamResponse, streamFiche } from "@/lib/ai";
import { requireSession } from "@/lib/auth/require-session";
import { ensureReviewWords, getDatabase } from "@/lib/db";
import { PROMPT_VERSION } from "@/lib/prompts";

export const maxDuration = 30;

export async function POST(req: Request) {
  if (!(await requireSession())) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const numero =
    typeof body === "object" &&
    body !== null &&
    "numero" in body &&
    typeof (body as { numero: unknown }).numero === "number"
      ? (body as { numero: number }).numero
      : NaN;

  if (!Number.isFinite(numero) || numero < 1) {
    return new Response("numero manquant ou invalide", { status: 400 });
  }

  const db = getDatabase();
  const fiche = await db.fiches.getByNumero(numero);
  if (!fiche) {
    return new Response("Fiche introuvable", { status: 404 });
  }

  if (fiche.status === "validee") {
    return new Response("Fiche déjà validée", { status: 409 });
  }

  if (!fiche.theme) {
    return new Response("Thème manquant sur la fiche", { status: 400 });
  }

  const reviewWords = await ensureReviewWords(db, fiche);

  const result = streamFiche({
    theme: fiche.theme,
    category: fiche.category,
    reviewWords,
  });

  // Keep the model stream draining if the client aborts (tab close / Stop).
  // Do not forward req.signal — that would cancel persist on disconnect.
  void result.consumeStream();

  // Persist the completed object after the response finishes (US-2.3).
  // Partials are not saved — only a schema-valid object from result.output.
  after(async () => {
    try {
      const object = await result.output;
      await db.fiches.saveDraft({
        numero,
        payload: JSON.stringify(object),
        promptVersion: PROMPT_VERSION,
      });
    } catch (err: unknown) {
      console.error("Failed to save fiche draft after generation:", err);
    }
  });

  return ficheStreamResponse(result);
}
