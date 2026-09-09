import { prisma } from "./db";
import { aggregate, type Aggregate } from "./signals";
import { simulatedRoom } from "./simulation";
import type { HealthData } from "./questions";

// Personas simuladas que "ya están en la sala". ROOM_BASELINE=0 para usar solo datos reales.
const BASELINE = Number(process.env.ROOM_BASELINE ?? 120);

export async function roomAggregate(): Promise<Aggregate> {
  const rows = await prisma.healthRecord.findMany({ orderBy: { createdAt: "asc" } });
  const real: HealthData[] = rows.map((r) => ({
    ageRange: r.ageRange, conditions: JSON.parse(r.conditions), familyHistory: JSON.parse(r.familyHistory),
    activity: r.activity, sleep: r.sleep, checkup: r.checkup, stress: r.stress, health: r.health,
    tobacco: r.tobacco ?? undefined, ultraprocessed: r.ultraprocessed ?? undefined,
  }));
  return aggregate([...simulatedRoom(BASELINE), ...real], real.length);
}
