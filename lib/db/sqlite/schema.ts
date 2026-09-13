import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const fiches = sqliteTable("fiches", {
  numero: integer("numero").primaryKey({ autoIncrement: true }),
  status: text("status", { enum: ["brouillon", "validee"] })
    .notNull()
    .default("brouillon"),
  payload: text("payload"),
  theme: text("theme"),
  category: text("category"),
  promptVersion: text("prompt_version"),
  /** JSON string array of lexicon words drawn for reinjection (US-7.1). */
  reviewWords: text("review_words"),
  validatedAt: integer("validated_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const lexique = sqliteTable("lexique", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  mot: text("mot").notNull().unique(),
  definition: text("definition"),
  exemple: text("exemple"),
  statut: text("statut", {
    enum: ["nouveau", "en cours", "acquis", "exclu"],
  })
    .notNull()
    .default("nouveau"),
  occurrences: integer("occurrences").notNull().default(0),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp" }),
});

export const images = sqliteTable("images", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ficheNumero: integer("fiche_numero")
    .notNull()
    .references(() => fiches.numero),
  path: text("path").notNull(),
  retenue: integer("retenue", { mode: "boolean" }).notNull().default(false),
});
