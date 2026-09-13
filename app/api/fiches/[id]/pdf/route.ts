import { createPrintToken } from "@/lib/auth/print-token";
import { requireSession } from "@/lib/auth/require-session";
import { getDatabase } from "@/lib/db";
import { renderImpressionPdf } from "@/lib/pdf/gotenberg";
import { parsePayload } from "@/lib/schemas";

function isGotenbergUnreachable(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const cause = err.cause;
  if (typeof cause !== "object" || cause === null) return false;
  const code = "code" in cause ? String(cause.code) : "";
  return code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "ECONNRESET";
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  if (!(await requireSession())) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await context.params;
  const numero = Number(id);
  if (!Number.isFinite(numero) || numero < 1) {
    return new Response("Identifiant invalide", { status: 400 });
  }

  const db = getDatabase();
  const fiche = await db.fiches.getByNumero(numero);
  if (!fiche) {
    return new Response("Fiche introuvable", { status: 404 });
  }

  if (!parsePayload(fiche.payload)) {
    return new Response("Fiche sans contenu exportable", { status: 409 });
  }

  const printToken = await createPrintToken(numero);

  let pdf: ArrayBuffer;
  try {
    pdf = await renderImpressionPdf(numero, printToken);
  } catch (err: unknown) {
    console.error("PDF export failed:", err);
    if (isGotenbergUnreachable(err)) {
      return new Response(
        "Service PDF injoignable. Démarrez Gotenberg : docker compose up pdf -d",
        { status: 503 },
      );
    }
    return new Response("Échec de la génération PDF", { status: 502 });
  }

  await db.fiches.validate(numero);

  return new Response(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="fiche-${numero}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
