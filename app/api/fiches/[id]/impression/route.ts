import { NextResponse } from "next/server";
import { createPrintToken } from "@/lib/auth/print-token";
import { requireSession } from "@/lib/auth/require-session";
import { getDatabase } from "@/lib/db";
import { parsePayload } from "@/lib/schemas";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** Mint a print JWT and redirect to /impression/[id]?t=… (browser print fallback). */
export async function GET(_req: Request, context: RouteContext) {
  if (!(await requireSession())) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await context.params;
  const numero = Number(id);
  if (!Number.isFinite(numero) || numero < 1) {
    return new Response("Identifiant invalide", { status: 400 });
  }

  const fiche = await getDatabase().fiches.getByNumero(numero);
  if (!fiche) {
    return new Response("Fiche introuvable", { status: 404 });
  }

  if (!parsePayload(fiche.payload)) {
    return new Response("Fiche sans contenu exportable", { status: 409 });
  }

  const token = await createPrintToken(numero);
  const url = new URL(`/impression/${numero}`, _req.url);
  url.searchParams.set("t", token);
  return NextResponse.redirect(url, 302);
}
