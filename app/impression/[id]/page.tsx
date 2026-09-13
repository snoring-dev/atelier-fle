import { notFound } from "next/navigation";
import { WorksheetDocument } from "@/components/print/worksheet-document";
import { verifyPrintToken } from "@/lib/auth/print-token";
import { getDatabase } from "@/lib/db";
import { parsePayload } from "@/lib/schemas";

type ImpressionPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
};

function formatDateLabel(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default async function ImpressionPage({
  params,
  searchParams,
}: ImpressionPageProps) {
  const { id } = await params;
  const { t } = await searchParams;
  const ficheId = Number(id);

  if (
    !Number.isFinite(ficheId) ||
    !t ||
    !(await verifyPrintToken(t, ficheId))
  ) {
    notFound();
  }

  const fiche = await getDatabase().fiches.getByNumero(ficheId);
  if (!fiche) {
    notFound();
  }

  const payload = parsePayload(fiche.payload);
  if (!payload) {
    notFound();
  }

  const retenue = await getDatabase().images.getRetenue(fiche.numero);
  const illustrationSrc = retenue
    ? `/api/fiches/${fiche.numero}/images/${retenue.id}?t=${encodeURIComponent(t)}`
    : null;

  return (
    <WorksheetDocument
      payload={payload}
      numero={fiche.numero}
      theme={fiche.theme}
      dateLabel={formatDateLabel(fiche.createdAt)}
      illustrationSrc={illustrationSrc}
    />
  );
}
