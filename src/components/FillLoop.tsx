"use client";
import { useEffect, useRef, type MutableRefObject } from "react";
import Logo from "./Logo";
import { SYMBOLS } from "./HealthOrbit";
import type { EngineRef } from "./Scene";
import type { SceneState, Vec3 } from "@/scene/engine";

// Una misma población: fuentes → fragmentos → núcleo → posiciones reales del busto.
const ORBIT = 3800, BREAK = 1200, GATHER = 2300, FORM = 3800, HOLD = 3000, FADE = 1000;
const T_BREAK = ORBIT, T_GATHER = ORBIT + BREAK, T_FORM = T_GATHER + GATHER;
const T_HOLD = T_FORM + FORM, T_FADE = T_HOLD + HOLD, TOTAL = T_FADE + FADE;
const LABELS = ["Genómica", "Estudios de imagen", "Historiales clínicos", "Hospitales", "Laboratorios", "Centros de salud"];
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => { const x = clamp(v); return x * x * (3 - 2 * x); };
const mix = (a: number, b: number, u: number) => a + (b - a) * u;
const random = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export default function FillLoop({ state, engineRef, onExit }: { state: MutableRefObject<SceneState>; engineRef: EngineRef; onExit: () => void }) {
  const nodes = useRef<(HTMLDivElement | null)[]>([]);
  const labels = useRef<(HTMLSpanElement | null)[]>([]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const exit = useRef(onExit);
  exit.current = onExit;

  useEffect(() => {
    const st = state.current;
    const layer = canvas.current;
    const g = layer?.getContext("2d");
    if (!layer || !g) return;
    st.dim = 1; st.glow = 1; st.progress = 1; st.labels = [];
    st.stage = 1; st.lockAngle = -Math.PI / 2; st.sway = false;
    st.motionPaused = false; st.revealY = undefined; st.formationVisibility = 0;
    let targets: Vec3[] = [], raf = 0, elapsed = 0, last = performance.now();
    let width = 0, height = 0, dpr = 1;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const resize = () => {
      width = layer.clientWidth; height = layer.clientHeight;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      layer.width = Math.round(width * dpr); layer.height = Math.round(height * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const observer = new ResizeObserver(resize); observer.observe(layer); resize();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const eng = engineRef.current;
      if (!document.hidden && !st.motionPaused && eng) elapsed += Math.min(100, now - last);
      last = now;
      if (!eng) return;
      if (!targets.length) targets = eng.formationTargets();
      const t = elapsed % TOTAL;
      const [cx, cy] = eng.project([0, 0.1, 0]);
      const rx = Math.min(width * 0.35, height * 0.39), ry = Math.min(height * 0.34, width * 0.37);
      const theta = reduced.matches ? 0 : Math.min(t, T_BREAK) * 0.00017;
      const origins = SYMBOLS.map((_, k) => {
        const a = k / SYMBOLS.length * Math.PI * 2 + theta - Math.PI / 2;
        return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
      });
      // La cámara se mantiene estable durante el ensamblaje; nunca se revela una máscara vertical.
      const handoff = smooth((t - (T_HOLD - 500)) / 500);
      const fade = 1 - smooth((t - T_FADE) / FADE);
      st.formationVisibility = handoff * fade;
      g.clearRect(0, 0, width, height);
      const projectedStep = Math.abs(eng.project([0, 0.156, 0])[1] - eng.project([0, 0.1, 0])[1]);
      const pointSize = Math.max(1.1, projectedStep * 0.34);
      for (let k = 0; k < SYMBOLS.length; k++) {
        const el = nodes.current[k]; if (!el) continue;
        const dissolve = smooth((t - T_BREAK - k * 65) / 650);
        const appear = smooth(t / 550);
        el.style.visibility = "visible";
        el.style.opacity = String(appear * (1 - dissolve));
        el.style.transform = `translate(-50%, -50%) translate(${origins[k][0]}px, ${origins[k][1]}px) scale(${1 - dissolve * 0.12})`;
        const lab = labels.current[k];
        if (lab) lab.style.opacity = String(smooth((t - 500 - k * 350) / 400) * (1 - smooth((t - T_BREAK) / 350)));
      }
      if (t < T_BREAK || t >= T_HOLD) return;
      for (let j = 0; j < targets.length; j++) {
        const k = j % SYMBOLS.length, seed = random(j + 1), seed2 = random(j + 301);
        const a = seed * Math.PI * 2;
        const r = Math.sqrt(seed2);
        const spread = smooth((t - T_BREAK - k * 65) / 900);
        // Nacen dentro del círculo del icono y se separan antes de converger.
        const startRadius = width < 700 ? 15 : 25;
        const sx = origins[k][0] + Math.cos(a) * r * (startRadius + spread * 28);
        const sy = origins[k][1] + Math.sin(a) * r * (startRadius + spread * 28);
        const coreX = cx + Math.cos(a) * r * Math.min(width, height) * 0.07;
        const coreY = cy + Math.sin(a) * r * Math.min(width, height) * 0.07;
        const gather = smooth((t - T_GATHER - seed * 400) / (GATHER - 400));
        const bend = reduced.matches ? 0 : Math.sin(gather * Math.PI) * (seed2 - 0.5) * 100;
        let x = mix(sx, coreX, gather) + bend;
        let y = mix(sy, coreY, gather) - bend * 0.6;
        const [tx, ty] = eng.project(targets[j]);
        // Los hombros se organizan primero; la cabeza llega después, con fases solapadas.
        const order = clamp((targets[j][1] + 1.2) / 2.7);
        const assemble = smooth((t - T_FORM - order * 650 - seed * 250) / (FORM - 1400));
        x = mix(x, tx, assemble); y = mix(y, ty, assemble);
        const alpha = smooth((t - T_BREAK - k * 65 - seed * 180) / 450) * (1 - handoff);
        g.globalAlpha = alpha;
        g.fillStyle = seed < 0.34 ? "#f36b21" : "#191717";
        g.beginPath(); g.arc(x, y, pointSize * mix(0.75, 1, assemble), 0, Math.PI * 2); g.fill();
      }
      g.globalAlpha = 1;
    };
    raf = requestAnimationFrame(tick);
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") exit.current(); };
    window.addEventListener("keydown", key);
    return () => {
      cancelAnimationFrame(raf); observer.disconnect(); window.removeEventListener("keydown", key);
      delete st.formationVisibility; st.revealY = undefined; st.dim = 1; st.sway = false;
    };
  }, [state, engineRef]);

  return <div className="loop">
    <canvas ref={canvas} className="formation-particles" aria-hidden="true" />
    <div className="health-orbit" aria-hidden="true">
      {SYMBOLS.map((symbol, k) => <div className="health-node" key={symbol.name} ref={(el) => { nodes.current[k] = el; }}>
        <div className={`health-symbol ${symbol.tone}`}><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={symbol.path} /></svg></div>
        <span className="fill-label" ref={(el) => { labels.current[k] = el; }} style={{ opacity: 0 }}>{LABELS[k]}</span>
      </div>)}
    </div>
    <div className="loop-top"><Logo /></div>
    <button className="loop-exit" onClick={onExit} aria-label="Salir" title="Salir (Esc)">×</button>
  </div>;
}
