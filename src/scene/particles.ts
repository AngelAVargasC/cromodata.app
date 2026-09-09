// Geometría de la nube de partículas. Seis "poses" por partícula, todas
// subidas a la GPU una sola vez; el vertex shader interpola entre ellas.
//
//  0 globo       mapa de salud (intro y formulario)
//  1 busto       la persona con sus datos
//  2 blob        registro tokenizado, sin identidad
//  3 dataset     muchos registros iguales entre sí
//  4 clusters    seis dimensiones de salud
//  5 barras      la radiografía de la sala

export const N = 7000;
export const LAYOUTS = 6;

export const CATEGORIES = ["Sueño", "Actividad física", "Antecedentes", "Prevención", "Alimentación", "Padecimientos"];

export const CLUSTER_R = 1.55;
export function clusterCenter(k: number): [number, number, number] {
  const a = (k / 6) * Math.PI * 2 + 0.4;
  const ys = [0.55, -0.45, 0.65, -0.6, 0.35, -0.25];
  return [Math.cos(a) * CLUSTER_R, ys[k], Math.sin(a) * CLUSTER_R];
}

export const BAR_X = (k: number) => (k - 1.5) * 0.95;
export const BAR_BOTTOM = -1.15;
export const BAR_MAX_H = 2.3;

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = mulberry32(7);

function onSphere(r: number): [number, number, number] {
  const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u);
  return [r * s * Math.cos(a), r * u, r * s * Math.sin(a)];
}
function inSphere(r: number): [number, number, number] {
  const p = onSphere(r * Math.cbrt(rnd()));
  return p;
}

export interface ParticleData {
  pos: Float32Array;  // N * LAYOUTS * 3
  meta: Float32Array; // N * 4  → kind, cat, seed, seed2
}

/**
 * Busto 3D como retícula de puntos. Volumen = intersección de dos siluetas extruidas
 * (perfil, visto de lado, y frontal). Se muestrea en una retícula regular y se conservan
 * las celdas de la superficie, así se ve como el busto punteado del deck desde cualquier ángulo.
 */
