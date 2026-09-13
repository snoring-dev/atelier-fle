import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { costUsdFromOpenRouterUsage, microsToUsd, usdToMicros } from "./cost";

describe("ai cost helpers", () => {
  it("usdToMicros rounds to nearest microdollar", () => {
    assert.equal(usdToMicros(0.001234), 1234);
    assert.equal(usdToMicros(0.0012345), 1235);
    assert.equal(usdToMicros(0), 0);
  });

  it("usdToMicros rejects non-finite and negative values", () => {
    assert.equal(usdToMicros(Number.NaN), 0);
    assert.equal(usdToMicros(Number.POSITIVE_INFINITY), 0);
    assert.equal(usdToMicros(-0.5), 0);
  });

  it("microsToUsd converts back", () => {
    assert.equal(microsToUsd(1234), 0.001234);
    assert.equal(microsToUsd(0), 0);
  });

  it("costUsdFromOpenRouterUsage reads cost when present", () => {
    assert.equal(costUsdFromOpenRouterUsage({ cost: 0.042 }), 0.042);
    assert.equal(costUsdFromOpenRouterUsage({ cost: 0 }), 0);
  });

  it("costUsdFromOpenRouterUsage ignores missing or invalid cost", () => {
    assert.equal(costUsdFromOpenRouterUsage(null), null);
    assert.equal(costUsdFromOpenRouterUsage({}), null);
    assert.equal(costUsdFromOpenRouterUsage({ cost: "0.1" }), null);
    assert.equal(costUsdFromOpenRouterUsage({ cost: -1 }), null);
    assert.equal(costUsdFromOpenRouterUsage({ cost: Number.NaN }), null);
  });
});
