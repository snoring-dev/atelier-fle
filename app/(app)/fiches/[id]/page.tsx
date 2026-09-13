import { Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { FicheStream } from "@/components/fiche-stream";
import { ensureReviewWords, getDatabase } from "@/lib/db";
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

  const db = getDatabase();
  const fiche = await db.fiches.getByNumero(numero);
  if (!fiche) {
    notFound();
  }

  const initialPayload = parsePayload(fiche.payload);
  // Draw (or reuse) review words once the page loads so the Révision pill
  // matches what generate / text regen inject into the prompt.
  const reviewWords = await ensureReviewWords(db, fiche);

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
        reviewWords={reviewWords}
      />
    </div>
  );
}
