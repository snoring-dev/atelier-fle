/** Convert USD to integer microdollars for exact SQLite increments. */
export function usdToMicros(usd: number): number {
  if (!Number.isFinite(usd) || usd < 0) return 0;
  return Math.round(usd * 1_000_000);
}

/** Convert microdollars back to USD. */
export function microsToUsd(micros: number): number {
  if (!Number.isFinite(micros) || micros < 0) return 0;
  return micros / 1_000_000;
}

/** Pull `cost` (USD) from an OpenRouter usage object when present. */
export function costUsdFromOpenRouterUsage(usage: unknown): number | null {
  if (typeof usage !== "object" || usage === null) return null;
  const cost = (usage as { cost?: unknown }).cost;
  if (typeof cost !== "number" || !Number.isFinite(cost) || cost < 0) {
    return null;
  }
  return cost;
}
