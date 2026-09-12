"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, sessionCookieOptions } from "@/lib/auth/session";

export type LoginState = {
  error?: string;
};

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = formData.get("password");
  if (typeof password !== "string" || password.length === 0) {
    return { error: "Mot de passe incorrect" };
  }

  const ok = await verifyPassword(password);
  if (!ok) {
    return { error: "Mot de passe incorrect" };
  }

  const token = await createSessionToken();
  const cookieStore = await cookies();
  const options = sessionCookieOptions(token);
  cookieStore.set(options);

  redirect("/");
}
