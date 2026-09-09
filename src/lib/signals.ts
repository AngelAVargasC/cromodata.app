import type { HealthData } from "./questions";

// Señales de atención derivadas de cada registro (nunca un diagnóstico).
export interface Signals {
  sleepPoor: boolean;      // < 7 h o sin horario regular
  sleepUnder6: boolean;
  inactive: boolean;       // sin actividad o < 75 min
  familyHistory: boolean;  // algún antecedente declarado
  noCheckup: boolean;      // > 2 años, no acostumbra o no recuerda
  stressFrequent: boolean; // más de la mitad de los días o casi todos
  goodHealth: boolean;     // percepción excelente / muy buena / buena
  ultra5: boolean;         // ultraprocesados 5+ días
  hasCondition: boolean;   // algún padecimiento diagnosticado
  count: number;           // señales acumuladas por persona
}

const NEG = new Set(["Ninguno", "No lo sé", "Prefiero no responder"]);

export function deriveSignals(h: HealthData): Signals {
  const sleepUnder6 = h.sleep === "Menos de 6 horas";
  const sleepPoor = sleepUnder6 || h.sleep === "Entre 6 y menos de 7 horas" || h.sleep === "No tengo un horario regular";
  const inactive = h.activity === "No realizo actividad física" || h.activity === "Menos de 75 minutos";
  const familyHistory = h.familyHistory.some((x) => !NEG.has(x));
  const noCheckup = ["Hace más de 2 años", "No acostumbro realizarme chequeos", "No lo recuerdo"].includes(h.checkup);
  const stressFrequent = ["Más de la mitad de los días", "Casi todos los días"].includes(h.stress);
  const goodHealth = ["Excelente", "Muy bueno", "Bueno"].includes(h.health);
  const ultra5 = h.ultraprocessed === "Cinco días o más por semana";
  const hasCondition = h.conditions.some((x) => !NEG.has(x));
  const count = [sleepPoor, inactive, familyHistory, noCheckup, stressFrequent, ultra5, hasCondition].filter(Boolean).length;
  return { sleepPoor, sleepUnder6, inactive, familyHistory, noCheckup, stressFrequent, goodHealth, ultra5, hasCondition, count };
}

export interface Aggregate {
  n: number;            // personas en el mapa
  nReal: number;        // registros reales en la base
  bars: { label: string; pct: number }[];   // radiografía principal
  extra: { label: string; pct: number }[];  // señales adicionales
  crosses: { pct: number; text: string }[]; // relaciones entre señales
  threePlus: number;    // % con 3+ señales
  paradox: number;      // % que se percibe bien pero acumula 2+ señales
}

const pct = (k: number, n: number) => (n ? Math.round((100 * k) / n) : 0);

export function aggregate(records: HealthData[], nReal: number): Aggregate {
  const s = records.map(deriveSignals);
  const n = s.length;
  const c = (f: (x: Signals) => boolean) => s.filter(f).length;
  const among = (cond: (x: Signals) => boolean, f: (x: Signals) => boolean) => {
    const base = s.filter(cond);
    return pct(base.filter(f).length, base.length);
  };
  return {
    n, nReal,
    bars: [
      { label: "Sueño insuficiente", pct: pct(c((x) => x.sleepPoor), n) },
      { label: "Inactividad física", pct: pct(c((x) => x.inactive), n) },
      { label: "Antecedentes familiares", pct: pct(c((x) => x.familyHistory), n) },
      { label: "Ausencia de chequeos", pct: pct(c((x) => x.noCheckup), n) },
    ],
    extra: [
      { label: "Estrés frecuente", pct: pct(c((x) => x.stressFrequent), n) },
      { label: "Buena salud percibida", pct: pct(c((x) => x.goodHealth), n) },
      { label: "Algún padecimiento diagnosticado", pct: pct(c((x) => x.hasCondition), n) },
      { label: "Ultraprocesados 5+ días por semana", pct: pct(c((x) => x.ultra5), n) },
    ],
    crosses: [
      { pct: among((x) => x.sleepUnder6, (x) => x.stressFrequent), text: "de quienes duermen menos de seis horas también declara estrés frecuente." },
      { pct: among((x) => x.ultra5, (x) => x.sleepPoor), text: "de quienes consumen ultraprocesados cinco días o más también reporta dormir menos de siete horas o sin horario regular." },
      { pct: among((x) => x.familyHistory, (x) => x.noCheckup), text: "de quienes tienen antecedentes familiares no se ha hecho un chequeo en los últimos dos años." },
    ],
    threePlus: pct(c((x) => x.count >= 3), n),
    paradox: pct(c((x) => x.goodHealth && x.count >= 2), n),
  };
}
