"use server";
import { redirect } from "next/navigation";
import { loginAdmin, logoutAdmin } from "@/lib/admin";

export async function login(formData: FormData) {
  const ok = await loginAdmin(String(formData.get("password") ?? ""));
  redirect(ok ? "/admin" : "/admin?error=1");
}

export async function logout() {
  await logoutAdmin();
  redirect("/admin");
}
