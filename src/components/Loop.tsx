"use client";
import { useEffect, useRef, useState, type MutableRefObject } from "react";
import Logo from "./Logo";
import HealthOrbit from "./HealthOrbit";
import type { EngineRef } from "./Scene";
import type { SceneState, Vec3 } from "@/scene/engine";

// Persona de demostración: sus atributos flotan junto al busto y se tachan al anonimizar.
const DEMO = { name: "Keila Barral", email: "keila@cromodata.com", company: "Cromodata", token: "CD-7f3a91c2e5b4" };

// Modo presentación: solo la animación, en ciclo, sin textos ni controles.
// Esc o el botón de la esquina salen. Pensado para dejarlo corriendo en una pantalla.
const CYCLE: { stage: number; ms: number; lock: number | null; sway?: boolean }[] = [
  { stage: 0, ms: 6000, lock: null },
  { stage: 1, ms: 9000, lock: -Math.PI / 2, sway: true }, // como en el recorrido: la cara gira
  { stage: 2, ms: 6000, lock: null },
  { stage: 3, ms: 6000, lock: null },
  { stage: 4, ms: 6500, lock: null },
  { stage: 5, ms: 7000, lock: 0 },
];

export default function Loop({ state, engineRef, onExit }: { state: MutableRefObject<SceneState>; engineRef: EngineRef; onExit: () => void }) {
  const [i, setI] = useState(0);
  const tags = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const st = state.current;
    st.dim = 1; st.glow = 1; st.progress = 1; st.labels = [];
    fetch("/api/aggregate").then((r) => r.json())
      .then((a: { bars: { pct: number }[] }) => engineRef.current?.setBars(a.bars.map((b) => b.pct)))
      .catch(() => engineRef.current?.setBars([48, 50, 66, 28]));
  }, [state, engineRef]);

  useEffect(() => {
    const step = CYCLE[i];
    const st = state.current;
    st.stage = step.stage; st.lockAngle = step.lock; st.sway = !!step.sway;
    // Etiquetas de la persona demo, ancladas al mundo como en el recorrido.
    const T = tags.current;
    const L: { el: HTMLElement | null; pos: Vec3 }[] = [];
    if (step.stage === 1) {
      L.push({ el: T.name, pos: [0.2, 0.9, 1.6] }, { el: T.email, pos: [0.2, 0.1, -1.55] }, { el: T.company, pos: [0.2, -1.0, 1.7] });
    } else if (step.stage === 2) {
      L.push({ el: T.name2, pos: [1.25, 1.2, 0.4] }, { el: T.email2, pos: [-1.3, 0.9, 0.4] }, { el: T.company2, pos: [1.3, -0.2, 0.4] }, { el: T.token, pos: [1.25, -1.25, 0] });
    }
    st.labels = L;
    const t = setTimeout(() => setI((i + 1) % CYCLE.length), step.ms);
    return () => { clearTimeout(t); st.labels = []; };
  }, [i, state]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onExit(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onExit]);

  const tag = (id: string, cls: string, text: string) => (
    <div key={id} className={`tag ${cls}`} ref={(el) => { tags.current[id] = el; }} style={{ opacity: 0 }}>{text}</div>
  );
  const stage = CYCLE[i].stage;

  return (
    <div className="loop">
      <HealthOrbit state={state} />
      {stage === 1 && <>{tag("name", "big", DEMO.name)}{tag("email", "", DEMO.email)}{tag("company", "", DEMO.company)}</>}
      {stage === 2 && <>{tag("name2", "dim", DEMO.name)}{tag("email2", "dim", DEMO.email)}{tag("company2", "dim", DEMO.company)}{tag("token", "token", DEMO.token)}</>}
      <div className="loop-top"><Logo /></div>
      <button className="loop-exit" onClick={onExit} aria-label="Salir del modo presentación" title="Salir (Esc)">×</button>
    </div>
  );
}
