import type { HealthData } from "./questions";

// Sala base simulada: la demo nunca arranca con el mapa vacío.
// Determinista (misma semilla → misma sala). Tasas cercanas a las del deck.
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(r: () => number, xs: [T, number][]): T {
  let u = r();
  for (const [v, p] of xs) { u -= p; if (u <= 0) return v; }
  return xs[xs.length - 1][0];
}

export function simulatedRoom(n = 120, seed = 20260909): HealthData[] {
  const r = mulberry32(seed);
  const out: HealthData[] = [];
  for (let i = 0; i < n; i++) {
    const stressed = r() < 0.31;
    const sleep = pick(r, [
      ["Menos de 6 horas", stressed ? 0.34 : 0.14], ["Entre 6 y menos de 7 horas", 0.22],
      ["Entre 7 y 9 horas", stressed ? 0.3 : 0.5], ["Más de 9 horas", 0.03], ["No tengo un horario regular", 0.1],
    ]);
    const ultra = pick(r, [["Casi nunca", 0.25], ["Uno o dos días por semana", 0.33], ["Entre tres y cuatro días por semana", 0.22], ["Cinco días o más por semana", 0.2]]);
    const fam = r() < 0.55;
    out.push({
      ageRange: pick(r, [["30–39 años", 0.3], ["40–49 años", 0.3], ["50–59 años", 0.22], ["18–29 años", 0.1], ["60–69 años", 0.08]]),
      conditions: r() < 0.38 ? [pick(r, [["Hipertensión", 0.3], ["Sobrepeso u obesidad", 0.3], ["Colesterol o triglicéridos elevados", 0.2], ["Ansiedad o depresión", 0.12], ["Diabetes", 0.08]])] : ["Ninguno"],
      familyHistory: fam ? [pick(r, [["Diabetes", 0.4], ["Hipertensión", 0.3], ["Cáncer", 0.2], ["Enfermedad cardiovascular", 0.1]])] : ["Ninguno"],
      activity: pick(r, [["No realizo actividad física", 0.24], ["Menos de 75 minutos", 0.25], ["Entre 75 y 149 minutos", 0.23], ["Entre 150 y 300 minutos", 0.2], ["Más de 300 minutos", 0.08]]),
      sleep,
      checkup: pick(r, [["Durante los últimos 6 meses", 0.3], ["Hace entre 6 y 12 meses", 0.22], ["Hace entre 1 y 2 años", 0.16], ["Hace más de 2 años", 0.16], ["No acostumbro realizarme chequeos", 0.1], ["No lo recuerdo", 0.06]]),
      stress: stressed ? pick(r, [["Más de la mitad de los días", 0.6], ["Casi todos los días", 0.4]]) : pick(r, [["Nunca", 0.3], ["Algunos días", 0.7]]),
      health: pick(r, [["Excelente", 0.08], ["Muy bueno", 0.22], ["Bueno", 0.4], ["Regular", 0.25], ["Malo", 0.05]]),
      tobacco: pick(r, [["Nunca he consumido", 0.55], ["Consumo ocasionalmente", 0.15], ["Consumo diariamente", 0.1], ["Consumía, pero dejé de hacerlo", 0.2]]),
      ultraprocessed: ultra,
    });
  }
  return out;
}
