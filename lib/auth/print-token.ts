import { jwtVerify, SignJWT } from "jose";
import { getAuthSecret } from "@/lib/auth/env";

const PRINT_TTL_SECONDS = 60;
/** Same jti accepted again within this window (proxy double-hit / Chromium). */
const CONSUME_GRACE_MS = 10_000;

declare global {
  var __printTokenConsumed: Map<string, number> | undefined;
}

function consumedStore(): Map<string, number> {
  if (!globalThis.__printTokenConsumed) {
    globalThis.__printTokenConsumed = new Map();
  }
  return globalThis.__printTokenConsumed;
}

function secretKey(): Uint8Array {
  return new TextEncoder().encode(getAuthSecret());
}

function pruneConsumed(now: number): void {
  const store = consumedStore();
  for (const [jti, at] of store) {
    if (now - at > PRINT_TTL_SECONDS * 1000) {
      store.delete(jti);
    }
  }
}

/**
 * Cryptographic verify only (signature, typ, ficheId, expiry).
 * Does not consume the token — use {@link consumePrintToken} in the proxy.
 */
export async function verifyPrintToken(
  token: string,
  ficheId: number,
): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
    });
    return (
      payload.typ === "print" &&
      payload.ficheId === ficheId &&
      typeof payload.jti === "string" &&
      payload.jti.length > 0
    );
  } catch {
    return false;
  }
}

/**
 * Verify then consume jti. Within {@link CONSUME_GRACE_MS} after first consume,
 * the same token still passes (Chromium + Next may hit the proxy twice).
 */
export async function consumePrintToken(
  token: string,
  ficheId: number,
): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
    });
    if (
      payload.typ !== "print" ||
      payload.ficheId !== ficheId ||
      typeof payload.jti !== "string" ||
      !payload.jti
    ) {
      return false;
    }

    const now = Date.now();
    pruneConsumed(now);
    const store = consumedStore();
    const previous = store.get(payload.jti);
    if (previous !== undefined && now - previous > CONSUME_GRACE_MS) {
      return false;
    }
    if (previous === undefined) {
      store.set(payload.jti, now);
    }
    return true;
  } catch {
    return false;
  }
}

export async function createPrintToken(ficheId: number): Promise<string> {
  const jti = crypto.randomUUID();
  return new SignJWT({ typ: "print", ficheId })
    .setProtectedHeader({ alg: "HS256" })
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(`${PRINT_TTL_SECONDS}s`)
    .sign(secretKey());
}
