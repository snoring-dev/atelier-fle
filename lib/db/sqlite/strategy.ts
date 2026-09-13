import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import type { Database as DatabasePort } from "../ports";
import { createFichesRepository } from "./fiches";
import { createImagesRepository } from "./images";
import * as schema from "./schema";

function resolveSqlitePath(databaseUrl: string): string {
  const withoutScheme = databaseUrl.replace(/^file:/, "");
  return path.isAbsolute(withoutScheme)
    ? withoutScheme
    : path.resolve(process.cwd(), withoutScheme);
}

export function createSqliteStrategy(databaseUrl: string): DatabasePort {
  const filePath = resolveSqlitePath(databaseUrl);
  const client = new Database(filePath);
  client.pragma("journal_mode = WAL");

  const db = drizzle(client, { schema });

  return {
    async migrate() {
      migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
    },
    async ping() {
      const row = client.prepare("select 1 as ok").get() as { ok: number };
      return row.ok === 1;
    },
    async close() {
      client.close();
    },
    fiches: createFichesRepository(db),
    lexique: { _entity: undefined as never },
    images: createImagesRepository(db),
  };
}
