import { z } from "zod";

export const questionTypeSchema = z.enum([
  "litterale",
  "inference",
  "contexte",
  "opinion",
]);

export const vocabItemSchema = z.object({
  term: z.string().describe("Mot ou expression tiré du texte, sans traduction"),
  definition: z
    .string()
    .describe("Définition simple en français, 10 mots maximum"),
  example: z.string().describe("Exemple d'emploi court en français"),
});

export const questionSchema = z.object({
  type: questionTypeSchema.describe(
    "Type pédagogique : litterale, inference, contexte ou opinion",
  ),
  prompt: z.string().describe("Énoncé de la question en français"),
  answer: z
    .string()
    .describe(
      "Réponse attendue pour les questions 1–5. Vide pour la question d'opinion.",
    ),
  hints: z
    .array(z.string())
    .describe(
      "Pistes de réponse (2 ou 3) pour la question d'opinion uniquement ; tableau vide sinon",
    ),
});

export const orderingLabelSchema = z.enum(["a", "b", "c", "d", "e", "f"]);

export const orderingSentenceSchema = z.object({
  label: orderingLabelSchema.describe(
    "Étiquette affichée (a–f), ordre mélangé",
  ),
  text: z
    .string()
    .describe(
      "Phrase avec un marqueur temporel ou logique (ce jour-là, cependant, finalement…)",
    ),
  position: z
    .number()
    .int()
    .min(1)
    .max(6)
    .describe("Position correcte dans le récit (1–6), permutation unique"),
});

/** Structured output for the ordering ambiguity audit (US-5.2). */
export const orderingAuditResultSchema = z.object({
  labels: z
    .array(orderingLabelSchema)
    .length(6)
    .describe(
      "Les six étiquettes a–f dans l'ordre chronologique ou logique unique",
    ),
});

export const ficheSchema = z.object({
  title: z.string().describe("Titre court de la fiche en français"),
  theme: z.string().describe("Thème fourni par l'utilisateur"),
  category: z
    .string()
    .describe(
      "Catégorie fournie, ou une catégorie proposée si le thème est libre",
    ),
  text: z
    .string()
    .describe(
      "Texte de 150 à 200 mots en exactement 3 paragraphes (début, tension, résolution) séparés par une ligne vide. Vocabulaire courant, registre adulte. Temps : présent, passé composé, imparfait. Pas de subjonctif complexe ni de passé simple.",
    ),
  illustration: z.object({
    description: z
      .string()
      .describe(
        "Description visuelle courte de la scène du texte, pour un dessin au trait (pas d'image générée ici)",
      ),
  }),
  vocabulary: z
    .array(vocabItemSchema)
    .length(6)
    .describe("Exactement 6 mots ou expressions tirés du texte"),
  questions: z
    .array(questionSchema)
    .length(6)
    .describe(
      "Exactement 6 questions dans cet ordre de types : litterale, litterale, inference, inference, contexte, opinion",
    ),
  ordering: z.object({
    sentences: z
      .array(orderingSentenceSchema)
      .length(6)
      .describe(
        "6 phrases mélangées (labels a–f) formant un récit cohérent sur un thème DIFFÉRENT du texte. Un seul ordre correct possible.",
      ),
    rationale: z
      .string()
      .describe(
        "Paragraphe « Pourquoi cet ordre ? » expliquant brièvement la logique de la séquence",
      ),
  }),
});

export const ficheSectionSchema = z.enum(["text", "questions", "ordering"]);

export const textSectionSchema = ficheSchema.pick({ text: true });
export const questionsSectionSchema = ficheSchema.pick({ questions: true });
export const orderingSectionSchema = ficheSchema.pick({ ordering: true });

export type FichePayload = z.infer<typeof ficheSchema>;
export type FicheSection = z.infer<typeof ficheSectionSchema>;
export type QuestionType = z.infer<typeof questionTypeSchema>;

export function sectionSchemaFor(section: FicheSection) {
  switch (section) {
    case "text":
      return textSectionSchema;
    case "questions":
      return questionsSectionSchema;
    case "ordering":
      return orderingSectionSchema;
  }
}
