import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const filePath = databaseUrl.replace(/^file:/, "");
const absolutePath = path.isAbsolute(filePath)
  ? filePath
  : path.resolve(process.cwd(), filePath);

const client = new Database(absolutePath);
client.pragma("journal_mode = WAL");

const db = drizzle(client);
migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
client.close();

console.log("Migrations applied.");
