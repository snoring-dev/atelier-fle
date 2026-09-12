import { jwtVerify, SignJWT } from "jose";
import { getAuthSecret } from "@/lib/auth/env";

const PRINT_TTL_SECONDS = 60;

function secretKey(): Uint8Array {
  return new TextEncoder().encode(getAuthSecret());
}

export async function createPrintToken(ficheId: number): Promise<string> {
  return new SignJWT({ typ: "print", ficheId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${PRINT_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function verifyPrintToken(
  token: string,
  ficheId: number,
): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
    });
    return payload.typ === "print" && payload.ficheId === ficheId;
  } catch {
    return false;
  }
}
