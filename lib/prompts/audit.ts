import type { AuditSentence } from "@/lib/checks/audit";
import { buildOrderingAuditPrompt } from "@/lib/checks/audit";

/** Blind ordering audit: no positions, no rationale, no solution hint. */
export function buildOrderingAuditUserPrompt(
  sentences: readonly AuditSentence[],
): string {
  return buildOrderingAuditPrompt(sentences);
}

export const ORDERING_AUDIT_SYSTEM_PROMPT = `Tu es un professeur de FLE. On te donne six phrases mélangées.
Tu dois les remettre dans l'unique ordre chronologique ou logique possible.
Tu réponds uniquement avec l'objet JSON demandé (liste d'étiquettes a–f).
Tu n'expliques rien. Tu ne traduis pas.`;
