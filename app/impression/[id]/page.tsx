import { notFound } from "next/navigation";
import { verifyPrintToken } from "@/lib/auth/print-token";

type ImpressionPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
};

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

  // Placeholder until US-3.1 renders the A4 worksheet.
  return (
    <main className="p-8">
      <p>Impression {ficheId}</p>
    </main>
  );
}
