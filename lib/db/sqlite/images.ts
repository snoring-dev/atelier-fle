import { and, eq } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type { ImagesRepository } from "../ports";
import type { ImageRow } from "../types";
import * as schema from "./schema";

type Db = BetterSQLite3Database<typeof schema>;

function mapRow(row: typeof schema.images.$inferSelect): ImageRow {
  return {
    id: row.id,
    ficheNumero: row.ficheNumero,
    path: row.path,
    retenue: row.retenue,
  };
}

export function createImagesRepository(db: Db): ImagesRepository {
  return {
    async createMany(numero, paths) {
      if (paths.length === 0) return [];
      const inserted = db
        .insert(schema.images)
        .values(
          paths.map((p) => ({
            ficheNumero: numero,
            path: p,
            retenue: false,
          })),
        )
        .returning()
        .all();
      return inserted.map(mapRow);
    },

    async listByFiche(numero) {
      const rows = db
        .select()
        .from(schema.images)
        .where(eq(schema.images.ficheNumero, numero))
        .all();
      return rows.map(mapRow);
    },

    async getById(numero, imageId) {
      const row = db
        .select()
        .from(schema.images)
        .where(
          and(
            eq(schema.images.ficheNumero, numero),
            eq(schema.images.id, imageId),
          ),
        )
        .get();
      return row ? mapRow(row) : null;
    },

    async getRetenue(numero) {
      const row = db
        .select()
        .from(schema.images)
        .where(
          and(
            eq(schema.images.ficheNumero, numero),
            eq(schema.images.retenue, true),
          ),
        )
        .get();
      return row ? mapRow(row) : null;
    },

    async markRetenue(numero, imageId) {
      return db.transaction((tx) => {
        tx.update(schema.images)
          .set({ retenue: false })
          .where(eq(schema.images.ficheNumero, numero))
          .run();
        const updated = tx
          .update(schema.images)
          .set({ retenue: true })
          .where(
            and(
              eq(schema.images.ficheNumero, numero),
              eq(schema.images.id, imageId),
            ),
          )
          .returning()
          .get();
        if (!updated) {
          throw new Error(`Image ${imageId} introuvable pour fiche ${numero}`);
        }
        return mapRow(updated);
      });
    },

    async deleteByFiche(numero) {
      const rows = db
        .delete(schema.images)
        .where(eq(schema.images.ficheNumero, numero))
        .returning()
        .all();
      return rows.map(mapRow);
    },
  };
}
