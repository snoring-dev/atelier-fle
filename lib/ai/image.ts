import { getImageModelId, getOpenRouterApiKey } from "./env";

/** Fixed suffix imposed by US-6.1. */
const PROMPT_SUFFIX =
  "line drawing, black ink on white, light hatching, no heavy fills, no text in the image";

const IMAGE_COUNT = 4;
/** 3:2 aspect required by US-6.1. */
const ASPECT_RATIO = "3:2";
const OPENROUTER_IMAGES_URL = "https://openrouter.ai/api/v1/images";

type ImageResponse = {
  data?: Array<{ b64_json?: string }>;
  error?: { message?: string };
};

function decodePng(b64: string): Uint8Array {
  const raw = b64.includes(",") ? b64.slice(b64.indexOf(",") + 1) : b64;
  return new Uint8Array(Buffer.from(raw, "base64"));
}

/**
 * Generate one line-drawing PNG via OpenRouter's Image API.
 * Gemini image models reject n > 1, so callers request four in parallel.
 */
async function generateOne(prompt: string): Promise<Uint8Array> {
  const res = await fetch(OPENROUTER_IMAGES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getOpenRouterApiKey()}`,
    },
    body: JSON.stringify({
      model: getImageModelId(),
      prompt,
      aspect_ratio: ASPECT_RATIO,
      resolution: "1K",
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `OpenRouter image API failed (${res.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`,
    );
  }

  const json = (await res.json()) as ImageResponse;
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error(json.error?.message ?? "OpenRouter image API returned no image");
  }
  return decodePng(b64);
}

/**
 * Generate four line-drawing PNG buffers for a fiche illustration.
 */
export async function generateFicheIllustrations(
  description: string,
): Promise<Uint8Array[]> {
  const prompt = `${description.trim()}. ${PROMPT_SUFFIX}`;
  return Promise.all(
    Array.from({ length: IMAGE_COUNT }, () => generateOne(prompt)),
  );
}
