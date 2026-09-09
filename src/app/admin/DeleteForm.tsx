"use client";
// Formulario de borrado con confirmación del navegador antes de ejecutar la acción.
export default function DeleteForm({ action, fields, label, confirmText, className = "" }: {
  action: (formData: FormData) => Promise<void>;
  fields: Record<string, string>;
  label: string;
  confirmText: string;
  className?: string;
}) {
  return (
    <form action={action} onSubmit={(e) => { if (!window.confirm(confirmText)) e.preventDefault(); }} className="adm-del">
      {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <button type="submit" className={`adm-danger ${className}`}>{label}</button>
    </form>
  );
}
