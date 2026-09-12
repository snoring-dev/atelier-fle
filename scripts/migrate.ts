import { createDatabase } from "../lib/db";

async function main() {
  const db = createDatabase();
  await db.migrate();
  await db.close();
  console.log("Migrations applied.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