const MW = 132, MH = 180, PX = 68; // px de máscara por unidad de mundo
function mask(draw: (g: CanvasRenderingContext2D) => void): Uint8Array | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas"); c.width = MW; c.height = MH;
  const g = c.getContext("2d")!;
  g.fillStyle = "#000"; draw(g);
  const d = g.getImageData(0, 0, MW, MH).data;
  const m = new Uint8Array(MW * MH);
  for (let i = 0; i < MW * MH; i++) m[i] = d[i * 4 + 3] > 128 ? 1 : 0;
  return m;
}
// Contorno trazado sobre la referencia (480 × 643). Se refleja para que la cámara
// a -π/2 presente la cara hacia la izquierda, y se escala sin alterar proporciones.
const PROFILE = mask((g) => {
  g.translate(146, -5.44);
  g.scale(-0.32, 0.32);
  g.beginPath();
  g.moveTo(224, 42);
  g.bezierCurveTo(318, 40, 372, 72, 377, 147);       // cráneo ancho
  g.bezierCurveTo(382, 202, 370, 252, 332, 280);     // occipital y nuca
  g.bezierCurveTo(328, 300, 328, 324, 333, 342);
  g.quadraticCurveTo(354, 354, 354, 383);
  g.bezierCurveTo(359, 403, 391, 419, 406, 451);     // hombro posterior
  g.bezierCurveTo(422, 481, 435, 521, 439, 555);
  g.quadraticCurveTo(394, 568, 337, 578);
  g.lineTo(111, 578);
  g.bezierCurveTo(107, 558, 111, 534, 123, 510);     // pecho
  g.bezierCurveTo(136, 479, 156, 450, 181, 431);
  g.quadraticCurveTo(195, 421, 195, 402);
  g.lineTo(195, 373);                               // cuello anterior
  g.quadraticCurveTo(195, 355, 178, 353);
  g.lineTo(115, 353);                               // mandíbula casi horizontal
  g.quadraticCurveTo(96, 352, 99, 332);              // mentón
  g.quadraticCurveTo(101, 316, 96, 306);
  g.quadraticCurveTo(91, 296, 99, 286);              // labios
  g.quadraticCurveTo(103, 277, 93, 270);
  g.quadraticCurveTo(70, 264, 74, 250);              // punta de nariz
  g.quadraticCurveTo(77, 238, 90, 223);
  g.quadraticCurveTo(96, 211, 91, 192);              // puente y frente
  g.bezierCurveTo(82, 165, 86, 138, 97, 112);
  g.bezierCurveTo(108, 70, 157, 42, 224, 42);
  g.closePath(); g.fill();
});
// Frontal: cabeza ovalada, cuello y hombros.
const FRONT = mask((g) => {
  g.beginPath(); g.ellipse(66, 58, 38, 50, 0, 0, Math.PI * 2); g.fill();
  g.fillRect(47, 94, 38, 42);
  g.beginPath(); g.moveTo(6, 180); g.lineTo(6, 168);
  g.bezierCurveTo(8, 148, 35, 139, 47, 130); g.lineTo(85, 130);
  g.bezierCurveTo(97, 139, 124, 148, 126, 168); g.lineTo(126, 180); g.closePath(); g.fill();
});
function insideBust(x: number, y: number, z: number): boolean {
  if (!PROFILE || !FRONT) return false;
  const py = Math.round(98 - y * PX);
  const pz = Math.round(MW / 2 + z * PX), px = Math.round(MW / 2 + x * PX);
  if (py < 0 || py >= MH || pz < 0 || pz >= MW || px < 0 || px >= MW) return false;
  return PROFILE[py * MW + pz] === 1 && FRONT[py * MW + px] === 1;
}
type Cell = { x: number; y: number; z: number; head: boolean };
/** Retícula regular; el paso se elige para que toda la superficie quepa en N partículas (sin huecos). */
function sampleBust(st: number): { shell: Cell[]; inner: Cell[] } {
  const shell: Cell[] = [], inner: Cell[] = [];
  for (let y = -1.7; y <= 1.75; y += st) for (let x = -1.2; x <= 1.2; x += st) for (let z = -1.2; z <= 1.2; z += st) {
    if (!insideBust(x, y, z)) continue;
    const surf = !insideBust(x + st, y, z) || !insideBust(x - st, y, z) || !insideBust(x, y + st, z) ||
      !insideBust(x, y - st, z) || !insideBust(x, y, z + st) || !insideBust(x, y, z - st);
    (surf ? shell : inner).push({ x, y, z, head: y > -0.35 });
  }
  return { shell, inner };
}
export let BUST_STEP = 0.07;
/**
 * Cascarón 3D completo (todas las celdas de superficie). Con proyección ortográfica y test
 * de profundidad, de perfil solo se ve la cara lateral y la retícula queda limpia; al girar
 * con el dedo aparece el volumen entero.
 */
const BUST_CELLS: Cell[] = (() => {
  if (!PROFILE) return [];
  // Aproximadamente 46 filas, como en la referencia; aumentar solo si no cabe.
  let st = 0.056, res = sampleBust(st);
  while (res.shell.length > N && st < 0.2) { st += 0.003; res = sampleBust(st); }
  BUST_STEP = st;
  // Orden determinista mezclado: las repeticiones (i % n) se reparten por todo el cuerpo.
  const r = mulberry32(3);
  return res.shell.map((c) => ({ c, k: r() })).sort((p, q) => p.k - q.k).map((p) => p.c);
})();
function bust(i: number): { p: [number, number, number]; face: boolean } {
  if (!BUST_CELLS.length) return { p: onSphere(1), face: false };
  const c = BUST_CELLS[i % BUST_CELLS.length];
  return { p: [c.x, c.y + 0.1, c.z], face: c.head };
}

