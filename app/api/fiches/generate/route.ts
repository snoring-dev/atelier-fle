import { cookies } from "next/headers";
import { ficheStreamResponse, streamFiche } from "@/lib/ai";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db";
import { PROMPT_VERSION } from "@/lib/prompts";

export const maxDuration = 30;

async function requireSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token);
}

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

  if (!fiche.theme) {
    return new Response("Thème manquant sur la fiche", { status: 400 });
  }

  const result = streamFiche({
    theme: fiche.theme,
    category: fiche.category,
    reviewWords: [],
  });

  // Persist the completed object once the stream finishes (US-2.2).
  // Partials are not saved here (US-2.3).
  void Promise.resolve(result.output)
    .then(async (object) => {
      await db.fiches.saveDraft({
        numero,
        payload: JSON.stringify(object),
        promptVersion: PROMPT_VERSION,
      });
    })
    .catch((err: unknown) => {
      console.error("Failed to save fiche draft after generation:", err);
    });

  return ficheStreamResponse(result);
}
