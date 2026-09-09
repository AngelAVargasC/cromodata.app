// Logotipo oficial de Cromodata (vector extraído de cromodata.com, en public/brand/).
export default function Logo({ white = false }: { white?: boolean }) {
  const src = white ? "/brand/cromodata-logo-white.svg" : "/brand/cromodata-logo-black.svg";
  return (
    <span className="logo">
      <img src={src} alt="Cromodata" width={155} height={22} draggable={false} />
    </span>
  );
}
