import { desc, eq } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type { FichesRepository } from "../ports";
import type { Fiche } from "../types";
import * as schema from "./schema";

type Db = BetterSQLite3Database<typeof schema>;

function parseReviewWords(raw: string | null): string[] | null {
  if (raw == null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      !Array.isArray(parsed) ||
      !parsed.every((w): w is string => typeof w === "string")
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function mapRow(row: typeof schema.fiches.$inferSelect): Fiche {
  return {
    numero: row.numero,
    status: row.status,
    payload: row.payload,
    theme: row.theme,
    category: row.category,
    promptVersion: row.promptVersion,
    reviewWords: parseReviewWords(row.reviewWords),
    validatedAt: row.validatedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createFichesRepository(db: Db): FichesRepository {
  return {
    async create({ theme, category }) {
      const now = new Date();
      const inserted = db
        .insert(schema.fiches)
        .values({
          status: "brouillon",
          payload: null,
          theme,
          category,
          promptVersion: null,
          reviewWords: null,
          validatedAt: null,
          createdAt: now,
          updatedAt: now,
        })
        .returning()
        .get();

      return mapRow(inserted);
    },

    async getByNumero(numero) {
      const row = db
        .select()
        .from(schema.fiches)
        .where(eq(schema.fiches.numero, numero))
        .get();
      return row ? mapRow(row) : null;
    },

    async listRecent(limit) {
      const rows = db
        .select()
        .from(schema.fiches)
        .orderBy(desc(schema.fiches.createdAt), desc(schema.fiches.numero))
        .limit(limit)
        .all();
      return rows.map(mapRow);
    },

    async saveDraft({ numero, payload, promptVersion }) {
      const updated = db
        .update(schema.fiches)
        .set({
          payload,
          promptVersion,
          updatedAt: new Date(),
        })
        .where(eq(schema.fiches.numero, numero))
        .returning()
        .get();

      if (!updated) {
        throw new Error(`Fiche ${numero} introuvable`);
      }
      return mapRow(updated);
    },

    async validate(numero) {
      const existing = db
        .select()
        .from(schema.fiches)
        .where(eq(schema.fiches.numero, numero))
        .get();

      if (!existing) {
        throw new Error(`Fiche ${numero} introuvable`);
      }

      if (existing.status === "validee") {
        return mapRow(existing);
      }

      const now = new Date();
      const updated = db
        .update(schema.fiches)
        .set({
          status: "validee",
          validatedAt: now,
          updatedAt: now,
        })
        .where(eq(schema.fiches.numero, numero))
        .returning()
        .get();

      if (!updated) {
        throw new Error(`Fiche ${numero} introuvable`);
      }
      return mapRow(updated);
    },

    async setReviewWords(numero, words) {
      const updated = db
        .update(schema.fiches)
        .set({
          reviewWords: JSON.stringify([...words]),
          updatedAt: new Date(),
        })
        .where(eq(schema.fiches.numero, numero))
        .returning()
        .get();

      if (!updated) {
        throw new Error(`Fiche ${numero} introuvable`);
      }
      return mapRow(updated);
    },
  };
}
