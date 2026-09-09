// Ojo: nada de comillas invertidas dentro de los shaders (viven en template literals).

export const PARTICLE_VS = `#version 300 es
precision highp float;
in vec3 a_p0; in vec3 a_p1; in vec3 a_p2; in vec3 a_p3; in vec3 a_p4; in vec3 a_p5;
in vec4 a_meta; // kind, cat, seed, seed2
uniform mat4 u_vp;
uniform float u_stage;    // 0..5 continuo
uniform float u_time;
uniform float u_size;     // tamaño base en px (ya con dpr y distancia)
uniform float u_bustSize; // tamaño del punto en el busto (px · distancia)
uniform float u_surface;
uniform float u_progress; // 0..1 partículas encendidas (formulario)
uniform float u_dim;      // atenuación global
uniform vec3 u_orange;
uniform vec3 u_ink;
uniform vec3 u_cat[6];
out vec3 v_color;
out float v_alpha;

vec3 pick(int i) {
  if (i <= 0) return a_p0;
  if (i == 1) return a_p1;
  if (i == 2) return a_p2;
  if (i == 3) return a_p3;
  if (i == 4) return a_p4;
  return a_p5;
}

void main() {
  float kind = a_meta.x;
  int cat = int(a_meta.y + 0.5);
  float seed = a_meta.z;
  float seed2 = a_meta.w;

  float s = clamp(u_stage, 0.0, 5.0);
  int i = int(floor(s));
  float f = s - float(i);
  if (i >= 5) { i = 4; f = 1.0; }
  // Escalonado por partícula: cada una arranca en un momento distinto del tramo.
  float ff = smoothstep(0.0, 1.0, clamp((f - seed * 0.45) / 0.55, 0.0, 1.0));
  vec3 A = pick(i);
  vec3 B = pick(i + 1);
  vec3 p = mix(A, B, ff);
  p += sin(ff * 3.14159) * 0.35 * vec3(seed2 - 0.5, seed - 0.5, 0.5 - seed2);

  float alpha = 1.0;
  // Partículas identitarias (rostro): al anonimizar se van y se apagan.
  if (kind > 0.5 && s >= 1.0) {
    float t1 = clamp(s - 1.0, 0.0, 1.0);
    float g = smoothstep(0.0, 1.0, clamp((t1 - seed * 0.5) / 0.5, 0.0, 1.0));
    vec3 d = normalize(a_p1 + vec3(0.0, -0.4, 0.6));
    p = a_p1 + d * 3.2 * g + vec3(0.0, g * g * 0.8, 0.0);
    alpha = 1.0 - g;
  }

  // Vida: vibración sutil que nunca se repite a ojo (apagada en el busto, que es retícula exacta).
  float bustW = 1.0 - min(1.0, abs(s - 1.0));
  p += (1.0 - bustW) * 0.018 * vec3(sin(u_time * 1.3 + seed * 40.0), cos(u_time * 1.1 + seed * 30.0), sin(u_time * 0.9 + seed2 * 20.0));

  // Encendido progresivo (formulario): las partículas se iluminan al responder.
  float lit = mix(0.22, 1.0, step(seed2, u_progress));
  alpha *= lit * u_dim;

  // Color: tinta, gris y naranja (como el busto punteado del deck); en clusters, por dimensión; en barras, naranja.
  vec3 base = (seed < 0.34) ? u_orange : u_ink;
  float w = smoothstep(3.2, 4.0, s);
  vec3 c = mix(base, u_cat[cat], w);
  float w2 = smoothstep(4.2, 5.0, s);
  c = mix(c, (seed < 0.34) ? u_orange : u_ink, w2);
  v_color = c;
  v_alpha = alpha * (0.75 + 0.25 * seed2) * (1.0 - u_surface);

  vec4 clip = u_vp * vec4(p, 1.0);
  gl_Position = clip;
  float sz = mix(u_size, u_bustSize, bustW) / max(clip.w, 0.1);
  gl_PointSize = clamp(sz, 1.5, 30.0);
}`;

export const PARTICLE_FS = `#version 300 es
precision highp float;
in vec3 v_color;
in float v_alpha;
out vec4 o;
void main() {
  if (v_alpha < 0.001) discard;
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float d = dot(c, c);
  if (d > 1.0) discard;
  if (d > 0.82) discard;
  float a = smoothstep(0.82, 0.5, d) * v_alpha;
  o = vec4(v_color * a, a); // premultiplicado
}`;

// Retícula en pantalla: un punto por celda incluso al girar. La pasada de profundidad
// usa la superficie completa, para que la espalda no aparezca entre los puntos de la cara.
export const BUST_VS = `#version 300 es
precision highp float;
in vec3 a_position;
uniform mat4 u_vp;
uniform mat4 u_view;
out vec3 v_view;
void main() {
  v_view = (u_view * vec4(a_position, 1.0)).xyz;
  gl_Position = u_vp * vec4(a_position, 1.0);
}`;

export const BUST_FS = `#version 300 es
precision highp float;
in vec3 v_view;
uniform bool u_depthOnly;
uniform float u_spacing;
uniform float u_alpha;
uniform vec2 u_origin;
uniform vec3 u_orange;
uniform vec3 u_ink;
out vec4 o;
void main() {
  if (u_depthOnly) { o = vec4(0.0); return; }
  vec2 grid = (gl_FragCoord.xy - u_origin) / u_spacing;
  vec2 cell = floor(grid + 0.5);
  float radius = length(grid - cell);
  float edge = max(fwidth(radius), 0.01);
  vec3 normal = normalize(cross(dFdx(v_view), dFdy(v_view)));
  float coverage = 1.0 - smoothstep(0.35 - edge, 0.35 + edge, radius);
  if (coverage < 0.01) discard;
  float seed = fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
  if (normal.z < 0.0) normal = -normal;
  float light = 0.72 + 0.28 * max(0.0, dot(normal, normalize(vec3(-0.4, 0.6, 1.0))));
  vec3 color = seed < 0.34 ? u_orange * light : mix(vec3(0.30), u_ink, light);
  float alpha = coverage * u_alpha;
  o = vec4(color * alpha, alpha);
}`;

export const BG_VS = `#version 300 es
precision highp float;
out vec2 v_uv;
void main() {
  vec2 p = vec2((gl_VertexID == 1) ? 3.0 : -1.0, (gl_VertexID == 2) ? 3.0 : -1.0);
  v_uv = p * 0.5 + 0.5;
  gl_Position = vec4(p, 0.0, 1.0);
}`;

export const BG_FS = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform vec2 u_res;
uniform float u_time;
uniform float u_glow;
out vec4 o;
void main() {
  // Crema liso, con una viñeta apenas perceptible.
  float aspect = u_res.x / u_res.y;
  vec2 q = (v_uv - 0.5) * vec2(aspect, 1.0);
  vec3 col = vec3(0.984, 0.980, 0.968);
  col *= 1.0 - 0.05 * dot(q, q) * u_glow;
  o = vec4(col, 1.0);
}`;
