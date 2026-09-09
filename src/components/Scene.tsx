"use client";
import { useEffect, useRef, type MutableRefObject } from "react";
import { Engine, type SceneState } from "@/scene/engine";

export type EngineRef = MutableRefObject<Engine | null>;

export function useSceneState(): MutableRefObject<SceneState> {
  return useRef<SceneState>({ stage: 0, progress: 1, dim: 1, glow: 1, lockAngle: null, sway: false, labels: [] });
}

/** Un solo canvas WebGL detrás de toda la app. El canvas se crea dentro del efecto. */
export default function Scene({ state, engineRef }: { state: MutableRefObject<SceneState>; engineRef: EngineRef }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!host.current) return;
    let eng: Engine | null = null;
    try { eng = new Engine(host.current, state.current); } catch (e) { console.error(e); }
    engineRef.current = eng;
    if (process.env.NODE_ENV !== "production") (window as unknown as { __engine?: Engine | null }).__engine = eng;
    return () => { eng?.destroy(); engineRef.current = null; };
  }, [state, engineRef]);
  return <div ref={host} className="scene" aria-hidden="true" />;
}
