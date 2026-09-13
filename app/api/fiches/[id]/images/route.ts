import { generateFicheIllustrations } from "@/lib/ai/image";
import { usdToMicros } from "@/lib/ai/usage";
import { requireSession } from "@/lib/auth/require-session";
import { getDatabase } from "@/lib/db";
import { deleteIllustration, saveIllustration } from "@/lib/media/storage";
import { parsePayload } from "@/lib/schemas";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type RouteContext = {
  params: Promise<{ id: string }>;
};

function urlFor(numero: number, id: number): string {
  return `/api/fiches/${numero}/images/${id}`;
}

export async function GET(_req: Request, context: RouteContext) {
  if (!(await requireSession())) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await context.params;
  const numero = Number(id);
  if (!Number.isFinite(numero) || numero < 1) {
    return new Response("Identifiant invalide", { status: 400 });
  }

  const images = await getDatabase().images.listByFiche(numero);
  return Response.json({
    images: images.map((img) => ({
      id: img.id,
      url: urlFor(numero, img.id),
      retenue: img.retenue,
    })),
  });
}

export async function POST(_req: Request, context: RouteContext) {
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
  if (fiche.status === "validee") {
    return new Response("Fiche déjà validée", { status: 409 });
  }

  const payload = parsePayload(fiche.payload);
  if (!payload) {
    return new Response("Fiche sans contenu", { status: 409 });
  }
  const description = payload.illustration.description?.trim();
  if (!description) {
    return new Response("Description d'illustration manquante", {
      status: 400,
    });
  }

  // Rerun: drop previous set on disk + DB (archive reuse is out-of-scope for US-6.1).
  const previous = await db.images.deleteByFiche(numero);
  await Promise.all(previous.map((row) => deleteIllustration(row.path)));

  let images: Awaited<ReturnType<typeof generateFicheIllustrations>>["images"];
  let totalCostUsd: number;
  try {
    ({ images, totalCostUsd } = await generateFicheIllustrations(description));
  } catch (err: unknown) {
    console.error("Image generation failed:", err);
    const detail = err instanceof Error ? err.message : "";
    return new Response(
      detail
        ? `Génération d'illustration impossible. ${detail}`
        : "Génération d'illustration impossible",
      { status: 502 },
    );
  }

  const paths = await Promise.all(
    images.map((img) => saveIllustration(numero, img.bytes)),
  );
  const rows = await db.images.createMany(numero, paths);

  if (totalCostUsd > 0) {
    try {
      await db.fiches.addUsage(numero, {
        imageMicros: usdToMicros(totalCostUsd),
      });
    } catch (err: unknown) {
      console.error("Failed to record image generation cost:", err);
    }
  }

  return Response.json({
    images: rows.map((img) => ({
      id: img.id,
      url: urlFor(numero, img.id),
      retenue: img.retenue,
    })),
  });
}
