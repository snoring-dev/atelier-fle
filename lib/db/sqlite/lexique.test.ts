import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import type { FichePayload } from "@/lib/schemas";
import { createLexiqueRepository } from "./lexique";
import * as schema from "./schema";

function makeRepo() {
  const client = new Database(":memory:");
  client.exec(`
    CREATE TABLE lexique (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mot TEXT NOT NULL,
      definition TEXT,
      exemple TEXT,
      statut TEXT NOT NULL DEFAULT 'nouveau',
      occurrences INTEGER NOT NULL DEFAULT 0,
      last_seen_at INTEGER
    );
    CREATE UNIQUE INDEX lexique_mot_unique ON lexique (mot);
  `);
  const db = drizzle(client, { schema });
  return { repo: createLexiqueRepository(db), db, client };
}

function basePayload(overrides: Partial<FichePayload> = {}): FichePayload {
  const text = Array.from({ length: 160 }, (_, i) => `mot${i + 1}`).join(" ");
  const withVocab = `${text} alpha beta gamma delta epsilon zeta`;
  return {
    title: "Titre",
    theme: "Thème",
    category: "Catégorie",
    text: withVocab,
    illustration: { description: "Une scène" },
    vocabulary: [
      { term: "alpha", definition: "d1", example: "e1" },
      { term: "beta", definition: "d2", example: "e2" },
      { term: "gamma", definition: "d3", example: "e3" },
      { term: "delta", definition: "d4", example: "e4" },
      { term: "epsilon", definition: "d5", example: "e5" },
      { term: "zeta", definition: "d6", example: "e6" },
    ],
    questions: [
      { type: "litterale", prompt: "Q1", answer: "A1", hints: [] },
      { type: "litterale", prompt: "Q2", answer: "A2", hints: [] },
      { type: "inference", prompt: "Q3", answer: "A3", hints: [] },
      { type: "inference", prompt: "Q4", answer: "A4", hints: [] },
      { type: "contexte", prompt: "Q5", answer: "A5", hints: [] },
      { type: "opinion", prompt: "Q6", answer: "", hints: ["h1", "h2"] },
    ],
    ordering: {
      sentences: [
        { label: "a", text: "Au début, tout est calme.", position: 1 },
        { label: "b", text: "Cependant, un problème apparaît.", position: 2 },
        { label: "c", text: "Puis quelqu'un intervient.", position: 3 },
        { label: "d", text: "Pourtant, rien n'est résolu.", position: 4 },
        { label: "e", text: "Finalement, tout s'arrange.", position: 5 },
        { label: "f", text: "Le soir même, on fête.", position: 6 },
      ],
      rationale: "Parce que…",
    },
    ...overrides,
  };
}

function getMot(db: ReturnType<typeof drizzle<typeof schema>>, mot: string) {
  return db
    .select()
    .from(schema.lexique)
    .where(eq(schema.lexique.mot, mot))
    .get();
}

describe("lexique recordFromPayload", () => {
  it("inserts vocabulary terms that appear in the text as nouveau/1", async () => {
    const { repo, db } = makeRepo();
    await repo.recordFromPayload(basePayload());

    const alpha = getMot(db, "alpha");
    assert.ok(alpha);
    assert.equal(alpha.statut, "nouveau");
    assert.equal(alpha.occurrences, 1);
    assert.equal(alpha.definition, "d1");
    assert.equal(alpha.exemple, "e1");
    assert.ok(alpha.lastSeenAt);
  });

  it("skips vocabulary terms that do not appear in the text", async () => {
    const { repo, db } = makeRepo();
    const text = Array.from({ length: 160 }, (_, i) => `mot${i + 1}`).join(" ");
    await repo.recordFromPayload(
      basePayload({
        text: `${text} alpha beta gamma delta epsilon`,
        // zeta is in vocabulary but not in text
      }),
    );

    assert.equal(getMot(db, "zeta"), undefined);
    assert.ok(getMot(db, "alpha"));
  });

  it("bumps occurrences and moves nouveau → en cours on second validation", async () => {
    const { repo, db } = makeRepo();
    const payload = basePayload();
    await repo.recordFromPayload(payload);
    await repo.recordFromPayload(payload);

    const alpha = getMot(db, "alpha");
    assert.ok(alpha);
    assert.equal(alpha.occurrences, 2);
    assert.equal(alpha.statut, "en cours");
    // Does not overwrite definition/example
    assert.equal(alpha.definition, "d1");
  });

  it("marks acquis at 4 occurrences and leaves the draw pool", async () => {
    const { repo, db } = makeRepo();
    const payload = basePayload();
    await repo.recordFromPayload(payload); // 1 nouveau
    await repo.recordFromPayload(payload); // 2 en cours
    await repo.recordFromPayload(payload); // 3 en cours
    await repo.recordFromPayload(payload); // 4 acquis

    const alpha = getMot(db, "alpha");
    assert.ok(alpha);
    assert.equal(alpha.occurrences, 4);
    assert.equal(alpha.statut, "acquis");

    const drawn = await repo.draw(4);
    assert.ok(!drawn.includes("alpha"));
  });

  it("ignores exclu words for bump and draw", async () => {
    const { repo, db } = makeRepo();
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    db.insert(schema.lexique)
      .values({
        mot: "exclu-mot",
        definition: "x",
        exemple: "y",
        statut: "exclu",
        occurrences: 1,
        lastSeenAt: eightDaysAgo,
      })
      .run();

    await repo.recordFromPayload(
      basePayload({
        text: `${basePayload().text} exclu-mot`,
      }),
    );

    const row = getMot(db, "exclu-mot");
    assert.ok(row);
    assert.equal(row.occurrences, 1);
    assert.equal(row.statut, "exclu");

    const drawn = await repo.draw(4);
    assert.ok(!drawn.includes("exclu-mot"));
  });

  it("canonicalizes mot on insert (case-insensitive)", async () => {
    const { repo, db } = makeRepo();
    const text = Array.from({ length: 160 }, (_, i) => `mot${i + 1}`).join(" ");
    await repo.recordFromPayload(
      basePayload({
        text: `${text} Café`,
        vocabulary: [
          { term: "Café", definition: "boisson", example: "un café" },
          { term: "beta", definition: "d2", example: "e2" },
          { term: "gamma", definition: "d3", example: "e3" },
          { term: "delta", definition: "d4", example: "e4" },
          { term: "epsilon", definition: "d5", example: "e5" },
          { term: "zeta", definition: "d6", example: "e6" },
        ],
      }),
    );

    assert.ok(getMot(db, "café"));
    assert.equal(getMot(db, "Café"), undefined);
  });
});

