import { prisma } from "./db";
import { aggregate, type Aggregate } from "./signals";
import { simulatedRoom } from "./simulation";
import type { HealthData } from "./questions";

// Personas simuladas que "ya están en la sala". ROOM_BASELINE=0 para usar solo datos reales.
const BASELINE = Number(process.env.ROOM_BASELINE ?? 120);

export async function roomAggregate(): Promise<Aggregate> {
  let real: HealthData[] = [];
  try {
    const rows = await prisma.healthRecord.findMany({ orderBy: { createdAt: "asc" } });
    real = rows.map((r) => ({
      ageRange: r.ageRange, conditions: JSON.parse(r.conditions), familyHistory: JSON.parse(r.familyHistory),
      activity: r.activity, sleep: r.sleep, checkup: r.checkup, stress: r.stress, health: r.health,
      tobacco: r.tobacco ?? undefined, ultraprocessed: r.ultraprocessed ?? undefined,
    }));
  } catch (e) {
    // Sin base de datos, la demo sigue con la sala simulada.
    console.error("[room] no se pudo leer HealthRecord:", (e as Error).message);
  }
  return aggregate([...simulatedRoom(BASELINE), ...real], real.length);
}
