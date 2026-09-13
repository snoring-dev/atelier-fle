import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { createFichesRepository } from "./fiches";
import * as schema from "./schema";

function makeRepo() {
  const client = new Database(":memory:");
  client.exec(`
    CREATE TABLE fiches (
      numero INTEGER PRIMARY KEY AUTOINCREMENT,
      status TEXT NOT NULL DEFAULT 'brouillon',
      payload TEXT,
      theme TEXT,
      category TEXT,
      prompt_version TEXT,
      review_words TEXT,
      validated_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  const db = drizzle(client, { schema });
  return createFichesRepository(db);
}

describe("sqlite fiches repository", () => {
  it("list returns all fiches newest first", async () => {
    const repo = makeRepo();
    const a = await repo.create({
      theme: "Au marché",
      category: "Alimentation",
    });
    // Ensure distinct timestamps for ordering
    await new Promise((r) => setTimeout(r, 5));
    const b = await repo.create({
      theme: "Chez le médecin",
      category: "Santé",
    });

    const listed = await repo.list();
    assert.equal(listed.length, 2);
    assert.equal(listed[0].numero, b.numero);
    assert.equal(listed[1].numero, a.numero);
  });

  it("duplicate creates a new brouillon with copied content", async () => {
    const repo = makeRepo();
    const source = await repo.create({
      theme: "Au marché",
      category: "Alimentation",
    });
    await repo.saveDraft({
      numero: source.numero,
      payload: JSON.stringify({ title: "Courses" }),
      promptVersion: "v1",
    });
    await repo.setReviewWords(source.numero, ["pomme", "panier"]);
    await repo.validate(source.numero);

    const clone = await repo.duplicate(source.numero);

    assert.notEqual(clone.numero, source.numero);
    assert.equal(clone.status, "brouillon");
    assert.equal(clone.theme, "Au marché");
    assert.equal(clone.category, "Alimentation");
    assert.equal(clone.payload, JSON.stringify({ title: "Courses" }));
    assert.equal(clone.promptVersion, "v1");
    assert.equal(clone.reviewWords, null);
    assert.equal(clone.validatedAt, null);

    const original = await repo.getByNumero(source.numero);
    assert.equal(original?.status, "validee");
    assert.ok(original?.validatedAt);
    assert.deepEqual(original?.reviewWords, ["pomme", "panier"]);
  });

  it("duplicate throws when source is missing", async () => {
    const repo = makeRepo();
    await assert.rejects(
      () => repo.duplicate(999),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.match(err.message, /introuvable/);
        return true;
      },
    );
  });
});
