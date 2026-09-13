import { verifyPrintToken } from "@/lib/auth/print-token";
import { requireSession } from "@/lib/auth/require-session";
import { getDatabase } from "@/lib/db";
import { readIllustration } from "@/lib/media/storage";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string; imageId: string }>;
};

async function authorize(req: Request, numero: number): Promise<boolean> {
  if (await requireSession()) return true;
  const token = new URL(req.url).searchParams.get("t");
  return Boolean(token && (await verifyPrintToken(token, numero)));
}

export async function GET(req: Request, context: RouteContext) {
  const { id, imageId } = await context.params;
  const numero = Number(id);
  const imgId = Number(imageId);
  if (!Number.isFinite(numero) || !Number.isFinite(imgId)) {
    return new Response("Identifiant invalide", { status: 400 });
  }

  if (!(await authorize(req, numero))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const row = await getDatabase().images.getById(numero, imgId);
  if (!row) {
    return new Response("Image introuvable", { status: 404 });
  }

  let bytes: Buffer;
  try {
    bytes = await readIllustration(row.path);
  } catch (err: unknown) {
    console.error("Media read failed:", err);
    return new Response("Fichier introuvable", { status: 404 });
  }

  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, no-store",
    },
  });
}

export async function PATCH(req: Request, context: RouteContext) {
  if (!(await requireSession())) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id, imageId } = await context.params;
  const numero = Number(id);
  const imgId = Number(imageId);
  if (!Number.isFinite(numero) || !Number.isFinite(imgId)) {
    return new Response("Identifiant invalide", { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  if (
    typeof body !== "object" ||
    body === null ||
    (body as { retenue?: unknown }).retenue !== true
  ) {
    return new Response("Corps invalide", { status: 400 });
  }

  try {
    const updated = await getDatabase().images.markRetenue(numero, imgId);
    return Response.json({
      id: updated.id,
      url: `/api/fiches/${numero}/images/${updated.id}`,
      retenue: updated.retenue,
    });
  } catch {
    return new Response("Image introuvable", { status: 404 });
  }
}
