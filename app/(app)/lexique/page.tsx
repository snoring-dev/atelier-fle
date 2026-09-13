import { LexiqueScreen } from "@/components/lexique-screen";
import { getDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function LexiquePage() {
  const db = getDatabase();
  const entries = await db.lexique.list();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <LexiqueScreen entries={entries} />
    </div>
  );
}
