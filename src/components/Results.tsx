"use client";
import { useEffect, useState } from "react";
import Logo from "./Logo";
import type { Aggregate } from "@/lib/signals";

const Lock = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>;
const Check = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></svg>;

export default function Results({ aggregate, onRestart }: { aggregate: Aggregate; onRestart: () => void }) {
  const [grow, setGrow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setGrow(true), 80); return () => clearTimeout(t); }, []);
  const bar = (b: { label: string; pct: number }) => (
    <div className="brow" key={b.label}>
      <span>{b.label}</span><b>{b.pct}%</b>
      <span className="track"><i style={{ width: grow ? `${b.pct}%` : 0 }} /></span>
    </div>
  );
  const cross = aggregate.crosses.filter((c) => c.pct > 0).slice(0, 2);

  return (
    <div className="results">
      <div className="deco" aria-hidden="true"><i /><i /><i /></div>
      <div className="wrap">
        <div className="top"><Logo white /><span className="fine">{aggregate.n} personas en el mapa</span></div>
        <h1>Radiografía de los asistentes</h1>
        <p className="lead">Lo que la sala sabe de sí misma en tres minutos. Ninguna cifra apunta a una persona; todas apuntan a un patrón.</p>

        <div className="card">
          <h3>Señales de atención en la sala</h3>
          <div className="bars">{aggregate.bars.map(bar)}{aggregate.extra.map(bar)}</div>
          <p>Porcentaje de asistentes que presenta cada señal. Las señales se derivan de las respuestas; no son diagnósticos.</p>
        </div>

        <div className="grid2">
          {cross.map((c) => (
            <div className="card big" key={c.text}>
              <div className="bignum">{c.pct}%</div>
              <p>{c.text}</p>
            </div>
          ))}
          <div className="card big">
            <div className="bignum">{aggregate.threePlus}%</div>
            <p>acumula tres o más señales de atención al mismo tiempo. Índice de señales: cuántos factores se concentran por persona.</p>
          </div>
          <div className="card big">
            <div className="bignum">{aggregate.paradox}%</div>
            <p>califica su salud como buena o mejor y, aun así, acumula dos o más señales. La paradoja de percepción: cómo creemos estar frente a lo que muestran nuestros hábitos.</p>
          </div>
        </div>

        <div className="split">
          <div className="locked">
            <h3>Datos individuales</h3>
            <ul>
              <li><Lock /> Nombre</li><li><Lock /> Correo</li><li><Lock /> Respuestas</li><li><Lock /> Perfil</li>
            </ul>
            <span className="foot">Bloqueados</span>
          </div>
          <div className="visible">
            <h3>Patrones colectivos</h3>
            <ul>
              <li><Check /> Tendencias</li><li><Check /> Relaciones</li><li><Check /> Segmentos</li><li><Check /> Oportunidades</li>
            </ul>
            <span className="foot">Visibles</span>
          </div>
        </div>

        <div className="card">
          <h3>Así trabaja Cromodata con datos clínicos reales</h3>
          <div className="pillars">
            <p><b>Privacidad por diseño</b>Anonimización, trazabilidad y control institucional en cada etapa.</p>
            <p><b>Foco en Latinoamérica</b>Convertimos los datos de la región en conocimiento para el mundo.</p>
            <p><b>Aliado, no competidor</b>Trabajamos con hospitales, investigadores e industria farmacéutica.</p>
          </div>
        </div>

        <div className="cta">
          <span className="site">cromodata.app · Conversemos sobre tus datos</span>
          <button className="btn white" onClick={onRestart}>Nuevo participante</button>
        </div>
        <span className="fine">Esta experiencia no sustituye una valoración médica. La sala incluye {aggregate.nReal} registros de asistentes y una base simulada para la demostración.</span>
      </div>
    </div>
  );
}
