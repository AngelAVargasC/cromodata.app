export default function Logo({ white = false }: { white?: boolean }) {
  const c = white ? "#fff" : "#f26a21";
  return (
    <span className="logo" aria-label="Cromodata">
      <svg viewBox="0 0 30 20" fill="none" aria-hidden="true">
        <path d="M2 2l8 8-8 8" stroke={c} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 2l8 8-8 8" stroke={c} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Cromodata
    </span>
  );
}
