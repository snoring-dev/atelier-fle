function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** Strip optional surrounding quotes. */
function unquote(value: string): string {
  if (
    (value.startsWith("'") && value.endsWith("'")) ||
    (value.startsWith('"') && value.endsWith('"'))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

/**
 * Decode AUTH_PASSWORD_HASH. Prefer base64 (from `pnpm auth:hash`) so dotenv
 * cannot expand `$` inside an argon2 encoded string. Raw `$argon2…` still works
 * if the value was loaded without expansion.
 */
export function decodePasswordHash(raw: string): string {
  const value = unquote(raw).replaceAll("\\$", "$");
  if (value.startsWith("$argon2")) {
    return value;
  }
  const decoded = Buffer.from(value, "base64").toString("utf8");
  if (!decoded.startsWith("$argon2")) {
    throw new Error(
      "AUTH_PASSWORD_HASH must be a base64-encoded argon2 hash (pnpm auth:hash)",
    );
  }
  return decoded;
}

export function getAuthSecret(): string {
  return unquote(requireEnv("AUTH_SECRET"));
}

export function getAuthPasswordHash(): string {
  return decodePasswordHash(requireEnv("AUTH_PASSWORD_HASH"));
}
