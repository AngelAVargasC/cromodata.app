import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// Vista /admin protegida por contraseña (ADMIN_PASSWORD). La cookie guarda una firma
// HMAC de la contraseña, así cambiarla en Railway invalida todas las sesiones.
const COOKIE = "cd_admin";

export function adminPassword(): string | null {
  const p = process.env.ADMIN_PASSWORD;
  return p && p.length >= 4 ? p : null;
}

function sign(p: string): string {
  return createHmac("sha256", "cromodata-admin:" + p).update("ok").digest("hex");
}

export async function isAdmin(): Promise<boolean> {
  const p = adminPassword();
  if (!p) return false;
  const c = (await cookies()).get(COOKIE)?.value ?? "";
  const expected = sign(p);
  if (c.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(c), Buffer.from(expected));
}

export async function loginAdmin(password: string): Promise<boolean> {
  const p = adminPassword();
  if (!p || password !== p) return false;
  (await cookies()).set(COOKIE, sign(p), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 12,
  });
  return true;
}

export async function logoutAdmin() {
  (await cookies()).delete(COOKIE);
}
