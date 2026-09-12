import { desc, eq } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type { FichesRepository } from "../ports";
import type { Fiche } from "../types";
import * as schema from "./schema";

type Db = BetterSQLite3Database<typeof schema>;

function mapRow(row: typeof schema.fiches.$inferSelect): Fiche {
  return {
    numero: row.numero,
    status: row.status,
    payload: row.payload,
    theme: row.theme,
    category: row.category,
    promptVersion: row.promptVersion,
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
  };
}
