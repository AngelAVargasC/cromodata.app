"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { isAdmin, loginAdmin, logoutAdmin } from "@/lib/admin";

export async function login(formData: FormData) {
  const ok = await loginAdmin(String(formData.get("password") ?? ""));
  redirect(ok ? "/admin" : "/admin?error=1");
}

export async function logout() {
  await logoutAdmin();
  redirect("/admin");
}

// Borrado real (DELETE en la base), sin soft delete. Siempre con sesión de admin.
async function guard() { if (!(await isAdmin())) throw new Error("No autorizado"); }

export async function deleteParticipant(formData: FormData) {
  await guard();
  await prisma.participant.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/admin");
}

export async function deleteRecord(formData: FormData) {
  await guard();
  await prisma.healthRecord.delete({ where: { id: String(formData.get("id")) } });
  revalidatePath("/admin");
}

export async function deleteAll(formData: FormData) {
  await guard();
  const type = String(formData.get("type"));
  if (type === "perfil") await prisma.participant.deleteMany();
  else if (type === "salud") await prisma.healthRecord.deleteMany();
  else if (type === "todo") await prisma.$transaction([prisma.participant.deleteMany(), prisma.healthRecord.deleteMany()]);
  revalidatePath("/admin");
}
