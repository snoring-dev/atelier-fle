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
      text_cost_micros INTEGER NOT NULL DEFAULT 0,
      image_cost_micros INTEGER NOT NULL DEFAULT 0,
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

  it("create initializes costs to zero", async () => {
    const repo = makeRepo();
    const fiche = await repo.create({
      theme: "Au marché",
      category: "Alimentation",
    });
    assert.equal(fiche.textCostMicros, 0);
    assert.equal(fiche.imageCostMicros, 0);
  });

  it("addUsage accumulates text and image costs", async () => {
    const repo = makeRepo();
    const fiche = await repo.create({
      theme: "Au marché",
      category: "Alimentation",
    });

    const afterText = await repo.addUsage(fiche.numero, { textMicros: 1500 });
    assert.equal(afterText.textCostMicros, 1500);
    assert.equal(afterText.imageCostMicros, 0);

    const afterImages = await repo.addUsage(fiche.numero, {
      imageMicros: 40000,
    });
    assert.equal(afterImages.textCostMicros, 1500);
    assert.equal(afterImages.imageCostMicros, 40000);

    const afterBoth = await repo.addUsage(fiche.numero, {
      textMicros: 500,
      imageMicros: 10000,
    });
    assert.equal(afterBoth.textCostMicros, 2000);
    assert.equal(afterBoth.imageCostMicros, 50000);
  });

  it("addUsage ignores zero and negative deltas", async () => {
    const repo = makeRepo();
    const fiche = await repo.create({
      theme: "Au marché",
      category: "Alimentation",
    });
    await repo.addUsage(fiche.numero, { textMicros: 100 });

    const unchanged = await repo.addUsage(fiche.numero, {
      textMicros: 0,
      imageMicros: -5,
    });
    assert.equal(unchanged.textCostMicros, 100);
    assert.equal(unchanged.imageCostMicros, 0);
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

  it("duplicate resets accumulated costs to zero", async () => {
    const repo = makeRepo();
    const source = await repo.create({
      theme: "Au marché",
      category: "Alimentation",
    });
    await repo.addUsage(source.numero, {
      textMicros: 2500,
      imageMicros: 80000,
    });

    const clone = await repo.duplicate(source.numero);
    assert.equal(clone.textCostMicros, 0);
    assert.equal(clone.imageCostMicros, 0);

    const original = await repo.getByNumero(source.numero);
    assert.equal(original?.textCostMicros, 2500);
    assert.equal(original?.imageCostMicros, 80000);
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
