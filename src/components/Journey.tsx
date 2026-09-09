"use client";
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import Logo from "./Logo";
import type { EngineRef } from "./Scene";
import type { SceneState, Vec3 } from "@/scene/engine";
import { CATEGORIES, clusterCenter, BAR_X, BAR_BOTTOM, BAR_MAX_H } from "@/scene/particles";
import type { Aggregate } from "@/lib/signals";
import type { OnboardingData } from "@/lib/questions";

const ICONS = [
  // huella
  <svg key="a" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 12a6 6 0 0 1 12 0c0 3-1 6-2 8" /><path d="M9 12a3 3 0 0 1 6 0c0 4-1 7-2 9" /><path d="M12 12v9" /><path d="M4 9a8 8 0 0 1 16 0" /></svg>,
  // agrupar
  <svg key="b" viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="6" r="2" /><circle cx="12" cy="6" r="2" /><circle cx="18" cy="6" r="2" /><circle cx="6" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="18" cy="12" r="2" /><circle cx="6" cy="18" r="2" /><circle cx="12" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></svg>,
  // patrones
  <svg key="c" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="10" cy="10" r="6" /><path d="m20 20-5.5-5.5" /><path d="M7 10h6M10 7v6" /></svg>,
  // insights
  <svg key="d" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="13" width="4" height="8" rx="1" /><rect x="10" y="8" width="4" height="13" rx="1" /><rect x="17" y="3" width="4" height="18" rx="1" /></svg>,
];
const STAGE_NAMES = ["Protegiendo identidad", "Agrupando respuestas", "Identificando patrones", "Generando insights"];

interface Step { title: string; text: string; stage: number; card: number; lock?: number; sway?: boolean }

