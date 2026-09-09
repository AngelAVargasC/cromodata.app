"use client";
import { useEffect, useRef, type MutableRefObject } from "react";
import type { SceneState } from "@/scene/engine";

export const SYMBOLS = [
  { name: "Genética", tone: "ink", path: "M8 3c0 9 16 9 16 26M24 3c0 9-16 9-16 26M9 6h14M12 11h8M12 21h8M9 26h14" },
  { name: "Estudios de imagen", tone: "gray", path: "M4 5h24v18H4zM8 9h16v10H8zM12 27h8M16 23v4M10 17l4-5 4 3 4-2" },
  { name: "Historia clínica", tone: "orange", path: "M9 5H5v24h22V5h-4M11 3h10v5H11zM14 12h4v3h3v4h-3v3h-4v-3h-3v-4h3zM10 26h12" },
  { name: "Salud cardiovascular", tone: "gray", path: "M16 27S3 19 3 11c0-7 9-9 13-3 4-6 13-4 13 3 0 8-13 16-13 16M5 16h6l3-5 4 10 3-5h6" },
  { name: "Laboratorio", tone: "orange", path: "M11 3h10v4h-2v18a3 3 0 0 1-6 0V7h-2zM14 16h5M16 20h3M16 24h3" },
  { name: "Radiografía", tone: "ink", path: "M6 3h20v26H6zM16 7v17M13 9l-3 3v10l3-2V9M19 9l3 3v10l-3-2V9M10 14h3M10 17h3M19 14h3M19 17h3" },
];

export default function HealthOrbit({ state }: { state: MutableRefObject<SceneState> }) {
  const nodes = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    state.current.healthIcons = nodes.current;
    return () => { delete state.current.healthIcons; };
  }, [state]);
  return <div className="health-orbit" aria-hidden="true">
    {SYMBOLS.map((symbol, k) => <div className="health-node" key={symbol.name} ref={(el) => { nodes.current[k] = el; }}>
      <div className={`health-symbol ${symbol.tone}`}>
        <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={symbol.path} /></svg>
      </div>
      <div className="health-data">{Array.from({ length: 16 }, (_, j) => <i key={j} />)}</div>
    </div>)}
  </div>;
}
