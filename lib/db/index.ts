import type { Database, DatabaseProvider } from "./ports";
import { createSqliteStrategy } from "./sqlite/strategy";

export type { Database, DatabaseProvider } from "./ports";
export { ensureReviewWords } from "./review-words";
export type * from "./types";

function resolveProvider(): DatabaseProvider {
  const provider = (process.env.DATABASE_PROVIDER ?? "sqlite") as string;
  if (provider !== "sqlite") {
    throw new Error(
      `Unsupported DATABASE_PROVIDER "${provider}". Only "sqlite" is implemented.`,
    );
  }
  return provider;
}

export function createDatabase(): Database {
  const provider = resolveProvider();
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  switch (provider) {
    case "sqlite":
      return createSqliteStrategy(databaseUrl);
    default: {
      const _exhaustive: never = provider;
      throw new Error(`Unhandled DATABASE_PROVIDER: ${_exhaustive}`);
    }
  }
}

declare global {
  var __atelierFleDb: Database | undefined;
}

export function getDatabase(): Database {
  if (!globalThis.__atelierFleDb) {
    globalThis.__atelierFleDb = createDatabase();
  }
  return globalThis.__atelierFleDb;
}
