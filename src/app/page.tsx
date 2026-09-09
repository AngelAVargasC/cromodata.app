"use client";
import { useEffect, useRef, useState } from "react";
import Scene, { useSceneState, type EngineRef } from "@/components/Scene";
import Intro from "@/components/Intro";
import Form from "@/components/Form";
import Journey from "@/components/Journey";
import Results from "@/components/Results";
import { splitAnswers, type Answers, type OnboardingData } from "@/lib/questions";
import type { Aggregate } from "@/lib/signals";
import type { Engine } from "@/scene/engine";

type Phase = "intro" | "form" | "sending" | "journey" | "results";

const DEMO: OnboardingData = {
  name: "Keila Barral", email: "keila@cromodata.com", company: "Cromodata", sector: "Healthtech o tecnología",
  area: "Dirección general", level: "Dirección general o C-Level", decision: "Tomo la decisión final", contact: "Sí, quiero conversar con el equipo",
};

export default function Page() {
  const state = useSceneState();
  const engineRef: EngineRef = useRef<Engine | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [onboarding, setOnboarding] = useState<OnboardingData>(DEMO);
  const [token, setToken] = useState("CD-demo");
  const [agg, setAgg] = useState<Aggregate | null>(null);
  const [error, setError] = useState("");

  // ?demo=1 salta el formulario y va directo al recorrido (para ensayar la presentación).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("demo")) {
      fetch("/api/aggregate").then((r) => r.json()).then((a: Aggregate) => {
        setAgg(a); setToken("CD-" + Math.random().toString(16).slice(2, 14)); setPhase("journey");
      });
    }
  }, []);

  async function submit(a: Answers) {
    setPhase("sending"); setError("");
    const body = splitAnswers(a);
    setOnboarding(body.onboarding);
    try {
      const r = await fetch("/api/responses", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();
      setToken(j.token); setAgg(j.aggregate); setPhase("journey");
    } catch (e) {
      console.error(e);
      // Sin base de datos disponible, el recorrido sigue con la sala simulada.
      const a2 = await fetch("/api/aggregate").then((r) => r.json()).catch(() => null);
      if (a2) { setAgg(a2); setToken("CD-" + Math.random().toString(16).slice(2, 14)); setPhase("journey"); }
      else { setError("No se pudo guardar la respuesta. Revisa la base de datos e inténtalo de nuevo."); setPhase("form"); }
    }
  }

  return (
    <div className="app">
      <Scene state={state} engineRef={engineRef} />
      <div className="ui">
        {phase === "intro" && <Intro state={state} onStart={() => setPhase("form")} />}
        {(phase === "form" || phase === "sending") && (
          <>
            <Form state={state} onDone={submit} onBack={() => setPhase("intro")} />
            {phase === "sending" && <div className="sheet"><div className="notice"><h2>Protegiendo identidad…</h2></div></div>}
            {error && <div className="sheet" onClick={() => setError("")}><div className="notice"><p className="err">{error}</p></div></div>}
          </>
        )}
        {phase === "journey" && agg && (
          <Journey state={state} engineRef={engineRef} onboarding={onboarding} token={token} aggregate={agg} onFinish={() => setPhase("results")} />
        )}
        {phase === "results" && agg && (
          <Results aggregate={agg} onRestart={() => { setAgg(null); setPhase("intro"); }} />
        )}
      </div>
    </div>
  );
}
