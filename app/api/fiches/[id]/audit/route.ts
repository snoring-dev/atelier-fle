import { auditOrderingSentences } from "@/lib/ai";
import { requireSession } from "@/lib/auth/require-session";
import {
  compareOrderingAudit,
  expectedLabelOrder,
  prepareAuditSentences,
} from "@/lib/checks";
import { getDatabase } from "@/lib/db";
import { ficheSchema } from "@/lib/schemas";

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

  const payloadResult = ficheSchema.safeParse(
    (body as { payload?: unknown }).payload,
  );
  if (!payloadResult.success) {
    return new Response("payload manquant ou invalide", { status: 400 });
  }

  const db = getDatabase();
  const fiche = await db.fiches.getByNumero(numero);
  if (!fiche) {
    return new Response("Fiche introuvable", { status: 404 });
  }

  const payload = payloadResult.data;
  const expected = expectedLabelOrder(payload.ordering.sentences);
  const shuffled = prepareAuditSentences(payload.ordering.sentences);

  try {
    const { labels } = await auditOrderingSentences(shuffled);
    const result = compareOrderingAudit(expected, labels);
    return Response.json(result);
  } catch (err: unknown) {
    console.error("Ordering audit failed:", err);
    return new Response("Échec de l'audit d'ordre", { status: 502 });
  }
}
