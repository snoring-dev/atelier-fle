function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getGotenbergUrl(): string {
  return requireEnv("GOTENBERG_URL").replace(/\/$/, "");
}

export function getPublicInternalUrl(): string {
  return requireEnv("PUBLIC_INTERNAL_URL").replace(/\/$/, "");
}
