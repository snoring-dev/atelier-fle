import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { FichePayload } from "@/lib/schemas";
import {
  countWords,
  evaluateFicheChecks,
  isExactPermutation,
  textContainsTerm,
} from "./evaluate";
import { hasLogicalMarker } from "./markers";

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

describe("countWords", () => {
  it("counts whitespace-separated tokens", () => {
    assert.equal(countWords("  un deux   trois "), 3);
    assert.equal(countWords(""), 0);
  });
});

describe("textContainsTerm", () => {
  it("matches case- and accent-insensitively", () => {
    assert.equal(textContainsTerm("Il a fait Attention.", "attention"), true);
    assert.equal(textContainsTerm("café crème", "Cafe"), true);
    assert.equal(textContainsTerm("bonjour", "soir"), false);
  });
});

describe("isExactPermutation", () => {
  it("accepts 1–6 once each", () => {
    assert.equal(isExactPermutation([3, 1, 2, 6, 5, 4]), true);
    assert.equal(isExactPermutation([1, 1, 2, 3, 4, 5]), false);
    assert.equal(isExactPermutation([1, 2, 3, 4, 5]), false);
  });
});

describe("hasLogicalMarker", () => {
  it("detects curated markers", () => {
    assert.equal(hasLogicalMarker("Ce jour-là, elle part."), true);
    assert.equal(hasLogicalMarker("Elle marche dans la rue."), false);
  });
});

describe("evaluateFicheChecks", () => {
  it("returns all ok for a valid payload with no overflow and empty review", () => {
    const results = evaluateFicheChecks({ payload: basePayload() });
    const byId = Object.fromEntries(results.map((r) => [r.id, r]));
    assert.equal(byId.textLength.status, "ok");
    assert.equal(byId.questionTypes.status, "ok");
    assert.equal(byId.markers.status, "ok");
    assert.equal(byId.positions.status, "ok");
    assert.equal(byId.reviewWords.status, "neutral");
    assert.equal(byId.vocabulary.status, "ok");
    assert.equal(byId.overflow.status, "ok");
  });

  it("warns when word count is out of range", () => {
    const short = basePayload({
      text: "trop court alpha beta gamma delta epsilon zeta",
    });
    const r = evaluateFicheChecks({ payload: short }).find(
      (c) => c.id === "textLength",
    );
    assert.equal(r?.status, "warn");
    assert.match(r?.detail ?? "", /attendu 140–210/);
  });

  it("warns on wrong question type order", () => {
    const payload = basePayload();
    payload.questions[0] = {
      ...payload.questions[0],
      type: "opinion",
    };
    const r = evaluateFicheChecks({ payload }).find(
      (c) => c.id === "questionTypes",
    );
    assert.equal(r?.status, "warn");
  });

  it("warns when a marker is missing", () => {
    const payload = basePayload();
    payload.ordering.sentences[0] = {
      ...payload.ordering.sentences[0],
      text: "Tout est calme sans marqueur.",
    };
    const r = evaluateFicheChecks({ payload }).find((c) => c.id === "markers");
    assert.equal(r?.status, "warn");
    assert.equal(r?.detail, "Marqueurs : 5/6 phrases");
  });

  it("warns on duplicate positions", () => {
    const payload = basePayload();
    payload.ordering.sentences[1] = {
      ...payload.ordering.sentences[1],
      position: 1,
    };
    const r = evaluateFicheChecks({ payload }).find(
      (c) => c.id === "positions",
    );
    assert.equal(r?.status, "warn");
  });

  it("warns when fewer than 3 review words appear in the text", () => {
    const payload = basePayload();
    const r = evaluateFicheChecks({
      payload,
      reviewWords: ["absent1", "absent2", "absent3", "alpha"],
    }).find((c) => c.id === "reviewWords");
    assert.equal(r?.status, "warn");
    assert.match(r?.detail ?? "", /1\/3/);
  });

  it("oks review when at least 3 words are found", () => {
    const payload = basePayload();
    const r = evaluateFicheChecks({
      payload,
      reviewWords: ["alpha", "beta", "gamma", "ghost"],
    }).find((c) => c.id === "reviewWords");
    assert.equal(r?.status, "ok");
  });

  it("warns when a vocab term is missing from the text", () => {
    const payload = basePayload();
    payload.vocabulary[0] = {
      ...payload.vocabulary[0],
      term: "motAbsent",
    };
    const r = evaluateFicheChecks({ payload }).find(
      (c) => c.id === "vocabulary",
    );
    assert.equal(r?.status, "warn");
    assert.match(r?.detail ?? "", /1\/6/);
  });

  it("warns on overflow page passthrough", () => {
    const r = evaluateFicheChecks({
      payload: basePayload(),
      overflowPage: 2,
    }).find((c) => c.id === "overflow");
    assert.equal(r?.status, "warn");
    assert.equal(r?.detail, "Débordement : un bloc dépasse la page 2");
  });
});
