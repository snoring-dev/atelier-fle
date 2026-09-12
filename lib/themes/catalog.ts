export type ThemeCategory = {
  name: string;
  themes: readonly [string, string, string, string, string];
};

export const THEME_CATALOG: readonly ThemeCategory[] = [
  {
    name: "Vie quotidienne",
    themes: [
      "Faire les courses",
      "Chercher un logement",
      "Chez le voisin",
      "Démarches administratives",
      "Objets du quotidien",
    ],
  },
  {
    name: "Alimentation",
    themes: [
      "Au marché",
      "Au restaurant",
      "Une recette simple",
      "Régimes et habitudes",
      "Inviter à dîner",
    ],
  },
  {
    name: "Santé",
    themes: [
      "Chez le médecin",
      "À la pharmacie",
      "Faire du sport",
      "Se sentir mieux",
      "Urgences",
    ],
  },
  {
    name: "Travail",
    themes: [
      "Une journée au bureau",
      "Parler avec les collègues",
      "Chercher un emploi",
      "Horaires et congés",
      "Une formation",
    ],
  },
  {
    name: "Transports",
    themes: ["Bus et métro", "En train", "À vélo", "En voiture", "Un voyage"],
  },
  {
    name: "Famille et relations",
    themes: [
      "La famille",
      "Les amis",
      "Un anniversaire",
      "Vivre à deux",
      "Rendre visite",
    ],
  },
  {
    name: "Loisirs",
    themes: [
      "Au cinéma",
      "Lire un livre",
      "Écouter de la musique",
      "Une randonnée",
      "Un jeu",
    ],
  },
  {
    name: "Ville et services",
    themes: [
      "À la mairie",
      "À la banque",
      "La poste",
      "L'école",
      "La bibliothèque",
    ],
  },
  {
    name: "Numérique",
    themes: [
      "Le smartphone",
      "Sur internet",
      "Les réseaux sociaux",
      "Les actualités",
      "Photos et vidéos",
    ],
  },
  {
    name: "Nature et environnement",
    themes: [
      "La météo",
      "Au jardin",
      "Les animaux",
      "Trier les déchets",
      "Une promenade",
    ],
  },
] as const;

export type CatalogPair = {
  theme: string;
  category: string;
};

/** True if theme belongs to the given catalog category. */
export function isCatalogPair(theme: string, category: string): boolean {
  const entry = THEME_CATALOG.find((c) => c.name === category);
  return (
    entry !== undefined && (entry.themes as readonly string[]).includes(theme)
  );
}

/**
 * Categories to grey out: unique non-null categories among the last N fiches.
 * Free-text fiches (null category) count toward N but do not grey a column.
 */
export function greyedCategoriesFromRecent(
  recent: ReadonlyArray<{ category: string | null }>,
): Set<string> {
  const greyed = new Set<string>();
  for (const fiche of recent) {
    if (fiche.category) {
      greyed.add(fiche.category);
    }
  }
  return greyed;
}

/** All catalog themes whose category is not in `excluded`. */
export function eligibleThemes(excluded: ReadonlySet<string>): CatalogPair[] {
  const result: CatalogPair[] = [];
  for (const cat of THEME_CATALOG) {
    if (excluded.has(cat.name)) continue;
    for (const theme of cat.themes) {
      result.push({ theme, category: cat.name });
    }
  }
  return result;
}

/** Uniform random pick among eligible catalog themes. */
export function pickRandomTheme(excluded: ReadonlySet<string>): CatalogPair {
  const pool = eligibleThemes(excluded);
  if (pool.length === 0) {
    throw new Error("Aucune catégorie disponible pour un tirage au hasard");
  }
  const picked = pool[Math.floor(Math.random() * pool.length)];
  if (!picked) {
    throw new Error("Aucune catégorie disponible pour un tirage au hasard");
  }
  return picked;
}
