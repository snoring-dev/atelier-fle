import { and, asc, eq, lt, ne } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { textContainsTerm } from "@/lib/checks/evaluate";
import type { LexiqueRepository } from "../ports";
import type { LexiqueStatut } from "../types";
import * as schema from "./schema";

type Db = BetterSQLite3Database<typeof schema>;

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_DRAW_LIMIT = 4;

/** Canonical form for unique `mot` index. */
export function canonicalizeMot(mot: string): string {
  return mot.trim().toLowerCase();
}

function nextStatut(
  current: LexiqueStatut,
  occurrences: number,
): LexiqueStatut {
  if (occurrences >= 4) return "acquis";
  if (current === "nouveau") return "en cours";
  return current;
}

export function createLexiqueRepository(db: Db): LexiqueRepository {
  return {
    async draw(limit = DEFAULT_DRAW_LIMIT) {
      if (limit <= 0) return [];

      const cutoff = new Date(Date.now() - SEVEN_DAYS_MS);
      const selected: string[] = [];
      const seen = new Set<string>();

      const priority1 = db
        .select()
        .from(schema.lexique)
        .where(
          and(
            eq(schema.lexique.statut, "en cours"),
            lt(schema.lexique.lastSeenAt, cutoff),
          ),
        )
        .orderBy(asc(schema.lexique.lastSeenAt))
        .all();

      for (const row of priority1) {
        if (selected.length >= limit) break;
        if (seen.has(row.mot)) continue;
        seen.add(row.mot);
        selected.push(row.mot);
      }

      if (selected.length < limit) {
        const priority2 = db
          .select()
          .from(schema.lexique)
          .where(
            and(
              eq(schema.lexique.statut, "nouveau"),
              eq(schema.lexique.occurrences, 1),
            ),
          )
          .orderBy(asc(schema.lexique.lastSeenAt))
          .all();

        for (const row of priority2) {
          if (selected.length >= limit) break;
          if (seen.has(row.mot)) continue;
          seen.add(row.mot);
          selected.push(row.mot);
        }
      }

      return selected;
    },

    async recordFromPayload(payload) {
      const now = new Date();
      const text = payload.text;

      // 1. Bump existing non-exclu / non-acquis mots that appear in the text.
      const existing = db
        .select()
        .from(schema.lexique)
        .where(
          and(
            ne(schema.lexique.statut, "exclu"),
            ne(schema.lexique.statut, "acquis"),
          ),
        )
        .all();

      const touched = new Set<string>();

      for (const row of existing) {
        if (!textContainsTerm(text, row.mot)) continue;
        const occurrences = row.occurrences + 1;
        const statut = nextStatut(row.statut, occurrences);
        db.update(schema.lexique)
          .set({
            occurrences,
            statut,
            lastSeenAt: now,
          })
          .where(eq(schema.lexique.id, row.id))
          .run();
        touched.add(row.mot);
      }

      // 2. Insert new vocabulary terms that appear in the text.
      for (const item of payload.vocabulary) {
        const mot = canonicalizeMot(item.term);
        if (!mot) continue;
        if (touched.has(mot)) continue;
        if (!textContainsTerm(text, item.term)) continue;

        const already = db
          .select()
          .from(schema.lexique)
          .where(eq(schema.lexique.mot, mot))
          .get();

        if (already) {
          // exclu / acquis (or race): skip auto-update
          continue;
        }

        db.insert(schema.lexique)
          .values({
            mot,
            definition: item.definition,
            exemple: item.example,
            statut: "nouveau",
            occurrences: 1,
            lastSeenAt: now,
          })
          .run();
      }
    },
  };
}
