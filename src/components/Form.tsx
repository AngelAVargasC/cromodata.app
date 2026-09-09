"use client";
import { useEffect, useMemo, useState, type MutableRefObject } from "react";
import Logo from "./Logo";
import { ONBOARDING, HEALTH, type Answers, type Question } from "@/lib/questions";
import type { SceneState } from "@/scene/engine";

type Step =
  | { kind: "notice" }
  | { kind: "section"; title: string; text: string; bullets?: string[]; cta: string }
  | { kind: "q"; q: Question; section: string };

const STEPS: Step[] = [
  { kind: "notice" },
  ...ONBOARDING.map((q): Step => ({ kind: "q", q, section: "Onboarding profesional" })),
  {
    kind: "section", title: "Ahora, sobre tu salud",
    text: "Ocho preguntas breves y dos opcionales. Ninguna respuesta se guarda junto a tu nombre.",
    bullets: ["Puedes elegir «Prefiero no responder» en cualquiera.", "Los resultados se muestran solo de forma agregada.", "Esta experiencia no sustituye una valoración médica."],
    cta: "Continuar",
  },
  ...HEALTH.map((q): Step => ({ kind: "q", q, section: q.optional ? "Pregunta opcional" : "Preguntas de salud" })),
];
const TOTAL_Q = ONBOARDING.length + HEALTH.length;

const emailOk = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export default function Form({ state, onDone, onBack }: {
  state: MutableRefObject<SceneState>; onDone: (a: Answers) => void; onBack: () => void;
}) {
  const [i, setI] = useState(0);
  const [a, setA] = useState<Answers>({});
  const [err, setErr] = useState("");
  const step = STEPS[i];
  const answered = useMemo(() => [...ONBOARDING, ...HEALTH].filter((q) => {
    const v = a[q.id]; return Array.isArray(v) ? v.length > 0 : !!v;
  }).length, [a]);

  useEffect(() => {
    const st = state.current;
    st.stage = 0; st.dim = 0.6; st.glow = 1; st.lockAngle = null; st.sway = false; st.labels = [];
    st.progress = 0.02;
  }, [state]);
  useEffect(() => { state.current.progress = 0.02 + 0.98 * (answered / TOTAL_Q); }, [answered, state]);
  useEffect(() => { setErr(""); }, [i]);

  const qIndex = STEPS.slice(0, i + 1).filter((s) => s.kind === "q").length;

  function valid(): string {
    if (step.kind !== "q") return "";
    const v = a[step.q.id];
    if (step.q.optional) return "";
    if (step.q.type === "multi") return Array.isArray(v) && v.length ? "" : "Elige al menos una opción.";
    if (step.q.type === "email") return typeof v === "string" && emailOk(v.trim()) ? "" : "Escribe un correo válido.";
    return typeof v === "string" && v.trim() ? "" : "Necesitamos esta respuesta para continuar.";
  }
  function next() {
    const e = valid();
    if (e) { setErr(e); return; }
    if (i === STEPS.length - 1) onDone(a); else setI(i + 1);
  }
  function back() { if (i === 0) onBack(); else setI(i - 1); }
  function setSingle(id: string, v: string) { setA({ ...a, [id]: v }); }
  function toggleMulti(q: Question, v: string) {
    const cur = Array.isArray(a[q.id]) ? (a[q.id] as string[]) : [];
    const excl = q.exclusive ?? [];
    let nxt: string[];
    if (cur.includes(v)) nxt = cur.filter((x) => x !== v);
    else if (excl.includes(v)) nxt = [v];
    else nxt = [...cur.filter((x) => !excl.includes(x)), v];
    setA({ ...a, [q.id]: nxt });
  }

  return (
    <div className="form">
      <div className="head">
        <Logo />
        <span className="count">{step.kind === "q" ? `${qIndex} / ${TOTAL_Q}` : ""}</span>
      </div>
      <div className="bar"><i style={{ width: `${(100 * qIndex) / TOTAL_Q}%` }} /></div>

      <div className="body" key={i}>
        {step.kind === "notice" && (
          <div className="section-card">
            <h2>Antes de empezar</h2>
            <p>Tres cosas que pasan con lo que respondas:</p>
            <div className="notice"><div className="items">
              <div className="item"><b>Respuestas</b><span>Se anonimizan.</span></div>
              <div className="item"><b>Resultados</b><span>Se muestran de forma agregada.</span></div>
              <div className="item"><b>Identidad</b><span>Permanece protegida.</span></div>
            </div></div>
            <p>Al final verás, paso a paso, cómo tus datos dejan de ser tuyos y pasan a ser de la sala.</p>
          </div>
        )}
        {step.kind === "section" && (
          <div className="section-card">
            <h2>{step.title}</h2>
            <p>{step.text}</p>
            {step.bullets && <ul>{step.bullets.map((b) => <li key={b}>{b}</li>)}</ul>}
          </div>
        )}
        {step.kind === "q" && (
          <div className="q">
            <span className="section">{step.section}</span>
            <h2>{step.q.q}</h2>
            {step.q.help && <p className="help">{step.q.help}</p>}
            {(step.q.type === "text" || step.q.type === "email") && (
              <input
                className="field" autoFocus type={step.q.type} inputMode={step.q.type === "email" ? "email" : "text"}
                autoComplete={step.q.id === "name" ? "name" : step.q.id === "email" ? "email" : "organization"}
                placeholder={step.q.placeholder} value={(a[step.q.id] as string) ?? ""}
                onChange={(e) => setSingle(step.q.id, e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") next(); }}
              />
            )}
            {step.q.type === "single" && (
              <div className={`opts ${step.q.opts!.length > 5 ? "two" : ""}`}>
                {step.q.opts!.map((o) => (
                  <button key={o} type="button" className={`opt ${a[step.q.id] === o ? "on" : ""}`} onClick={() => setSingle(step.q.id, o)}>
                    <i /> {o}
                  </button>
                ))}
              </div>
            )}
            {step.q.type === "multi" && (() => {
              const cur = Array.isArray(a[step.q.id]) ? (a[step.q.id] as string[]) : [];
              const exclOn = cur.some((x) => step.q.exclusive?.includes(x));
              return (
                <div className="opts two">
                  {step.q.opts!.map((o) => {
                    const on = cur.includes(o);
                    const off = exclOn && !on;
                    return (
                      <button key={o} type="button" className={`opt multi ${on ? "on" : ""} ${off ? "off" : ""}`} onClick={() => toggleMulti(step.q, o)} aria-pressed={on}>
                        <i /> {o}
                      </button>
                    );
                  })}
                </div>
              );
            })()}
            {step.q.note && <p className="note">{step.q.note}</p>}
            {err && <span className="err" role="alert">{err}</span>}
          </div>
        )}
      </div>

      <div className="foot">
        <button className="btn ghost small" onClick={back}>Atrás</button>
        <span className="grow" />
        {step.kind === "q" && step.q.optional && !a[step.q.id] && (
          <button className="btn ghost small" onClick={() => (i === STEPS.length - 1 ? onDone(a) : setI(i + 1))}>Omitir</button>
        )}
        <button className="btn" onClick={next}>
          {step.kind === "notice" ? "Empezar" : step.kind === "section" ? step.cta : i === STEPS.length - 1 ? "Enviar y ver qué pasa" : "Continuar"}
        </button>
      </div>
    </div>
  );
}