export default function Journey({ state, engineRef, onboarding, token, aggregate, onFinish }: {
  state: MutableRefObject<SceneState>; engineRef: EngineRef; onboarding: OnboardingData; token: string;
  aggregate: Aggregate; onFinish: () => void;
}) {
  const first = onboarding.name.trim().split(/\s+/)[0] || "Tú";
  const steps: Step[] = [
    { title: `Esto eres tú en el mapa, ${first}`, text: "Tu nombre, tu correo, tu organización y tus respuestas de salud llegan juntos al sistema. Todavía es posible saber quién eres.", stage: 1, card: -1, lock: -Math.PI / 2, sway: true },
    { title: "Protegiendo identidad", text: "Nombre, correo y organización se separan del registro de salud y se guardan aparte, sin ninguna llave que los una. Lo que queda es un token aleatorio: desde aquí no hay camino de vuelta a ti.", stage: 2, card: 0 },
    { title: "Agrupando respuestas", text: `Tu registro se suma al de las otras ${aggregate.n - 1} personas de la sala. Todos los registros pesan igual y ya no se distingue cuál es cuál.`, stage: 3, card: 1 },
    { title: "Identificando patrones", text: "Las respuestas se leen por dimensión, nunca por persona: sueño, actividad física, antecedentes, prevención, alimentación y padecimientos.", stage: 4, card: 2 },
    { title: "Generando insights", text: "De la sala salen porcentajes, no personas. Esto es lo que hoy puede ver un hospital, un investigador o la industria: patrones colectivos, con la identidad de cada persona bloqueada.", stage: 5, card: 3, lock: 0 },
  ];
  const [i, setI] = useState(0);
  const [auto, setAuto] = useState(false);
  const tags = useRef<Record<string, HTMLDivElement | null>>({});
  const journey = useRef<HTMLDivElement>(null);
  const step = steps[i];

  useEffect(() => {
    const root = journey.current;
    const head = root?.querySelector<HTMLElement>(".head");
    const caption = root?.querySelector<HTMLElement>(".caption");
    if (!root || !head || !caption) return;
    const updateFrame = () => {
      const rect = root.getBoundingClientRect();
      state.current.bustFrame = {
        top: head.getBoundingClientRect().bottom - rect.top + 18,
        bottom: rect.width >= 900 ? rect.height - 80 : caption.getBoundingClientRect().top - rect.top - 18,
      };
    };
    const observer = new ResizeObserver(updateFrame);
    observer.observe(root); observer.observe(head); observer.observe(caption);
    updateFrame();
    return () => { observer.disconnect(); delete state.current.bustFrame; };
  }, [state, i]);

  useEffect(() => {
    const st = state.current;
    st.dim = 1; st.glow = 1; st.progress = 1;
    engineRef.current?.setBars(aggregate.bars.map((b) => b.pct));
  }, [state, engineRef, aggregate]);

  // Cada paso: etapa de la escena + etiquetas ancladas al mundo
  useEffect(() => {
    const st = state.current;
    st.stage = step.stage;
    st.lockAngle = step.lock ?? null;
    st.sway = !!step.sway;
    const L: { el: HTMLElement | null; pos: Vec3 }[] = [];
    const T = tags.current;
    if (step.stage === 1) {
      L.push({ el: T.name, pos: [0.2, 0.9, 1.6] }, { el: T.email, pos: [0.2, 0.1, -1.55] }, { el: T.company, pos: [0.2, -1.0, 1.7] });
    } else if (step.stage === 2) {
      L.push({ el: T.name2, pos: [1.25, 1.2, 0.4] }, { el: T.email2, pos: [-1.3, 0.9, 0.4] }, { el: T.company2, pos: [1.3, -0.2, 0.4] });
      L.push({ el: T.token, pos: [1.25, -1.25, 0] });
    } else if (step.stage === 3) {
      L.push({ el: T.n, pos: [0, -1.7, 0] });
    } else if (step.stage === 4) {
      CATEGORIES.forEach((_, k) => { const c = clusterCenter(k); L.push({ el: T["cat" + k], pos: [c[0], c[1] + 0.58, c[2]] }); });
    } else if (step.stage === 5) {
      aggregate.bars.forEach((b, k) => L.push({ el: T["bar" + k], pos: [BAR_X(k), BAR_BOTTOM + (b.pct / 100) * BAR_MAX_H + 0.34, 0] }));
    }
    st.labels = L;
    return () => { st.labels = []; };
  }, [i, step.stage, step.lock, step.sway, state, aggregate]);

  const next = useCallback(() => { if (i < steps.length - 1) setI(i + 1); else onFinish(); }, [i, steps.length, onFinish]);
  const back = useCallback(() => { if (i > 0) setI(i - 1); }, [i]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") { e.preventDefault(); next(); }
      if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [next, back]);

  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(next, 7500);
    return () => clearTimeout(t);
  }, [auto, i, next]);

  const tag = (id: string, cls: string, children: React.ReactNode) => (
    <div key={id} className={`tag ${cls}`} ref={(el) => { tags.current[id] = el; }} style={{ opacity: 0 }}>{children}</div>
  );

  return (
    <div className="journey" ref={journey}>
      <div className="head">
        <div className="row"><Logo /><span className="step">{i + 1} / {steps.length}</span></div>
        <div className="stages" aria-label="Etapas">
          {STAGE_NAMES.map((n, k) => (
            <div key={n} className={`stage ${step.card === k ? "on" : step.card > k ? "done" : ""}`}>
              <span className="ico">{ICONS[k]}</span>{n}
            </div>
          ))}
        </div>
      </div>

      <div className="stagearea" aria-hidden="true">
        {step.stage === 1 && <>
          {tag("name", "big", onboarding.name)}
          {tag("email", "", onboarding.email)}
          {tag("company", "", onboarding.company)}
        </>}
        {step.stage === 2 && <>
          {tag("name2", "dim", onboarding.name)}
          {tag("email2", "dim", onboarding.email)}
          {tag("company2", "dim", onboarding.company)}
          {tag("token", "token", token)}
        </>}
        {step.stage === 3 && tag("n", "orange", `${aggregate.n} registros · ninguno con nombre`)}
        {step.stage === 4 && CATEGORIES.map((c, k) => tag("cat" + k, "orange", c))}
        {step.stage === 5 && aggregate.bars.map((b, k) => tag("bar" + k, "bar", <><b>{b.pct}%</b>{b.label}</>))}
      </div>

      <div className="caption" key={i}>
        <div className="txt">
          <h2>{step.title}</h2>
          <p>{step.text}</p>
        </div>
        <div className="actions">
          <button className="btn ghost small" onClick={back} disabled={i === 0} aria-label="Anterior">←</button>
          <button className="btn" onClick={next}>{i === steps.length - 1 ? "Ver la radiografía de la sala" : "Siguiente"}</button>
          <button className={`btn ghost small`} onClick={() => setAuto(!auto)} aria-pressed={auto} title="Avance automático">{auto ? "Auto ●" : "Auto"}</button>
        </div>
      </div>
    </div>
  );
}
