// Formulario oficial de la experiencia (onboarding profesional + preguntas médicas).

export type QType = "text" | "email" | "single" | "multi";

export interface Question {
  id: string;
  q: string;
  type: QType;
  opts?: string[];
  /** Opciones que desactivan a las demás (regla de interfaz). */
  exclusive?: string[];
  help?: string;
  note?: string;
  placeholder?: string;
  optional?: boolean;
  /** Dato identificable: se separa del registro de salud. */
  identity?: boolean;
}

export const NO_RESP = "Prefiero no responder";

export const ONBOARDING: Question[] = [
  { id: "name", q: "¿Cuál es tu nombre?", type: "text", placeholder: "Nombre y apellido", identity: true },
  { id: "email", q: "¿Cuál es tu correo profesional?", type: "email", placeholder: "nombre@empresa.com", identity: true },
  { id: "company", q: "¿En qué empresa u organización trabajas?", type: "text", placeholder: "Organización", identity: true },
  {
    id: "sector", q: "¿En qué sector participas?", type: "single",
    opts: ["Hospital o institución de salud", "Industria farmacéutica", "Dispositivos médicos", "Investigación o academia", "Healthtech o tecnología", "Aseguradora", "Gobierno o regulación", "Consultoría o servicios", "Otro"],
  },
  {
    id: "area", q: "¿Cuál es tu área principal?", type: "single",
    opts: ["Dirección general", "Innovación o transformación digital", "Datos, analítica o inteligencia artificial", "Tecnología", "Investigación clínica o médica", "Operaciones", "Comercial o desarrollo de negocio", "Legal, privacidad o cumplimiento", "Otra"],
  },
  {
    id: "level", q: "¿Cuál es tu nivel dentro de la organización?", type: "single",
    opts: ["Dirección general o C-Level", "Vicepresidencia", "Dirección", "Gerencia", "Coordinación o especialidad", "Otro"],
  },
  {
    id: "decision", q: "¿Participas en decisiones relacionadas con datos, tecnología o innovación?", type: "single",
    opts: ["Tomo la decisión final", "Participo directamente en la decisión", "Recomiendo o evalúo soluciones", "Utilizo las soluciones", "No participo actualmente"],
  },
  {
    id: "contact", q: "¿Te gustaría conocer más sobre Cromodata?", type: "single",
    opts: ["Sí, quiero conversar con el equipo", "Sí, quiero recibir información", "No por ahora"],
  },
];

export const HEALTH: Question[] = [
  {
    id: "ageRange", q: "¿Cuál es tu rango de edad?", type: "single",
    opts: ["18–29 años", "30–39 años", "40–49 años", "50–59 años", "60–69 años", "70 años o más", NO_RESP],
  },
  {
    id: "conditions", q: "¿Algún profesional de la salud te ha diagnosticado alguno de estos padecimientos?", type: "multi",
    opts: ["Diabetes", "Hipertensión", "Colesterol o triglicéridos elevados", "Sobrepeso u obesidad", "Enfermedad cardiovascular", "Enfermedad respiratoria crónica", "Enfermedad renal", "Ansiedad o depresión", "Otro padecimiento crónico", "Ninguno", NO_RESP],
    exclusive: ["Ninguno", NO_RESP],
  },
  {
    id: "familyHistory", q: "¿Existen antecedentes en tu familia directa de alguno de estos padecimientos?", type: "multi",
    opts: ["Diabetes", "Hipertensión", "Enfermedad cardiovascular", "Cáncer", "Enfermedad renal", "Sobrepeso u obesidad", "Ansiedad o depresión", "Otro padecimiento crónico", "Ninguno", "No lo sé", NO_RESP],
    exclusive: ["Ninguno", "No lo sé", NO_RESP],
    help: "Considera madre, padre, hermanas, hermanos, hijas o hijos.",
  },
  {
    id: "activity", q: "¿Cuántos minutos de actividad física moderada realizas aproximadamente por semana?", type: "single",
    opts: ["No realizo actividad física", "Menos de 75 minutos", "Entre 75 y 149 minutos", "Entre 150 y 300 minutos", "Más de 300 minutos", "No lo sé", NO_RESP],
    help: "Por ejemplo: caminar rápido, andar en bicicleta, bailar o realizar ejercicio.",
  },
  {
    id: "sleep", q: "¿Cuántas horas duermes normalmente por noche?", type: "single",
    opts: ["Menos de 6 horas", "Entre 6 y menos de 7 horas", "Entre 7 y 9 horas", "Más de 9 horas", "No tengo un horario regular", NO_RESP],
  },
  {
    id: "checkup", q: "¿Cuándo fue tu último chequeo preventivo general?", type: "single",
    opts: ["Durante los últimos 6 meses", "Hace entre 6 y 12 meses", "Hace entre 1 y 2 años", "Hace más de 2 años", "No acostumbro realizarme chequeos", "No lo recuerdo", NO_RESP],
  },
  {
    id: "stress", q: "Durante las últimas dos semanas, ¿con qué frecuencia sentiste estrés que afectara tu descanso o tus actividades?", type: "single",
    opts: ["Nunca", "Algunos días", "Más de la mitad de los días", "Casi todos los días", NO_RESP],
    note: "Esta respuesta no se usa para inferir un diagnóstico de ansiedad o depresión.",
  },
  {
    id: "health", q: "En general, ¿cómo calificarías actualmente tu estado de salud?", type: "single",
    opts: ["Excelente", "Muy bueno", "Bueno", "Regular", "Malo", NO_RESP],
  },
  {
    id: "tobacco", q: "¿Cuál de estas opciones describe mejor tu consumo de tabaco?", type: "single", optional: true,
    opts: ["Nunca he consumido", "Consumo ocasionalmente", "Consumo diariamente", "Consumía, pero dejé de hacerlo", NO_RESP],
  },
  {
    id: "ultraprocessed", q: "¿Con qué frecuencia consumes bebidas azucaradas o alimentos ultraprocesados?", type: "single", optional: true,
    opts: ["Casi nunca", "Uno o dos días por semana", "Entre tres y cuatro días por semana", "Cinco días o más por semana", "No lo sé", NO_RESP],
  },
];

export type Answers = Record<string, string | string[] | undefined>;

export interface OnboardingData {
  name: string; email: string; company: string; sector: string;
  area: string; level: string; decision: string; contact: string;
}
export interface HealthData {
  ageRange: string; conditions: string[]; familyHistory: string[];
  activity: string; sleep: string; checkup: string; stress: string; health: string;
  tobacco?: string; ultraprocessed?: string;
}

export function splitAnswers(a: Answers): { onboarding: OnboardingData; health: HealthData } {
  const s = (k: string) => (typeof a[k] === "string" ? (a[k] as string) : "");
  const m = (k: string) => (Array.isArray(a[k]) ? (a[k] as string[]) : []);
  return {
    onboarding: {
      name: s("name"), email: s("email"), company: s("company"), sector: s("sector"),
      area: s("area"), level: s("level"), decision: s("decision"), contact: s("contact"),
    },
    health: {
      ageRange: s("ageRange"), conditions: m("conditions"), familyHistory: m("familyHistory"),
      activity: s("activity"), sleep: s("sleep"), checkup: s("checkup"), stress: s("stress"),
      health: s("health"), tobacco: s("tobacco") || undefined, ultraprocessed: s("ultraprocessed") || undefined,
    },
  };
}
