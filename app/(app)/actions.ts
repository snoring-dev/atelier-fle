"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db";
import {
  greyedCategoriesFromRecent,
  isCatalogPair,
  pickRandomTheme,
} from "@/lib/themes/catalog";

export type CreateFicheState = {
  error?: string;
};

const FREE_THEME_MAX_LENGTH = 80;

async function requireSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token);
}

export async function createFicheAction(
  _prev: CreateFicheState,
  formData: FormData,
): Promise<CreateFicheState> {
  if (!(await requireSession())) {
    return { error: "Session expirée. Reconnectez-vous." };
  }

  const mode = formData.get("mode");
  if (mode !== "catalog" && mode !== "random" && mode !== "free") {
    return { error: "Choix de thème invalide" };
  }

  const db = getDatabase();
  const recent = await db.fiches.listRecent(3);
  const greyed = greyedCategoriesFromRecent(recent);

  let theme: string;
  let category: string | null;

  if (mode === "catalog") {
    const t = formData.get("theme");
    const c = formData.get("category");
    if (typeof t !== "string" || typeof c !== "string") {
      return { error: "Thème ou catégorie manquant" };
    }
    if (!isCatalogPair(t, c)) {
      return { error: "Thème inconnu" };
    }
    if (greyed.has(c)) {
      return { error: "Cette catégorie a été utilisée récemment" };
    }
    theme = t;
    category = c;
  } else if (mode === "random") {
    try {
      const picked = pickRandomTheme(greyed);
      theme = picked.theme;
      category = picked.category;
    } catch {
      return { error: "Aucune catégorie disponible pour un tirage au hasard" };
    }
  } else {
    const raw = formData.get("theme");
    if (typeof raw !== "string") {
      return { error: "Thème manquant" };
    }
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      return { error: "Indiquez un thème" };
    }
    if (trimmed.length > FREE_THEME_MAX_LENGTH) {
      return {
        error: `Le thème ne doit pas dépasser ${FREE_THEME_MAX_LENGTH} caractères`,
      };
    }
    theme = trimmed;
    category = null;
  }

  const fiche = await db.fiches.create({ theme, category });
  redirect(`/fiches/${fiche.numero}`);
}
