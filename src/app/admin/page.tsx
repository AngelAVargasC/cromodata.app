import { prisma } from "@/lib/db";
import { adminPassword, isAdmin } from "@/lib/admin";
import { deleteAll, deleteParticipant, deleteRecord, login, logout } from "./actions";
import DeleteForm from "./DeleteForm";
import "./admin.css";

export const dynamic = "force-dynamic";

const fmt = (d: Date) => new Intl.DateTimeFormat("es-MX", { dateStyle: "short", timeStyle: "short" }).format(d);
const list = (json: string) => { try { return (JSON.parse(json) as string[]).join(", "); } catch { return json; } };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ error?: string; tab?: string }> }) {
  const sp = await searchParams;
  const configured = !!adminPassword();
  const authed = configured && (await isAdmin());

  if (!authed) {
    return (
      <main className="adm login">
        <form action={login} className="adm-card">
          <img src="/brand/cromodata-logo-black.svg" alt="Cromodata" className="adm-logo" />
          <h1>Panel de respuestas</h1>
          {!configured && <p className="adm-err">Falta la variable <code>ADMIN_PASSWORD</code> en el servidor.</p>}
          {sp.error && configured && <p className="adm-err">Contraseña incorrecta.</p>}
          <label>Contraseña<input type="password" name="password" autoFocus required disabled={!configured} /></label>
          <button className="btn" type="submit" disabled={!configured}>Entrar</button>
        </form>
      </main>
    );
  }

  const [participants, records] = await Promise.all([
    prisma.participant.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.healthRecord.findMany({ orderBy: { createdAt: "desc" } }),
  ]);
  const tab = sp.tab === "salud" ? "salud" : "perfil";

  return (
    <main className="adm">
      <header className="adm-head">
        <div className="adm-brand">
          <img src="/brand/cromodata-logo-black.svg" alt="Cromodata" className="adm-logo" />
          <span>Panel de respuestas</span>
        </div>
        <div className="adm-actions">
          <a className="btn small ghost" href={`/api/admin/export?type=${tab === "salud" ? "salud" : "perfil"}`}>Descargar CSV</a>
          <DeleteForm action={deleteAll} fields={{ type: tab }} label={tab === "salud" ? "Borrar todas las respuestas de salud" : "Borrar todos los perfiles"} confirmText={`Se borrarán definitivamente ${tab === "salud" ? records.length + " registros de salud" : participants.length + " perfiles"}. No hay vuelta atrás. ¿Continuar?`} />
          <DeleteForm action={deleteAll} fields={{ type: "todo" }} label="Vaciar todo" confirmText="Se borrarán definitivamente TODAS las respuestas de ambas tablas. ¿Continuar?" className="strong" />
          <form action={logout}><button className="btn small ghost" type="submit">Salir</button></form>
        </div>
      </header>

      <section className="adm-stats">
        <div><b>{participants.length}</b><span>perfiles profesionales</span></div>
        <div><b>{records.length}</b><span>registros de salud</span></div>
        <div><b>{participants.filter((p) => p.contact.startsWith("Sí")).length}</b><span>quieren contacto</span></div>
      </section>

      <nav className="adm-tabs">
        <a className={tab === "perfil" ? "on" : ""} href="/admin?tab=perfil">Onboarding profesional</a>
        <a className={tab === "salud" ? "on" : ""} href="/admin?tab=salud">Respuestas de salud (anónimas)</a>
      </nav>
      <p className="adm-note">Las dos tablas no tienen ninguna llave entre sí: no es posible saber qué registro de salud corresponde a qué persona. Es intencional.</p>

      <div className="adm-table">
        {tab === "perfil" ? (
          <table>
            <thead><tr><th>Fecha</th><th>Nombre</th><th>Correo</th><th>Organización</th><th>Sector</th><th>Área</th><th>Nivel</th><th>Decisión</th><th>Contacto</th><th></th></tr></thead>
            <tbody>
              {participants.length === 0 && <tr><td colSpan={10} className="empty">Todavía no hay respuestas.</td></tr>}
              {participants.map((p) => (
                <tr key={p.id}>
                  <td className="nowrap">{fmt(p.createdAt)}</td><td className="nowrap">{p.name}</td><td>{p.email}</td><td>{p.company}</td>
                  <td>{p.sector}</td><td>{p.area}</td><td>{p.level}</td><td>{p.decision}</td>
                  <td className={p.contact.startsWith("Sí") ? "yes" : ""}>{p.contact}</td>
                  <td><DeleteForm action={deleteParticipant} fields={{ id: p.id }} label="Borrar" confirmText={`Borrar definitivamente el perfil de ${p.name}?`} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table>
            <thead><tr><th>Fecha</th><th>Token</th><th>Edad</th><th>Padecimientos</th><th>Antecedentes</th><th>Actividad</th><th>Sueño</th><th>Chequeo</th><th>Estrés</th><th>Salud</th><th>Tabaco</th><th>Ultraprocesados</th><th></th></tr></thead>
            <tbody>
              {records.length === 0 && <tr><td colSpan={13} className="empty">Todavía no hay respuestas.</td></tr>}
              {records.map((r) => (
                <tr key={r.id}>
                  <td className="nowrap">{fmt(r.createdAt)}</td><td className="mono">{r.token}</td><td>{r.ageRange}</td>
                  <td>{list(r.conditions)}</td><td>{list(r.familyHistory)}</td><td>{r.activity}</td><td>{r.sleep}</td>
                  <td>{r.checkup}</td><td>{r.stress}</td><td>{r.health}</td><td>{r.tobacco ?? "—"}</td><td>{r.ultraprocessed ?? "—"}</td>
                  <td><DeleteForm action={deleteRecord} fields={{ id: r.id }} label="Borrar" confirmText={`Borrar definitivamente el registro ${r.token}?`} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
