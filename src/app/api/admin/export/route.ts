import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const csv = (rows: Record<string, unknown>[], cols: string[]) =>
  "﻿" + [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\r\n");

export async function GET(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const type = new URL(req.url).searchParams.get("type") === "salud" ? "salud" : "perfil";
  let body: string;
  if (type === "perfil") {
    const rows = await prisma.participant.findMany({ orderBy: { createdAt: "desc" } });
    body = csv(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })), ["createdAt", "name", "email", "company", "sector", "area", "level", "decision", "contact"]);
  } else {
    const rows = await prisma.healthRecord.findMany({ orderBy: { createdAt: "desc" } });
    body = csv(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })), ["createdAt", "token", "ageRange", "conditions", "familyHistory", "activity", "sleep", "checkup", "stress", "health", "tobacco", "ultraprocessed"]);
  }
  return new NextResponse(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="cromodata-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
