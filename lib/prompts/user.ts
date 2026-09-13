import type { FichePayload, FicheSection } from "@/lib/schemas";

export type BuildFicheUserPromptInput = {
  theme: string;
  category: string | null;
  /** Words to reinject (US-7.1). Empty for now. */
  reviewWords?: readonly string[];
};

export type BuildFicheSectionUserPromptInput = {
  section: FicheSection;
  payload: FichePayload;
  /** Words to reinject (US-7.1). Empty for now. */
  reviewWords?: readonly string[];
};

function formatReviewWords(reviewWords: readonly string[]): string[] {
  if (reviewWords.length === 0) return [];
  return [
    "",
    "Mots déjà étudiés à réinjecter (au moins 3 dans le texte, sans les signaler) :",
    reviewWords.map((w) => `- ${w}`).join("\n"),
  ];
}

/** Build the user message for a full worksheet generation. */
export function buildFicheUserPrompt(input: BuildFicheUserPromptInput): string {
  const { theme, category, reviewWords = [] } = input;
  const lines: string[] = [
    `Thème : ${theme}`,
    category
      ? `Catégorie : ${category}`
      : "Catégorie : (thème libre — propose une catégorie pertinente)",
  ];

  lines.push(...formatReviewWords(reviewWords));
  lines.push("", "Génère la fiche complète pour ce thème.");
  return lines.join("\n");
}

/** Build the user message for regenerating one section of an existing fiche. */
export function buildFicheSectionUserPrompt(
  input: BuildFicheSectionUserPromptInput,
): string {
  const { section, payload, reviewWords = [] } = input;

  if (section === "text") {
    const lines: string[] = [
      `Thème : ${payload.theme}`,
      `Catégorie : ${payload.category}`,
      "",
      "Contexte — vocabulaire actuel (à conserver, ne pas le régénérer) :",
      ...payload.vocabulary.map(
        (v, i) => `${i + 1}. ${v.term} — ${v.definition}`,
      ),
      ...formatReviewWords(reviewWords),
      "",
      "Produis uniquement un nouveau champ `text` (150 à 200 mots) pour ce thème.",
      "Ne change pas le thème. Ne produis pas les questions, le vocabulaire ni la remise en ordre.",
    ];
    return lines.join("\n");
  }

  if (section === "questions") {
    return [
      `Thème : ${payload.theme}`,
      `Catégorie : ${payload.category}`,
      "",
      "Voici le texte actuel de la fiche (y compris toute édition manuelle). Base-toi exclusivement dessus :",
      "---",
      payload.text,
      "---",
      "",
      "Produis uniquement les six questions (`questions`) dans cet ordre de types : litterale, litterale, inference, inference, contexte, opinion.",
      "Ne produis pas le texte, le vocabulaire ni la remise en ordre.",
    ].join("\n");
  }

  return [
    `Thème du texte principal : ${payload.theme}`,
    `Catégorie : ${payload.category}`,
    "",
    "Voici le texte principal (pour le niveau et le registre uniquement — la remise en ordre doit porter sur un thème DIFFÉRENT) :",
    "---",
    payload.text,
    "---",
    "",
    "Produis uniquement le champ `ordering` : 6 phrases mélangées (labels a–f) + `rationale`.",
    "Thème différent du texte. Un seul ordre correct. Marqueurs temporels ou logiques dans chaque phrase.",
    "Ne produis pas le texte, le vocabulaire ni les questions.",
  ].join("\n");
}
