function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getOpenRouterApiKey(): string {
  return requireEnv("OPENROUTER_API_KEY");
}

export function getModelId(): string {
  return requireEnv("MODEL_ID");
}

/** OpenRouter image model. Override with IMAGE_MODEL_ID. */
export function getImageModelId(): string {
  return process.env.IMAGE_MODEL_ID ?? "google/gemini-3.1-flash-image";
}
