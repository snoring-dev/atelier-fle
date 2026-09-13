import { costUsdFromOpenRouterUsage } from "./cost";
import { getOpenRouterApiKey } from "./env";

export {
  costUsdFromOpenRouterUsage,
  microsToUsd,
  usdToMicros,
} from "./cost";

const GENERATION_URL = "https://openrouter.ai/api/v1/generation";
const GENERATION_COST_RETRIES = 3;
const GENERATION_COST_RETRY_MS = 400;

type ProviderMetadataLike = {
  openrouter?: {
    usage?: unknown;
  };
};

type StreamCostSource = {
  usage?: PromiseLike<unknown> | unknown;
  providerMetadata?:
    | PromiseLike<ProviderMetadataLike | undefined>
    | ProviderMetadataLike;
  response?: PromiseLike<{ id?: string } | undefined> | { id?: string };
};

async function resolveMaybePromise<T>(value: PromiseLike<T> | T): Promise<T> {
  return await value;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch billed USD for a generation id via OpenRouter's generation endpoint.
 * Retries briefly — the endpoint can lag behind stream completion.
 */
export async function fetchGenerationCostUsd(
  generationId: string,
): Promise<number | null> {
  const headers = {
    Authorization: `Bearer ${getOpenRouterApiKey()}`,
  };

  for (let attempt = 0; attempt < GENERATION_COST_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(GENERATION_COST_RETRY_MS);
    }

    try {
      const res = await fetch(
        `${GENERATION_URL}?id=${encodeURIComponent(generationId)}`,
        { headers },
      );
      if (!res.ok) continue;

      const json = (await res.json()) as {
        data?: { total_cost?: unknown; usage?: unknown };
      };
      const totalCost = json.data?.total_cost;
      if (
        typeof totalCost === "number" &&
        Number.isFinite(totalCost) &&
        totalCost >= 0
      ) {
        return totalCost;
      }

      // Sometimes `usage` is the USD number itself on this endpoint.
      const usageField = json.data?.usage;
      if (
        typeof usageField === "number" &&
        Number.isFinite(usageField) &&
        usageField >= 0
      ) {
        return usageField;
      }

      const usageCost = costUsdFromOpenRouterUsage(
        typeof usageField === "object" && usageField !== null
          ? usageField
          : null,
      );
      if (usageCost != null) return usageCost;
    } catch {
      // Ignore and retry.
    }
  }

  return null;
}

/**
 * Extract billed USD from a streamText / generateText result.
 * Prefers providerMetadata.openrouter.usage.cost, then falls back to
 * GET /api/v1/generation?id=….
 * Never throws — returns null when cost cannot be determined.
 */
export async function costFromStreamResult(
  result: StreamCostSource,
): Promise<number | null> {
  try {
    const metadata = await resolveMaybePromise(result.providerMetadata);
    const fromMeta = costUsdFromOpenRouterUsage(metadata?.openrouter?.usage);
    if (fromMeta != null) return fromMeta;

    // Some providers surface cost on the top-level usage object.
    const usage = await resolveMaybePromise(result.usage);
    const fromUsage = costUsdFromOpenRouterUsage(usage);
    if (fromUsage != null) return fromUsage;

    const response = await resolveMaybePromise(result.response);
    const generationId = response?.id;
    if (typeof generationId === "string" && generationId.length > 0) {
      return await fetchGenerationCostUsd(generationId);
    }

    return null;
  } catch (err: unknown) {
    console.error("Failed to extract OpenRouter cost:", err);
    return null;
  }
}
