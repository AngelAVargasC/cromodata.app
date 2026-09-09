"use client";
import { useEffect, useRef, type MutableRefObject } from "react";
import Logo from "./Logo";
import { CATEGORIES, clusterCenter } from "@/scene/particles";
import type { SceneState } from "@/scene/engine";

export default function Intro({ state, onStart, onLoop, onFill }: { state: MutableRefObject<SceneState>; onStart: () => void; onLoop?: () => void; onFill?: () => void }) {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    const st = state.current;
    st.stage = 0; st.progress = 1; st.dim = 1; st.glow = 1; st.lockAngle = null; st.sway = false;
    // Etiquetas orbitando sobre el globo
    st.labels = CATEGORIES.map((_, k) => {
      const c = clusterCenter(k);
      const s = 1.75 / Math.hypot(c[0], c[1], c[2]);
      return { el: refs.current[k], pos: [c[0] * s, c[1] * s * 1.15, c[2] * s] };
    });
    return () => { st.labels = []; };
  }, [state]);

  return (
    <div className="intro">
      <div className="intro-labels" aria-hidden="true">
        {CATEGORIES.map((c, k) => (
          <div key={c} className="dot-label" ref={(el) => { refs.current[k] = el; }}><i /> {c}</div>
        ))}
      </div>
      <div className="top"><Logo /><span className="fine" style={{ color: "var(--gris)", fontSize: 13 }}>cromodata.app</span></div>
      <div className="center">
        <h1>¿Podemos convertir esta sala en un mapa de salud en tres minutos?</h1>
      </div>
      <div className="bottom">
        <button className="btn" onClick={onStart}>Formar parte del mapa</button>
        <small>Esta experiencia no sustituye una valoración médica.</small>
        {onLoop && <span className="loop-btns"><button className="btn ghost small loop-btn" onClick={onLoop}>Modo presentación</button>{onFill && <button className="btn ghost small loop-btn" onClick={onFill}>Iconos → persona</button>}</span>}
      </div>
    </div>
  );
}
