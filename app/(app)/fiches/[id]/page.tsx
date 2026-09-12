import { notFound } from "next/navigation";
import { FicheStream } from "@/components/fiche-stream";
import { getDatabase } from "@/lib/db";
import { type FichePayload, ficheSchema } from "@/lib/schemas";

type FichePageProps = {
  params: Promise<{ id: string }>;
};

function parsePayload(raw: string | null): FichePayload | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    const result = ficheSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export default async function FichePage({ params }: FichePageProps) {
  const { id } = await params;
  const numero = Number(id);
  if (!Number.isFinite(numero) || numero < 1) {
    notFound();
  }

  const fiche = await getDatabase().fiches.getByNumero(numero);
  if (!fiche) {
    notFound();
  }

  const initialPayload = parsePayload(fiche.payload);

  return (
    <FicheStream
      numero={fiche.numero}
      theme={fiche.theme}
      category={fiche.category}
      status={fiche.status}
      initialPayload={initialPayload}
    />
  );
}
