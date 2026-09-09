import { buildParticles, buildBustSurface, fillBars, N, LAYOUTS, BUST_STEP, type ParticleData } from "./particles";
import { PARTICLE_VS, PARTICLE_FS, BUST_VS, BUST_FS, BG_VS, BG_FS } from "./shaders";

export type Vec3 = [number, number, number];

/** Estado mutable que la UI escribe y el bucle lee. Nunca estado de React aquí. */
export interface SceneState {
  stage: number;       // destino 0..5
  progress: number;    // 0..1 partículas encendidas
  dim: number;         // 0..1 atenuación global
  glow: number;        // degradados animados del fondo
  /** Ángulo fijo de cámara (rad) o null para rotación libre. */
  lockAngle: number | null;
  /** Balanceo suave alrededor del ángulo fijo, para que se lea el volumen. */
  sway: boolean;
  motionPaused?: boolean;
  healthIcons?: (HTMLElement | null)[];
  /** Franja visible para el busto, en píxeles CSS, entre tarjetas y pie. */
  bustFrame?: { top: number; bottom: number };
  labels: { el: HTMLElement | null; pos: Vec3 }[];
}

const ORANGE: Vec3 = [0.95, 0.42, 0.13];
const INK: Vec3 = [0.1, 0.09, 0.09];
const CATS: Vec3[] = [
  [0.95, 0.42, 0.13], [0.1, 0.09, 0.09], [1.0, 0.6, 0.28],
  [0.45, 0.42, 0.4], [0.85, 0.3, 0.08], [0.25, 0.22, 0.2],
];

// ---------- mat4 mínimo (column-major) ----------
type M4 = Float32Array;
const m4 = () => new Float32Array(16);
function ortho(w: number, h: number, near: number, far: number): M4 {
  const o = m4();
  o[0] = 1 / w; o[5] = 1 / h; o[10] = -2 / (far - near); o[14] = -(far + near) / (far - near); o[15] = 1;
  return o;
}
function mul(a: M4, b: M4): M4 {
  const o = m4();
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  }
  return o;
}
function rotY(t: number): M4 { const o = m4(), c = Math.cos(t), s = Math.sin(t); o[0] = c; o[2] = -s; o[5] = 1; o[8] = s; o[10] = c; o[15] = 1; return o; }
function rotX(t: number): M4 { const o = m4(), c = Math.cos(t), s = Math.sin(t); o[0] = 1; o[5] = c; o[6] = s; o[9] = -s; o[10] = c; o[15] = 1; return o; }
function translate(x: number, y: number, z: number): M4 { const o = m4(); o[0] = o[5] = o[10] = o[15] = 1; o[12] = x; o[13] = y; o[14] = z; return o; }
function scale(s: number): M4 { const o = m4(); o[0] = o[5] = o[10] = s; o[15] = 1; return o; }

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src); gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error("[scene] shader:", gl.getShaderInfoLog(sh));
  }
  return sh;
}
function program(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const p = gl.createProgram()!;
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) console.error("[scene] link:", gl.getProgramInfoLog(p));
  return p;
}

export class Engine {
  private gl: WebGL2RenderingContext;
  private canvas: HTMLCanvasElement;
  private data: ParticleData;
  private posBuf!: WebGLBuffer;
  private prog!: WebGLProgram;
  private bg!: WebGLProgram;
  private bustProg!: WebGLProgram;
  private bustVao!: WebGLVertexArrayObject;
  private bustCount = 0;
  private US: Record<string, WebGLUniformLocation | null> = {};
  private vao!: WebGLVertexArrayObject;
  private U: Record<string, WebGLUniformLocation | null> = {};
  private UB: Record<string, WebGLUniformLocation | null> = {};
  private raf = 0;
  private last = 0;
  private t0 = performance.now();
  private stageCur = 0;
  private tween: { from: number; to: number; start: number; dur: number } | null = null;
  private angle = 0;
  private dragVel = 0;
  private dpr = 1;
  private vp: M4 = m4();
  private dist = 6;
  private ro: ResizeObserver;
  private lost = false;
  private progressCur = 1;
  private dimCur = 1;
  private glowCur = 1;
  private tilt = 0.22;
  private motionStage = -1;
  private motionStart = 0;

