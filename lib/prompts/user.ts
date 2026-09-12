export type BuildFicheUserPromptInput = {
  theme: string;
  category: string | null;
  /** Words to reinject (US-7.1). Empty for now. */
  reviewWords?: readonly string[];
};

/** Build the user message for a full worksheet generation. */
export function buildFicheUserPrompt(input: BuildFicheUserPromptInput): string {
  const { theme, category, reviewWords = [] } = input;
  const lines: string[] = [
    `Thème : ${theme}`,
    category
      ? `Catégorie : ${category}`
      : "Catégorie : (thème libre — propose une catégorie pertinente)",
  ];

  if (reviewWords.length > 0) {
    lines.push(
      "",
      "Mots déjà étudiés à réinjecter (au moins 3 dans le texte, sans les signaler) :",
      reviewWords.map((w) => `- ${w}`).join("\n"),
    );
  }

  lines.push("", "Génère la fiche complète pour ce thème.");
  return lines.join("\n");
}