export function buildParticles(): ParticleData {
  const pos = new Float32Array(N * LAYOUTS * 3);
  const meta = new Float32Array(N * 4);
  const set = (i: number, L: number, p: [number, number, number]) => {
    const o = (i * LAYOUTS + L) * 3;
    pos[o] = p[0]; pos[o + 1] = p[1]; pos[o + 2] = p[2];
  };
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    // 0 · globo (espiral de Fibonacci → retícula de mapa)
    const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = golden * i;
    set(i, 0, [Math.cos(th) * r * 1.6, y * 1.6, Math.sin(th) * r * 1.6]);
    // 1 · busto
    const b = bust(i);
    set(i, 1, b.p);
    // 2 · blob tokenizado
    const d = onSphere(1);
    const bump = 1 + 0.16 * Math.sin(3.1 * d[0] + 1.3) * Math.sin(2.7 * d[1] - 0.6) + 0.1 * Math.sin(4.2 * d[2] + 2.0);
    set(i, 2, [d[0] * bump, d[1] * bump, d[2] * bump]);
    // 3 · dataset (retícula 3D de 3 × 3 × 3 esferas: se lee desde cualquier ángulo)
    const g = i % 27, gx = g % 3, gy = Math.floor(g / 3) % 3, gz = Math.floor(g / 9);
    const q = onSphere(0.24);
    set(i, 3, [(gx - 1) * 0.95 + q[0], (gy - 1) * 0.9 + q[1], (gz - 1) * 0.95 + q[2]]);
    // 4 · clusters
    const cat = i % 6, c = clusterCenter(cat), s = inSphere(0.36);
    set(i, 4, [c[0] + s[0], c[1] + s[1], c[2] + s[2]]);
    // 5 · barras (se rellena en setBars); por defecto una línea base
    set(i, 5, [BAR_X(i % 4) + (rnd() - 0.5) * 0.6, BAR_BOTTOM + rnd() * 0.05, (rnd() - 0.5) * 0.35]);

    meta[i * 4] = b.face ? 1 : 0;
    meta[i * 4 + 1] = cat;
    meta[i * 4 + 2] = rnd();
    meta[i * 4 + 3] = rnd();
  }
  // Las partículas que repiten celda del busto heredan la semilla de su celda:
  // mismo color y mismo escalonado, así la superposición es invisible.
  const nc = BUST_CELLS.length;
  if (nc > 0) for (let i = nc; i < N; i++) {
    const j = i % nc;
    meta[i * 4 + 2] = meta[j * 4 + 2];
    meta[i * 4 + 3] = meta[j * 4 + 3];
  }
  return { pos, meta };
}

/** Reparte las partículas no identitarias en 4 barras según porcentajes (0..100). */
export function fillBars(data: ParticleData, pcts: number[]) {
  const r = mulberry32(99);
  const total = pcts.reduce((a, b) => a + b, 0) || 1;
  const idx: number[] = [];
  for (let i = 0; i < N; i++) if (data.meta[i * 4] < 0.5) idx.push(i);
  let cursor = 0;
  for (let k = 0; k < 4; k++) {
    const count = k === 3 ? idx.length - cursor : Math.round((idx.length * pcts[k]) / total);
    const h = Math.max(0.06, (pcts[k] / 100) * BAR_MAX_H);
    for (let j = 0; j < count && cursor < idx.length; j++, cursor++) {
      const i = idx[cursor], o = (i * LAYOUTS + 5) * 3;
      data.pos[o] = BAR_X(k) + (r() - 0.5) * 0.62;
      data.pos[o + 1] = BAR_BOTTOM + r() * h;
      data.pos[o + 2] = (r() - 0.5) * 0.36;
    }
  }
  // Las identitarias quedan lejos y apagadas (el shader las oculta igual).
  for (let i = 0; i < N; i++) if (data.meta[i * 4] > 0.5) {
    const o = (i * LAYOUTS + 5) * 3; data.pos[o] = 0; data.pos[o + 1] = 6; data.pos[o + 2] = 0;
  }
}
