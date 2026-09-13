import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { splitReadingParagraphs } from "./reading-paragraphs";

describe("splitReadingParagraphs", () => {
  it("returns empty for blank input", () => {
    assert.deepEqual(splitReadingParagraphs(""), []);
    assert.deepEqual(splitReadingParagraphs("   \n  "), []);
  });

  it("splits on blank lines and collapses inner whitespace", () => {
    const text = "Début ici.\n\nTension  là.\n\n\nRésolution.";
    assert.deepEqual(splitReadingParagraphs(text), [
      "Début ici.",
      "Tension là.",
      "Résolution.",
    ]);
  });

  it("falls back to three sentence groups for a single blob", () => {
    const text =
      "Marc arrive. Il cherche son billet. Puis il panique. " +
      "Le guichet est ouvert. Il achète un nouveau billet. " +
      "Finalement il profite du concert.";
    const parts = splitReadingParagraphs(text);
    assert.equal(parts.length, 3);
    assert.ok(parts.every((p) => p.length > 0));
    assert.equal(parts.join(" "), text);
  });

  it("returns fewer parts when there are fewer sentences than groups", () => {
    assert.deepEqual(splitReadingParagraphs("Une seule phrase."), [
      "Une seule phrase.",
    ]);
    assert.deepEqual(splitReadingParagraphs("Première. Deuxième."), [
      "Première.",
      "Deuxième.",
    ]);
  });

  it("keeps blank-line paragraphs even if more than three", () => {
    const text = "A.\n\nB.\n\nC.\n\nD.";
    assert.deepEqual(splitReadingParagraphs(text), ["A.", "B.", "C.", "D."]);
  });
});
