import { type FichePayload, ficheSchema } from "./fiche";

/** Parse and validate a fiche JSON payload from the database. */
export function parsePayload(raw: string | null): FichePayload | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    const result = ficheSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