describe("lexique draw", () => {
  it("prioritizes stale en cours over nouveau, capped at 4", async () => {
    const { repo, db } = makeRepo();
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    const nineDaysAgo = new Date(Date.now() - 9 * 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const now = new Date();

    // P1 candidates (oldest first)
    db.insert(schema.lexique)
      .values([
        {
          mot: "stale-a",
          statut: "en cours",
          occurrences: 2,
          lastSeenAt: nineDaysAgo,
        },
        {
          mot: "stale-b",
          statut: "en cours",
          occurrences: 2,
          lastSeenAt: eightDaysAgo,
        },
        // Recent en cours — not eligible for P1
        {
          mot: "fresh",
          statut: "en cours",
          occurrences: 2,
          lastSeenAt: twoDaysAgo,
        },
        // P2
        {
          mot: "new-1",
          statut: "nouveau",
          occurrences: 1,
          lastSeenAt: now,
        },
        {
          mot: "new-2",
          statut: "nouveau",
          occurrences: 1,
          lastSeenAt: now,
        },
        {
          mot: "new-3",
          statut: "nouveau",
          occurrences: 1,
          lastSeenAt: now,
        },
        // acquis — never drawn
        {
          mot: "done",
          statut: "acquis",
          occurrences: 4,
          lastSeenAt: nineDaysAgo,
        },
      ])
      .run();

    const drawn = await repo.draw(4);
    assert.equal(drawn.length, 4);
    assert.deepEqual(drawn.slice(0, 2), ["stale-a", "stale-b"]);
    assert.ok(drawn.includes("new-1"));
    assert.ok(drawn.includes("new-2"));
    assert.ok(!drawn.includes("fresh"));
    assert.ok(!drawn.includes("done"));
  });

  it("returns fewer than 4 when the pool is short", async () => {
    const { repo, db } = makeRepo();
    db.insert(schema.lexique)
      .values({
        mot: "only",
        statut: "nouveau",
        occurrences: 1,
        lastSeenAt: new Date(),
      })
      .run();

    const drawn = await repo.draw(4);
    assert.deepEqual(drawn, ["only"]);
  });

  it("returns empty when the pool is empty", async () => {
    const { repo } = makeRepo();
    assert.deepEqual(await repo.draw(4), []);
  });

  it("does not update lastSeenAt on draw", async () => {
    const { repo, db } = makeRepo();
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    db.insert(schema.lexique)
      .values({
        mot: "stale",
        statut: "en cours",
        occurrences: 2,
        lastSeenAt: eightDaysAgo,
      })
      .run();

    await repo.draw(4);
    const row = getMot(db, "stale");
    assert.ok(row?.lastSeenAt);
    // SQLite stores timestamps at second precision — compare truncated values.
    assert.equal(
      Math.floor(row.lastSeenAt.getTime() / 1000),
      Math.floor(eightDaysAgo.getTime() / 1000),
    );
  });
});

/**
 * Double-calling recordFromPayload on the same payload bumps twice.
 * The PDF route must only call recordFromPayload when the fiche was still
 * a brouillon (first validation). Re-exports of a validated fiche are a no-op.
 */
describe("lexique first-validation only (route contract)", () => {
  it("documents that recording twice would double-bump — callers must guard", async () => {
    const { repo, db } = makeRepo();
    const payload = basePayload();
    await repo.recordFromPayload(payload);
    await repo.recordFromPayload(payload);
    const alpha = getMot(db, "alpha");
    assert.equal(alpha?.occurrences, 2);
    // Route guard: wasDraft === (status === "brouillon") before validate().
  });
});