  constructor(private host: HTMLElement, private state: SceneState) {
    const canvas = document.createElement("canvas");
    canvas.className = "scene-canvas";
    host.appendChild(canvas);
    this.canvas = canvas;
    const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, depth: true, powerPreference: "high-performance" });
    if (!gl) throw new Error("WebGL2 no disponible");
    this.gl = gl;
    this.data = buildParticles();
    this.stageCur = state.stage;
    this.setup();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
    this.resize();
    canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); this.lost = true; });
    canvas.addEventListener("webglcontextrestored", () => { this.setup(); this.lost = false; });
    this.bindDrag();
    this.raf = requestAnimationFrame(this.frame);
  }

  private setup() {
    const gl = this.gl;
    this.prog = program(gl, PARTICLE_VS, PARTICLE_FS);
    this.bg = program(gl, BG_VS, BG_FS);
    this.bustProg = program(gl, BUST_VS, BUST_FS);
    for (const n of ["u_vp", "u_view", "u_depthOnly", "u_spacing", "u_alpha", "u_origin", "u_orange", "u_ink"]) this.US[n] = gl.getUniformLocation(this.bustProg, n);
    this.bustVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.bustVao);
    const surface = buildBustSurface();
    this.bustCount = surface.length / 3;
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, surface, gl.STATIC_DRAW);
    const position = gl.getAttribLocation(this.bustProg, "a_position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    for (const n of ["u_vp", "u_stage", "u_time", "u_size", "u_bustSize", "u_surface", "u_progress", "u_dim", "u_orange", "u_ink", "u_cat"]) {
      this.U[n] = gl.getUniformLocation(this.prog, n);
    }
    for (const n of ["u_res", "u_time", "u_glow"]) this.UB[n] = gl.getUniformLocation(this.bg, n);

    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    this.posBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.data.pos, gl.STATIC_DRAW);
    const stride = LAYOUTS * 3 * 4;
    for (let L = 0; L < LAYOUTS; L++) {
      const loc = gl.getAttribLocation(this.prog, `a_p${L}`);
      if (loc < 0) continue;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, stride, L * 12);
    }
    const metaBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, metaBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.data.meta, gl.STATIC_DRAW);
    const ml = gl.getAttribLocation(this.prog, "a_meta");
    gl.enableVertexAttribArray(ml);
    gl.vertexAttribPointer(ml, 4, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    gl.useProgram(this.prog);
    gl.uniform3fv(this.U.u_orange, ORANGE);
    gl.uniform3fv(this.U.u_ink, INK);
    gl.uniform3fv(this.U.u_cat, CATS.flat());
  }

  /** Reconstruye la pose de barras con los porcentajes de la sala (una subida, no por frame). */
  setBars(pcts: number[]) {
    fillBars(this.data, pcts);
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.data.pos, gl.STATIC_DRAW);
  }

  /** Va a una etapa con una transición lineal (el escalonado lo pone el shader). */
  goTo(stage: number, dur = 1.9) {
    if (stage === this.stageCur && !this.tween) return;
    this.tween = { from: this.stageCur, to: stage, start: performance.now(), dur: dur * 1000 };
  }

  private resize() {
    const r = this.host.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.canvas.style.width = w + "px";
    this.canvas.style.height = h + "px";
    const aspect = w / h;
    // Que quepan ±2.4 en x y ±1.9 en y con fov 40°.
    // Proyección ortográfica: la retícula del busto se lee como puntos desde cualquier
    // ángulo y, de perfil, las caras delantera y trasera coinciden exactamente.
    const halfH = Math.max(1.9, 2.1 / aspect) * 1.02;
    this.dist = 20;
    this.portrait = Math.max(0, Math.min(1, (1.05 - aspect) / 0.55));
    this.viewH = 2 * halfH; // alto visible en unidades de mundo
    this.proj = ortho(halfH * aspect, halfH, 0.1, 60);
  }
  private proj: M4 = m4();
  private portrait = 0;
  private viewH = 4;

  /** Instante hasta el que manda el usuario (después de arrastrar, la cámara no vuelve sola). */
  private userUntil = 0;
  private dragging = false;
  private dragEvents = new AbortController();
  private bindDrag() {
    let lastX = 0, lastY = 0;
    const options = { signal: this.dragEvents.signal };
    window.addEventListener("pointerdown", (e) => {
      const t = e.target as Element | null;
      if (t && t.closest("button, input, a, .form, .results, .opt")) return;
      this.dragging = true; lastX = e.clientX; lastY = e.clientY; this.dragVel = 0;
    }, options);
    window.addEventListener("pointermove", (e) => {
      if (!this.dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY;
      this.angle += dx * 0.008;
      // En el busto, soltar conserva el ángulo elegido sin un giro adicional.
      this.dragVel = this.state.stage === 1 ? 0 : dx * 0.008;
      this.tilt = Math.max(-1.3, Math.min(1.3, this.tilt + dy * 0.006));
      this.userUntil = performance.now() + 6000;
    }, options);
    window.addEventListener("pointerup", () => { this.dragging = false; }, options);
    window.addEventListener("pointercancel", () => { this.dragging = false; }, options);
  }

  /** Proyecta un punto del mundo a píxeles CSS del host. */
  project(p: Vec3, m: M4 = this.vp): [number, number, boolean] {
    const x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12];
    const y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13];
    const w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
    const W = this.canvas.width / this.dpr, H = this.canvas.height / this.dpr;
    return [((x / w) * 0.5 + 0.5) * W, (0.5 - (y / w) * 0.5) * H, w > 0];
  }

  private errors = 0;
  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);
    if (this.lost) return;
    try { this.tick(now); } catch (e) { if (this.errors++ < 3) console.error("[scene] frame:", e); }
  };

  debug() { return { stage: this.state.stage, stageCur: this.stageCur, tween: this.tween, dist: this.dist, portrait: this.portrait, angle: this.angle, errors: this.errors }; }

  private tick(now: number) {
    if (this.state.motionPaused && this.last) this.t0 += now - this.last;
    const dt = Math.min(0.05, (now - this.last) / 1000 || 0.016);
    this.last = now;
    const t = (now - this.t0) / 1000;
    const st = this.state;
    if (this.motionStage !== st.stage) {
      this.motionStage = st.stage;
      this.motionStart = t;
      this.userUntil = 0;
      this.dragVel = 0;
    }

    // Etapa (tween lineal; el suavizado va por partícula en el shader)
    if (st.stage !== (this.tween ? this.tween.to : this.stageCur)) this.goTo(st.stage);
    if (this.tween) {
      const k = Math.min(1, (now - this.tween.start) / this.tween.dur);
      this.stageCur = this.tween.from + (this.tween.to - this.tween.from) * k;
      if (k >= 1) this.tween = null;
    }
    // Amortiguación por tiempo, no por frame
    const ease = (tau: number) => 1 - Math.exp(-dt / tau);
    this.progressCur += (st.progress - this.progressCur) * ease(0.35);
    this.dimCur += (st.dim - this.dimCur) * ease(0.5);
    this.glowCur += (st.glow - this.glowCur) * ease(0.8);

    // Rotación: automática, salvo en barras (se encara a cámara)
    const userDriving = now < this.userUntil;
    if (userDriving) {
      if (!this.dragging) this.angle += this.dragVel; // inercia solo tras soltar
    } else if (!st.motionPaused && st.lockAngle !== null) {
      // Del perfil hacia tres cuartos y de vuelta durante la presentación personal.
      const orbit = st.sway ? 1.25 * Math.pow(Math.sin((t - this.motionStart) * 0.30), 2) : 0;
      const base = st.lockAngle + orbit;
      // Equivalente más cercano al ángulo actual, para no dar la vuelta larga.
      const target = base + Math.round((this.angle - base) / (Math.PI * 2)) * Math.PI * 2;
      this.angle += (target - this.angle) * ease(0.4);
    } else if (!st.motionPaused) {
      this.angle += 0.12 * dt + this.dragVel;
    }
    this.dragVel *= Math.exp(-dt / 0.2);
    if (!userDriving && !st.motionPaused) {
      const tiltTarget = st.lockAngle !== null ? 0.0 : 0.22;
      this.tilt += (tiltTarget - this.tilt) * ease(0.5);
    }
    const tilt = this.tilt;
    let yOff = -0.12 + 0.11 * this.viewH * this.portrait;
    let modelScale = 1;
    const bustWeight = Math.max(0, 1 - Math.abs(this.stageCur - 1));
    if (st.bustFrame && bustWeight > 0) {
      const h = this.canvas.height / this.dpr;
      const { top, bottom } = st.bustFrame;
      const fit = Math.min(1, Math.max(0.1, (bottom - top) / h * this.viewH / 2.65));
      const center = (0.5 - (top + bottom) / (2 * h)) * this.viewH;
      modelScale += (fit - 1) * bustWeight;
      yOff += (center - 0.16 * fit - yOff) * bustWeight;
    }
    const view = mul(translate(0, yOff, -this.dist), mul(scale(modelScale), mul(rotX(tilt), rotY(this.angle))));
    this.vp = mul(this.proj, view);

    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.useProgram(this.bg);
    gl.uniform2f(this.UB.u_res, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.UB.u_time, t);
    gl.uniform1f(this.UB.u_glow, this.glowCur);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    // Cruce breve con las partículas al llegar/salir del busto; las otras poses siguen intactas.
    const surfaceT = Math.max(0, 1 - Math.abs(this.stageCur - 1) / 0.08);
    const surfaceAlpha = surfaceT * surfaceT * (3 - 2 * surfaceT);
    gl.useProgram(this.prog);
    gl.uniform1f(this.U.u_surface, surfaceAlpha);
    gl.uniformMatrix4fv(this.U.u_vp, false, this.vp);
    gl.uniform1f(this.U.u_stage, this.stageCur);
    gl.uniform1f(this.U.u_time, t);
    gl.uniform1f(this.U.u_size, 4.8 * this.dpr * (1 - 0.3 * this.portrait));
    // Punto del busto: 78 % del paso de la retícula, en píxeles de dispositivo
    gl.uniform1f(this.U.u_bustSize, 0.78 * BUST_STEP * modelScale * (this.canvas.height / this.viewH));
    gl.uniform1f(this.U.u_progress, this.progressCur);
    gl.uniform1f(this.U.u_dim, this.dimCur);
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.POINTS, 0, N);
    gl.bindVertexArray(null);

    if (surfaceAlpha > 0) {
      // Primera pasada sin color: profundidad cerrada, incluidos los huecos entre puntos.
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.useProgram(this.bustProg);
      gl.bindVertexArray(this.bustVao);
      gl.uniformMatrix4fv(this.US.u_vp, false, this.vp);
      gl.uniformMatrix4fv(this.US.u_view, false, view);
      gl.uniform1i(this.US.u_depthOnly, 1);
      gl.colorMask(false, false, false, false);
      gl.drawArrays(gl.TRIANGLES, 0, this.bustCount);
      gl.colorMask(true, true, true, true);
      gl.uniform1i(this.US.u_depthOnly, 0);
      gl.uniform1f(this.US.u_spacing, Math.max(2, BUST_STEP * modelScale * this.canvas.height / this.viewH));
      gl.uniform1f(this.US.u_alpha, surfaceAlpha * this.dimCur);
      gl.uniform2f(this.US.u_origin, this.canvas.width / 2, this.canvas.height * (0.5 + yOff / this.viewH));
      gl.uniform3fv(this.US.u_orange, ORANGE);
      gl.uniform3fv(this.US.u_ink, INK);
      gl.depthMask(false);
      gl.drawArrays(gl.TRIANGLES, 0, this.bustCount);
      gl.depthMask(true);
      gl.bindVertexArray(null);
    }

    // Iconos clínicos alrededor del busto; se fragmentan y entran en la nube al anonimizar.
    const morph = Math.max(0, Math.min(1, (this.stageCur - 1) / 0.85));
    const gather = morph * morph * (3 - 2 * morph);
    const orbitView = mul(this.proj, mul(translate(0, yOff, -this.dist), mul(scale(modelScale), mul(rotX(tilt * 0.3), rotY((this.angle + Math.PI / 2) * 0.25)))));
    for (let k = 0; k < (st.healthIcons?.length ?? 0); k++) {
      const el = st.healthIcons![k];
      if (!el) continue;
      const visible = this.stageCur >= 0.8 && this.stageCur < 1.85;
      el.style.visibility = visible ? "visible" : "hidden";
      if (!visible) continue;
      const a = k * Math.PI / 3 + 0.2 + 0.07 * Math.sin(t * 0.5);
      const radius = 1 - gather * 0.88;
      const p: Vec3 = [Math.cos(a) * 1.65 * radius, (Math.sin(a) * 1.13 + 0.16) * radius, Math.sin(a * 2 + t * 0.3) * 0.25 * radius];
      const [x, y] = this.project(p, orbitView);
      el.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${1 - gather * 0.65})`;
      el.style.opacity = String(Math.min(1, (this.stageCur - 0.8) / 0.2) * (1 - Math.pow(morph, 4)));
      el.style.setProperty("--morph", String(Math.min(1, morph * 3)));
    }

    // Los datos comparten la transformación del modelo: posición, giro e inclinación.
    for (const l of st.labels) {
      if (!l.el) continue;
      const [x, y, ok] = this.project(l.pos);
      const depth = view[2] * l.pos[0] + view[6] * l.pos[1] + view[10] * l.pos[2];
      const near = Math.max(0, Math.min(1, (depth + 2) / 4));
      l.el.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${(0.88 + near * 0.16).toFixed(3)})`;
      l.el.style.opacity = ok ? String(0.45 + near * 0.55) : "0";
      l.el.style.zIndex = String(10 + Math.round(near * 20));
    }
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.dragEvents.abort();
    this.ro.disconnect();
    this.gl.getExtension("WEBGL_lose_context")?.loseContext();
    this.canvas.remove();
  }
}
