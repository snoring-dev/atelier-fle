import { Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { FicheStream } from "@/components/fiche-stream";
import { getDatabase } from "@/lib/db";
import { parsePayload } from "@/lib/schemas";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

type FichePageProps = {
  params: Promise<{ id: string }>;
};

function formatDateLabel(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
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
    <div className={`${inter.className} px-4 py-6 text-[14px]`}>
      <FicheStream
        numero={fiche.numero}
        theme={fiche.theme}
        category={fiche.category}
        status={fiche.status}
        dateLabel={formatDateLabel(fiche.createdAt)}
        promptVersion={fiche.promptVersion}
        initialPayload={initialPayload}
      />
    </div>
  );
}
