import { ThemePicker } from "@/components/theme-picker";
import { getDatabase } from "@/lib/db";
import { greyedCategoriesFromRecent } from "@/lib/themes/catalog";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const db = getDatabase();
  const recent = await db.fiches.listRecent(3);
  const greyed = [...greyedCategoriesFromRecent(recent)];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <ThemePicker greyedCategories={greyed} />
    </div>
  );
}
