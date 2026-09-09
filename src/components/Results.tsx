"use client";
import { useEffect, useState, type CSSProperties } from "react";
import Logo from "./Logo";
import type { Aggregate } from "@/lib/signals";

const Lock = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="5" y="11" width="14" height="10" rx="2" /><path className="shackle" d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>;
const Check = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path className="tick" d="m5 12.5 4.5 4.5L19 7.5" /></svg>;

// Iconos animados de los pilares
const Shield = () => (
  <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path className="ring" d="M20 4 33 9v9c0 8-5.5 14-13 18C12.5 32 7 26 7 18V9z" />
    <path className="tick" d="m14 20 4 4 8-9" />
  </svg>
);
const Globe = () => (
  <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <circle cx="20" cy="20" r="14" />
    <ellipse className="meridian" cx="20" cy="20" rx="6" ry="14" />
    <path d="M6 20h28M9 13h22M9 27h22" opacity="0.6" />
    <circle className="orbit" cx="20" cy="6" r="2.4" fill="currentColor" stroke="none" />
  </svg>
);
const Handshake = () => (
  <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path className="left" d="M4 12l8 8-8 8" />
    <path className="right" d="M36 12l-8 8 8 8" />
    <path className="mid" d="M14 20h12" />
  </svg>
);

function useCountUp(target: number, delay: number) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setV(target); return; }
    let raf = 0; const t0 = performance.now() + delay; const dur = 900;
    const tick = (now: number) => {
      const k = Math.max(0, Math.min(1, (now - t0) / dur));
      setV(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, delay]);
  return v;
}

function Tile({ pct, text, index }: { pct: number; text: string; index: number }) {
  const v = useCountUp(pct, 350 + index * 120);
  return (
    <div className="tile rv" style={{ "--i": 2 + index } as CSSProperties}>
      <div className="num">{v}<span>%</span></div>
      <p>{text}</p>
    </div>
  );
}

export default function Results({ aggregate, onRestart }: { aggregate: Aggregate; onRestart: () => void }) {
  const [grow, setGrow] = useState(false);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => { const t = setTimeout(() => setGrow(true), 260); return () => clearTimeout(t); }, []);

  const all = [...aggregate.bars, ...aggregate.extra];
  const top = Math.max(...all.map((b) => b.pct), 1);
  const cross = aggregate.crosses.filter((c) => c.pct > 0).slice(0, 2);
  const tiles = [
    ...cross.map((c) => ({ pct: c.pct, text: c.text })),
    { pct: aggregate.threePlus, text: "acumula tres o más señales de atención al mismo tiempo." },
    { pct: aggregate.paradox, text: "se siente bien de salud y, aun así, acumula dos o más señales." },
  ].slice(0, 4);

  const leave = () => {
    if (leaving) return;
    setLeaving(true);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(onRestart, reduced ? 0 : 520);
  };
  const rv = (i: number) => ({ "--i": i } as CSSProperties);

  return (
    <div className={`results ${leaving ? "is-leaving" : ""}`}>
      <div className="wrap">
        <header className="rhead rv" style={rv(0)}>
          <Logo />
          <span className="chip"><i />{aggregate.n} personas en el mapa</span>
        </header>

        <div className="rtitle rv" style={rv(1)}>
          <h1>Radiografía de los asistentes</h1>
          <p>Lo que la sala sabe de sí misma en tres minutos. Ninguna cifra apunta a una persona; todas apuntan a un patrón.</p>
        </div>

        <div className="rgrid">
          <section className="rcard signals rv" style={rv(2)}>
            <h3>Señales de atención en la sala</h3>
            <div className="srows">
              {all.map((b, k) => (
                <div className={`srow ${b.pct === top ? "max" : ""}`} key={b.label}>
                  <span className="lbl">{b.label}</span>
                  <span className="track"><i style={{ width: grow ? `${b.pct}%` : 0, transitionDelay: `${k * 70}ms` }} /></span>
                  <b>{b.pct}%</b>
                </div>
              ))}
            </div>
            <p className="note">Porcentaje de asistentes con cada señal. Se derivan de las respuestas; no son diagnósticos.</p>
          </section>

          <section className="tiles">
            {tiles.map((t, k) => <Tile key={t.text} pct={t.pct} text={t.text} index={k} />)}
          </section>

          <section className="rcard split2 rv" style={rv(6)}>
            <div className="col locked">
              <h4>Datos individuales <em>Bloqueados</em></h4>
              <ul>
                {["Nombre", "Correo", "Respuestas", "Perfil"].map((t, k) => <li key={t} style={rv(k)}><Lock />{t}</li>)}
              </ul>
            </div>
            <div className="col visible">
              <h4>Patrones colectivos <em>Visibles</em></h4>
              <ul>
                {["Tendencias", "Relaciones", "Segmentos", "Oportunidades"].map((t, k) => <li key={t} style={rv(k)}><Check />{t}</li>)}
              </ul>
            </div>
            <p className="note wide">Tu identidad y tus respuestas se guardan en dos tablas sin ninguna llave que las una. De la sala salen patrones, nunca personas.</p>
          </section>

          <section className="rcard pillars3 rv" style={rv(7)}>
            <div><span className="pico shield"><Shield /></span><div><b>Privacidad por diseño</b><span>Anonimización, trazabilidad y control institucional en cada etapa.</span></div></div>
            <div><span className="pico globe"><Globe /></span><div><b>Foco en Latinoamérica</b><span>Convertimos los datos de la región en conocimiento para el mundo.</span></div></div>
            <div><span className="pico hands"><Handshake /></span><div><b>Aliado, no competidor</b><span>Trabajamos con hospitales, investigadores e industria farmacéutica.</span></div></div>
          </section>
        </div>

        <footer className="rfoot rv" style={rv(8)}>
          <div className="cta">
            <span className="site">cromodata.app · Conversemos sobre tus datos</span>
            <button className="btn" onClick={leave}>Nuevo participante</button>
          </div>
          <span className="fine">Esta experiencia no sustituye una valoración médica. La sala incluye {aggregate.nReal} registros de asistentes y una base simulada para la demostración.</span>
        </footer>
      </div>
    </div>
  );
}
