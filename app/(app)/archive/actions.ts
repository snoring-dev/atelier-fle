"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/require-session";
import { getDatabase } from "@/lib/db";
import { readIllustration, saveIllustration } from "@/lib/media/storage";

export type DuplicateFicheResult = {
  error?: string;
};

/**
 * Best-effort copy of illustration files from source fiche to the clone.
 * Missing files are skipped; the fiche clone still succeeds.
 */
async function copyIllustrations(
  sourceNumero: number,
  targetNumero: number,
): Promise<void> {
  const db = getDatabase();
  const sourceImages = await db.images.listByFiche(sourceNumero);
  if (sourceImages.length === 0) return;

  const newPaths: string[] = [];
  let retenueIndex: number | null = null;

  for (let i = 0; i < sourceImages.length; i++) {
    const img = sourceImages[i];
    try {
      const bytes = await readIllustration(img.path);
      const path = await saveIllustration(targetNumero, bytes);
      if (img.retenue) retenueIndex = newPaths.length;
      newPaths.push(path);
    } catch {
      // Best-effort: skip missing or unreadable files.
    }
  }

  if (newPaths.length === 0) return;

  const created = await db.images.createMany(targetNumero, newPaths);
  if (retenueIndex !== null && created[retenueIndex]) {
    await db.images.markRetenue(targetNumero, created[retenueIndex].id);
  }
}

export async function duplicateFicheAction(input: {
  numero: number;
}): Promise<DuplicateFicheResult> {
  if (!(await requireSession())) {
    return { error: "Session expirée. Reconnectez-vous." };
  }

  const { numero } = input;
  if (!Number.isFinite(numero) || numero < 1) {
    return { error: "Identifiant invalide" };
  }

  const db = getDatabase();
  let clone: { numero: number };
  try {
    clone = await db.fiches.duplicate(numero);
  } catch {
    return { error: "Fiche introuvable" };
  }

  await copyIllustrations(numero, clone.numero);

  revalidatePath("/archive");
  redirect(`/fiches/${clone.numero}`);
}
