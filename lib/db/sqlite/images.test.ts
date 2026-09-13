import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { createImagesRepository } from "./images";
import * as schema from "./schema";

function makeRepo() {
  const client = new Database(":memory:");
  client.exec(`
    CREATE TABLE fiches (
      numero INTEGER PRIMARY KEY AUTOINCREMENT,
      status TEXT NOT NULL DEFAULT 'brouillon',
      payload TEXT, theme TEXT, category TEXT,
      prompt_version TEXT, validated_at INTEGER,
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
    CREATE TABLE images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fiche_numero INTEGER NOT NULL,
      path TEXT NOT NULL,
      retenue INTEGER NOT NULL DEFAULT 0
    );
    INSERT INTO fiches (numero, status, created_at, updated_at)
    VALUES (1, 'brouillon', 0, 0), (2, 'brouillon', 0, 0);
  `);
  const db = drizzle(client, { schema });
  return createImagesRepository(db);
}

describe("sqlite images repository", () => {
  it("markRetenue leaves exactly one retenue per fiche", async () => {
    const repo = makeRepo();
    const rows = await repo.createMany(1, ["1/a.png", "1/b.png", "1/c.png"]);

    await repo.markRetenue(1, rows[1].id);
    let list = await repo.listByFiche(1);
    assert.equal(list.filter((r) => r.retenue).length, 1);
    assert.equal(list.find((r) => r.retenue)?.id, rows[1].id);

    await repo.markRetenue(1, rows[2].id);
    list = await repo.listByFiche(1);
    assert.equal(list.filter((r) => r.retenue).length, 1);
    assert.equal(list.find((r) => r.retenue)?.id, rows[2].id);
  });

  it("markRetenue is scoped to its own fiche", async () => {
    const repo = makeRepo();
    const a = await repo.createMany(1, ["1/a.png", "1/b.png"]);
    const b = await repo.createMany(2, ["2/a.png"]);

    await repo.markRetenue(1, a[0].id);
    await repo.markRetenue(2, b[0].id);

    const fiche1 = await repo.listByFiche(1);
    const fiche2 = await repo.listByFiche(2);
    assert.equal(fiche1.filter((r) => r.retenue).length, 1);
    assert.equal(fiche2.filter((r) => r.retenue).length, 1);
    assert.equal(fiche1.find((r) => r.retenue)?.id, a[0].id);
  });

  it("markRetenue rejects an unknown image", async () => {
    const repo = makeRepo();
    await repo.createMany(1, ["1/a.png"]);
    await assert.rejects(() => repo.markRetenue(1, 9999));
  });

  it("deleteByFiche returns the removed rows for cleanup", async () => {
    const repo = makeRepo();
    await repo.createMany(1, ["1/a.png", "1/b.png"]);
    const removed = await repo.deleteByFiche(1);
    assert.equal(removed.length, 2);
    assert.deepEqual(removed.map((r) => r.path).sort(), ["1/a.png", "1/b.png"]);
    assert.equal((await repo.listByFiche(1)).length, 0);
  });
});
