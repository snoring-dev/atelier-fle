"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/require-session";
import { getDatabase } from "@/lib/db";

export type LexiqueActionResult = {
  error?: string;
};

function trimOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export async function updateLexiqueContent(input: {
  id: number;
  definition: string;
  exemple: string;
}): Promise<LexiqueActionResult> {
  if (!(await requireSession())) {
    return { error: "Session expirée. Reconnectez-vous." };
  }

  const { id, definition, exemple } = input;
  if (!Number.isFinite(id) || id < 1) {
    return { error: "Identifiant invalide" };
  }

  const db = getDatabase();
  const updated = await db.lexique.updateContent(id, {
    definition: trimOrNull(definition),
    exemple: trimOrNull(exemple),
  });

  if (!updated) {
    return { error: "Mot introuvable" };
  }

  revalidatePath("/lexique");
  return {};
}

export async function excludeLexiqueEntry(input: {
  id: number;
}): Promise<LexiqueActionResult> {
  if (!(await requireSession())) {
    return { error: "Session expirée. Reconnectez-vous." };
  }

  const { id } = input;
  if (!Number.isFinite(id) || id < 1) {
    return { error: "Identifiant invalide" };
  }

  const db = getDatabase();
  const updated = await db.lexique.exclude(id);

  if (!updated) {
    return { error: "Mot introuvable" };
  }

  revalidatePath("/lexique");
  return {};
}
