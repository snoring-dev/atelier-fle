import { verify } from "@node-rs/argon2";
import { getAuthPasswordHash } from "@/lib/auth/env";

export async function verifyPassword(plain: string): Promise<boolean> {
  try {
    const hash = getAuthPasswordHash();
    return await verify(hash, plain);
  } catch {
    return false;
  }
}
