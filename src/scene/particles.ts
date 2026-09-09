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
const MW = 120, MH = 180, PX = 68; // px de máscara por unidad de mundo
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
// Perfil (cara hacia la derecha): frente, nariz, labios, mentón, cuello y hombros.
const PROFILE = mask((g) => {
  g.beginPath();
  g.moveTo(60, 8);                                   // coronilla
  g.bezierCurveTo(34, 8, 20, 30, 22, 58);            // cráneo, atrás
  g.bezierCurveTo(23, 82, 30, 102, 48, 114);         // nuca
  g.lineTo(52, 136);                                 // cuello, atrás
  g.bezierCurveTo(36, 142, 12, 150, 8, 180);         // hombro, atrás
  g.lineTo(116, 180);                                // base
  g.bezierCurveTo(114, 150, 96, 142, 84, 136);       // hombro, delante
  g.lineTo(86, 122);                                 // cuello, delante
  g.quadraticCurveTo(100, 118, 101, 108);            // mentón redondeado
  g.quadraticCurveTo(104, 103, 101, 98);             // labio inferior
  g.quadraticCurveTo(105, 94, 101, 90);              // labio superior
  g.quadraticCurveTo(112, 84, 108, 76);              // nariz pequeña y redonda
  g.quadraticCurveTo(102, 70, 103, 62);              // puente
  g.bezierCurveTo(108, 45, 96, 8, 60, 8);            // frente
  g.closePath(); g.fill();
});
// Frontal: cabeza ovalada, cuello y hombros.
const FRONT = mask((g) => {
  g.beginPath(); g.ellipse(60, 62, 38, 54, 0, 0, Math.PI * 2); g.fill();
  g.fillRect(42, 100, 36, 40);
  g.beginPath(); g.moveTo(6, 180); g.lineTo(6, 168);
  g.bezierCurveTo(8, 148, 30, 142, 42, 136); g.lineTo(78, 136);
  g.bezierCurveTo(90, 142, 112, 148, 114, 168); g.lineTo(114, 180); g.closePath(); g.fill();
});
function insideBust(x: number, y: number, z: number): boolean {
  if (!PROFILE || !FRONT) return false;
  const py = Math.round(98 - y * PX);
  const pz = Math.round(60 + z * PX), px = Math.round(60 + x * PX);
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
  let st = 0.05, res = sampleBust(st);
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
