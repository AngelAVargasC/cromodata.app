import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { roomAggregate } from "@/lib/room";
import type { OnboardingData, HealthData } from "@/lib/questions";

// Recibe el formulario completo y lo guarda en DOS tablas sin relación:
// Participant (identidad) y HealthRecord (salud, con token aleatorio).
export async function POST(req: Request) {
  let body: { onboarding: OnboardingData; health: HealthData };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  const { onboarding: o, health: h } = body ?? {};
  if (!o?.name || !o?.email || !h?.ageRange) return NextResponse.json({ error: "Faltan campos" }, { status: 400 });

  const token = "CD-" + randomBytes(6).toString("hex");
  await prisma.$transaction([
    prisma.participant.create({ data: {
      name: o.name, email: o.email, company: o.company ?? "", sector: o.sector ?? "", area: o.area ?? "",
      level: o.level ?? "", decision: o.decision ?? "", contact: o.contact ?? "",
    } }),
    prisma.healthRecord.create({ data: {
      token, ageRange: h.ageRange, conditions: JSON.stringify(h.conditions ?? []),
      familyHistory: JSON.stringify(h.familyHistory ?? []), activity: h.activity ?? "", sleep: h.sleep ?? "",
      checkup: h.checkup ?? "", stress: h.stress ?? "", health: h.health ?? "",
      tobacco: h.tobacco ?? null, ultraprocessed: h.ultraprocessed ?? null,
    } }),
  ]);
  const agg = await roomAggregate();
  return NextResponse.json({ token, aggregate: agg });
}
