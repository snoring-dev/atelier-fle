import { ArchiveScreen } from "@/components/archive-screen";
import { getDatabase } from "@/lib/db";
import { parsePayload } from "@/lib/schemas";

export const dynamic = "force-dynamic";

function formatDateLabel(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default async function ArchivePage() {
  const db = getDatabase();
  const fiches = await db.fiches.list();

  const rows = fiches.map((fiche) => ({
    numero: fiche.numero,
    status: fiche.status,
    theme: fiche.theme,
    title: parsePayload(fiche.payload)?.title?.trim() || "Sans titre",
    dateLabel: formatDateLabel(fiche.createdAt),
    hasPayload: fiche.payload != null && fiche.payload.length > 0,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <ArchiveScreen fiches={rows} />
    </div>
  );
}
