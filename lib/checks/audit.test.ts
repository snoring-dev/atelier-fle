import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { FichePayload } from "@/lib/schemas";
import {
  buildOrderingAuditPrompt,
  compareOrderingAudit,
  expectedLabelOrder,
  isLabelPermutation,
  prepareAuditSentences,
  shuffleInPlace,
} from "./audit";

const CLEAR_SENTENCES: FichePayload["ordering"]["sentences"] = [
  { label: "a", text: "Au début, tout est calme.", position: 1 },
  { label: "b", text: "Cependant, un problème apparaît.", position: 2 },
  { label: "c", text: "Puis quelqu'un intervient.", position: 3 },
  { label: "d", text: "Pourtant, rien n'est résolu.", position: 4 },
  { label: "e", text: "Finalement, tout s'arrange.", position: 5 },
  { label: "f", text: "Le soir même, on fête.", position: 6 },
];

/**
 * Deliberately ambiguous: two middle events with no causal/temporal link
 * (PRD §15). A model may swap c and d and still produce a coherent story.
 */
const AMBIGUOUS_SENTENCES: FichePayload["ordering"]["sentences"] = [
  { label: "a", text: "Au début, Marie arrive au marché.", position: 1 },
  { label: "b", text: "Ensuite, elle achète des pommes.", position: 2 },
  { label: "c", text: "Cependant, le soleil brille fort.", position: 3 },
  { label: "d", text: "Pourtant, un chien aboie au loin.", position: 4 },
  { label: "e", text: "Puis elle paie à la caisse.", position: 5 },
  { label: "f", text: "Finalement, elle rentre chez elle.", position: 6 },
];

/** Deterministic RNG: always pick index 0 → reverse-ish predictable shuffle. */
function seededRandom(sequence: number[]): () => number {
  let i = 0;
  return () => {
    const value = sequence[i % sequence.length] ?? 0;
    i += 1;
    return value;
  };
}

describe("shuffleInPlace", () => {
  it("returns a permutation of the input", () => {
    const items = ["a", "b", "c", "d", "e", "f"];
    const shuffled = shuffleInPlace(
      [...items],
      seededRandom([0.9, 0.1, 0.5, 0.2, 0.8]),
    );
    assert.equal(shuffled.length, 6);
    assert.deepEqual([...shuffled].sort(), [...items].sort());
  });
});

describe("prepareAuditSentences", () => {
  it("strips positions and rationale, keeps only label and text", () => {
    const prepared = prepareAuditSentences(CLEAR_SENTENCES, () => 0);
    assert.equal(prepared.length, 6);
    for (const s of prepared) {
      assert.ok("label" in s);
      assert.ok("text" in s);
      assert.equal("position" in s, false);
    }
  });

  it("prompt never mentions position or rationale", () => {
    const prepared = prepareAuditSentences(CLEAR_SENTENCES, () => 0);
    const prompt = buildOrderingAuditPrompt(prepared);
    assert.equal(/position/i.test(prompt), false);
    assert.equal(/rationale/i.test(prompt), false);
    assert.equal(/pourquoi cet ordre/i.test(prompt), false);
    for (const s of CLEAR_SENTENCES) {
      assert.match(
        prompt,
        new RegExp(s.text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      );
    }
  });
});

describe("expectedLabelOrder", () => {
  it("sorts by position ascending", () => {
    const mixed: FichePayload["ordering"]["sentences"] = [
      { label: "c", text: "trois", position: 3 },
      { label: "a", text: "un", position: 1 },
      { label: "b", text: "deux", position: 2 },
      { label: "f", text: "six", position: 6 },
      { label: "d", text: "quatre", position: 4 },
      { label: "e", text: "cinq", position: 5 },
    ];
    assert.deepEqual(expectedLabelOrder(mixed), ["a", "b", "c", "d", "e", "f"]);
  });
});

describe("isLabelPermutation", () => {
  it("accepts a–f once each", () => {
    assert.equal(isLabelPermutation(["c", "a", "b", "f", "e", "d"]), true);
    assert.equal(isLabelPermutation(["a", "a", "b", "c", "d", "e"]), false);
    assert.equal(isLabelPermutation(["a", "b", "c", "d", "e"]), false);
  });
});

describe("compareOrderingAudit", () => {
  it("marks matching sequences as not ambiguous", () => {
    const expected = expectedLabelOrder(CLEAR_SENTENCES);
    const result = compareOrderingAudit(expected, expected);
    assert.equal(result.ambiguous, false);
    assert.deepEqual(result.actual, expected);
  });

  it("marks differing sequences as ambiguous", () => {
    const expected = expectedLabelOrder(CLEAR_SENTENCES);
    const actual = ["a", "b", "d", "c", "e", "f"] as const;
    const result = compareOrderingAudit(expected, [...actual]);
    assert.equal(result.ambiguous, true);
    assert.deepEqual(result.actual, [...actual]);
  });

  it("treats invalid permutations as ambiguous", () => {
    const expected = expectedLabelOrder(CLEAR_SENTENCES);
    const result = compareOrderingAudit(expected, [
      "a",
      "a",
      "b",
      "c",
      "d",
      "e",
    ]);
    assert.equal(result.ambiguous, true);
  });

  it("detects a deliberately ambiguous order (PRD §15)", () => {
    const expected = expectedLabelOrder(AMBIGUOUS_SENTENCES);
    // Alternate plausible order: swap the two unlinked middle events (c ↔ d).
    const alternate = ["a", "b", "d", "c", "e", "f"] as const;
    assert.notDeepEqual([...alternate], expected);

    const prepared = prepareAuditSentences(AMBIGUOUS_SENTENCES, () => 0);
    const prompt = buildOrderingAuditPrompt(prepared);
    assert.equal(/position/i.test(prompt), false);

    // Mock model returning the alternate permutation.
    const result = compareOrderingAudit(expected, [...alternate]);
    assert.equal(result.ambiguous, true);
    assert.deepEqual(result.expected, expected);
    assert.deepEqual(result.actual, [...alternate]);
  });
});
