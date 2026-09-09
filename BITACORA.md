# Bitácora — cromoapp (Cromodata · Mapa de salud)

Entrada más reciente arriba. Cada sesión: qué se hizo, qué se decidió, qué quedó abierto.

---

## 2026-09-09 — Sesión 4: logotipo oficial, iconos de Angel, fix de Railway

### Qué se hizo

- **Logotipo oficial**: extraído en vector de cromodata.com (Framer lo incrusta como SVG en
  línea; el `fill` usaba tokens de Framer y se sustituyó por color fijo o `currentColor`).
  Guardado en `public/brand/` (negro, blanco, naranja, `currentColor`, isotipo, icono PNG
  y `preview.html`). `Logo.tsx` ahora pinta ese SVG: negro en intro/formulario/recorrido,
  blanco en resultados.
- Angel añadió por su cuenta `HealthOrbit.tsx` (iconos clínicos que orbitan el busto),
  texto que se escribe letra a letra, pausa del avance automático y tarjetas de etapa
  reducidas a iconos. Revisado: completo, sin errores.
- `prisma.config.ts` ya no aborta si falta `DATABASE_URL` (fallo de build en Railway).

- **Resultados rediseñados** (`Results.tsx` + bloque CSS «resultados»): fondo crema con
  acentos naranja en vez de fondo naranja; rejilla 7/5 en escritorio que cabe en una
  pantalla (señales con etiqueta · barra · % en una línea, cuatro cifras destacadas en
  2×2, bloqueados/visibles y pilares en fila). En móvil apila y la etiqueta va sobre la
  barra. Se eliminaron las clases antiguas `.card`, `.grid2`, `.bignum`, `.split`, `.pillars`.

- **Reporte vivo**: entrada escalonada de cada bloque (`.rv` con `--i`), salida animada al
  pulsar «Nuevo participante» (clase `is-leaving`, 0,5 s antes de reiniciar), cifras que
  cuentan hacia arriba, checks que se dibujan, candados en cascada e iconos animados en
  los pilares (escudo que se traza y late, globo con órbita, chevrones que se acercan).
  Todo respeta `prefers-reduced-motion`.
- **Botones más ligeros** en toda la app: 44 px de alto, peso 500, 15 px, sombra suave;
  los `small` a 38 px. El último paso del recorrido dice «Ver la radiografía» para que
  no parta en tres líneas en móvil.

- **Postgres en vez de SQLite** (Angel levantó el servicio Postgres en Railway):
  `provider = "postgresql"`, adaptador `@prisma/adapter-pg`, se quitó `better-sqlite3`.
  Migración inicial regenerada para Postgres con `prisma migrate diff --from-empty
  --to-schema … --script` (no necesita conexión). `nixpacks.toml` sin gcc/python.
  Variables en Railway: `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `ROOM_BASELINE`,
  `ADMIN_PASSWORD`. Ya no hace falta el volumen.
- **Panel `/admin`** protegido por contraseña (`ADMIN_PASSWORD`): cookie HMAC de 12 h,
  dos pestañas (onboarding profesional y salud anónima), contadores y descarga CSV
  (`/api/admin/export?type=perfil|salud`). Código en `src/lib/admin.ts`, `src/app/admin/`.

- **Borrado real en `/admin`** (Angel: sin soft delete): botón «Borrar» por fila en las dos
  tablas, «Borrar todos los perfiles» / «Borrar todas las respuestas de salud» según la
  pestaña y «Vaciar todo». Server actions en `src/app/admin/actions.ts` con comprobación de
  sesión; `DeleteForm.tsx` pide confirmación del navegador antes de enviar. No probado en
  local (sin Postgres); probar en Railway.

### Qué se decidió

- Angel pidió **mantener las formas** de los pasos 2 y 3 (blob y esferas). Se probó una
  versión en retícula regular tipo lámina «Anonymized / Dataset» y **la rechazó**; se
  revirtió todo al último commit. No volver a proponerla. Quedó pendiente solo subir la
  tupidez/definición de los puntos en esos pasos, si lo pide.

### Qué quedó abierto

- **No se pudo probar contra Postgres en local**: el Postgres local de Angel (5433/5434)
  tiene otra contraseña. Probar tras el deploy en Railway: `/api/aggregate`, un envío del
  formulario y `/admin`. Para desarrollar en local, poner en `.env` la
  `DATABASE_PUBLIC_URL` de Railway o las credenciales del Postgres local.
- Confirmar que el deploy de Railway corresponde al último commit (pestaña Deployments).
- Pendientes anteriores.

---

## 2026-09-09 — Sesión 3: busto 3D de perfil, fondo crema liso

### Qué se hizo

- **Busto 3D real** (`src/scene/particles.ts`): el volumen es la intersección de dos
  siluetas extruidas dibujadas en canvas 2D (perfil con frente, nariz, labios, mentón,
  cuello y hombros; y frontal). Se muestrea en una retícula regular y se conservan las
  celdas de superficie; el paso se ajusta solo hasta que toda la superficie cabe en las
  3.800 partículas (sin huecos aleatorios). Puntos negros y naranja (34 %), grandes y sin
  temblor en ese paso, como la lámina de referencia que pasó Angel.
- **Cámara**: `lockAngle` sustituye a `lockRotation`. En el busto la cámara se fija de
  perfil (π/2, cara a la derecha) con un balanceo de ±0.16 rad para que se lea el
  volumen; en barras se fija a 0. El resto rota libre.
- **Cámara casi ortográfica** (FOV 14°, cámara lejana, tamaño de punto escalado con la
  distancia): con perspectiva normal, mirar la retícula por su eje convierte las columnas
  en rayas y el busto no se reconoce. Con la cámara fija de perfil también se anula la
  inclinación vertical, por la misma razón.
- **Retícula limpia de perfil**: se conserva una sola celda por columna (y, z), la de
  mayor x, es decir, la superficie lateral que mira a la cámara. Con la cámara casi
  ortográfica, las celdas delanteras y traseras se proyectaban casi encima y emborronaban
  el dibujo. Las partículas sobrantes repiten celda y heredan su semilla de color. El
  tamaño del punto es el 78 % del paso de la retícula (`u_bustSize`). Sin balanceo.
- **Perfil ajustado a la lámina de Angel**: cara a la izquierda (`lockAngle = -π/2`),
  cabeza redonda y ancha, nariz pequeña y redondeada, cuello corto, hombros compactos.
  `PX = 68` deja la figura más pequeña en escritorio.
- **3D completo y giro con el dedo** (pedido de Angel): proyección **ortográfica** real
  (de perfil, cara delantera y trasera coinciden exactamente, sin doble punto), cascarón 3D
  completo de 7.000 partículas con **test de profundidad** (las caras traseras quedan
  ocultas), y arrastre en toda la ventana (salvo botones, formulario y resultados): eje X
  gira, eje Y ladea, con inercia. Tras 6 s sin tocar, la cámara vuelve sola al ángulo del
  paso. `touch-action: none` en intro y recorrido para que el dedo no haga scroll.
- **Railway**: `railway.json`, `nixpacks.toml` y `DEPLOY.md`. SQLite en un volumen en
  `/data`, `prisma migrate deploy` al arrancar, healthcheck en `/api/aggregate`. Probado
  en local: `migrate deploy` sobre base vacía y `npm run build` pasan.
- **Fallo de build en Railway corregido**: `prisma.config.ts` usaba `env("DATABASE_URL")`,
  que lanza error si la variable no existe, y en el build (`npm ci` → `prisma generate`)
  aún no estaba definida. Ahora usa `process.env.DATABASE_URL ?? "file:./prisma/dev.db"`.
  El aviso `UndefinedVar: $NIXPACKS_PATH` del log es inofensivo.
- **Fondo**: crema liso `#FBFAF7`, sin degradados de color, sin anillos y sin líneas
  conectoras (Angel los descartó: «elementos raritos»). Se eliminó `Conectores.tsx`.

### Qué se decidió

- Angel rechazó la silueta 2D y el fondo con acentos naranja. Criterio: **busto 3D
  punteado de perfil, fondo blanco crema puro**.

### Qué quedó abierto

- **Desplegar en Railway** siguiendo `DEPLOY.md` (Angel hace commit y push) y probar en
  móvil real: giro con el dedo, rendimiento con 7.000 puntos, teclado en el formulario.
- Angel no ha validado aún esta versión del busto en pantalla.
- Pendientes anteriores (móvil real, pantalla de proyección, Postgres, textos).

---

## 2026-09-09 (madrugada) — Sesión 2: fondo claro, busto punteado y limpieza de servidores

### Qué se hizo

- **Tema claro** en toda la experiencia (intro, formulario, recorrido): fondo hueso
  `#F8F6F3`, texto tinta `#1E1B18`, tarjetas blancas con sombra. Resultados siguen en
  naranja con tarjetas blancas. Las partículas ya no son luz aditiva: son puntos sólidos
  tinta / gris / naranja con mezcla normal, como el busto punteado del deck.
- **Fondo vivo por shader**: tres manchas de color (durazno, lila, ámbar) que se
  desplazan despacio sobre el hueso, más anillos ovalados concéntricos alrededor de la
  escena (intensidad `rings` en el estado: 0.6 intro, 1 busto, 0.5 blob, 0 resto).
- **Busto nuevo**: se dibuja un trazado 2D (cabeza elipse + cuello + hombros) en un
  canvas oculto y se rasteriza a una retícula de puntos cada 2 px; cada partícula ocupa
  una celda. Reproduce la lámina de referencia. Como es plano, en ese paso la rotación
  queda bloqueada de frente (`lock: true`).
- **Conectores**: SVG con líneas curvas y nodos que entran por los lados (intro y paso 1).
- Se buscaron siluetas CC0 (freesvg.org, publicdomainvectors.org); no se usaron porque
  el trazado propio da el mismo resultado sin dependencias ni licencias que revisar.

### Qué se decidió

- Angel pidió fondo claro Cromodata con degradados animados y **el servidor levantado**.
- Angel pidió **tirar todos los proyectos locales**: se cerraron todos los procesos Node
  (varios Vite en 5173–5176 y un Next de tireclick en 3000). cromoapp quedó solo en
  `http://localhost:3000`.

### Validado

- Escritorio y 390 px: intro, formulario, cinco pasos del recorrido con el nuevo look.
  `tsc` limpio, consola sin errores.

### Qué quedó abierto

- Los mismos pendientes de la sesión 1 (móvil real, pantalla de proyección, Postgres,
  textos por validar).
- Los anillos son estáticos; podrían pulsar suavemente al ritmo del fondo.
- Si el puerto 3000 vuelve a estar ocupado por otro proyecto, `npm run dev -- -p 3210`.

---

## 2026-09-08 — Sesión 1: de repo vacío a app completa para la presentación del 09-09

### Qué se hizo

**Contexto.** Se leyeron los tres PDF (ahora en `docs/`): el deck de la dinámica
«¿Podemos convertir esta sala en un mapa de salud en tres minutos?», el plan de Keila
(CEO) con las cuatro proyecciones de resultados, y el deck Pharmstars (Cromodata =
plataforma de datos clínicos del mundo real para LatAm, datos tokenizados y
anonimizados, 47 hospitales / 5 países).

**App Next.js 16 (App Router, TypeScript, sin Tailwind).** Un solo flujo en `src/app/page.tsx`
con cuatro fases: intro → formulario → recorrido animado → resultados.

- **Formulario** (`src/lib/questions.ts` + `components/Form.tsx`): las 8 preguntas de
  onboarding y las 8 + 2 opcionales de salud, tal cual las pasó Angel. Una pregunta por
  pantalla, validación de correo, «Ninguno / No lo sé / Prefiero no responder» desactivan
  las demás opciones. Contador 1/18 y barra de progreso.
- **Escena WebGL2 a mano** (`src/scene/`): 3.800 partículas con seis poses subidas una
  sola vez (globo, busto, blob tokenizado, retícula 3D de registros, seis clusters por
  dimensión, barras). El vertex shader interpola entre poses con escalonado por partícula;
  las partículas «de rostro» salen volando y se apagan al anonimizar. Fondo con halo
  naranja por shader. Etiquetas HTML ancladas a puntos del mundo (proyección en JS).
  Durante el formulario, las partículas del globo se van encendiendo con cada respuesta.
- **Recorrido** (`components/Journey.tsx`): 5 pasos con las cuatro tarjetas blancas del
  deck (Protegiendo identidad → Agrupando respuestas → Identificando patrones → Generando
  insights). Flechas / espacio avanzan; botón «Auto» avanza cada 7,5 s.
- **Resultados** (`components/Results.tsx`): fondo naranja con tarjetas blancas como en
  las diapositivas. Barras de señales, dos cruces («X% de quienes duermen <6 h declara
  estrés frecuente»), índice de 3+ señales, paradoja de percepción, bloque
  Bloqueados/Visibles, tres pilares y CTA cromodata.app.
- **Persistencia SQL** (Prisma 7 + SQLite con adaptador better-sqlite3): tablas
  `Participant` (identidad) y `HealthRecord` (salud + token aleatorio) **sin relación**.
  `POST /api/responses` guarda ambas y devuelve el agregado; `GET /api/aggregate` devuelve
  la radiografía. Migración inicial aplicada (`prisma/migrations/…_init`).
- **Sala simulada**: 120 personas deterministas (`src/lib/simulation.ts`) para que la demo
  nunca esté vacía; se suman a los registros reales. `ROOM_BASELINE=0` las quita.
- Atajo `?demo=1` para ensayar el recorrido sin llenar el formulario.

### Qué se decidió

- **Next.js + SQL desde el inicio** (pedido de Angel a mitad de sesión). Prisma con
  SQLite ahora; a Postgres cambiando provider, URL y adaptador. Se fijó Prisma 7.10
  porque `npm i prisma` traía un RC 8 incompatible con el cliente.
- **Estética = diapositivas**: naranja `#F26A21` sobre negro en las pantallas «de mapa»,
  naranja con tarjetas blancas en resultados, Poppins. Nada de paletas inventadas.
- **WebGL sin Three.js**: el objeto se describe con números, no viene de Blender.
- **Las etiquetas del recorrido usan `position: fixed`** porque la proyección devuelve
  píxeles de viewport; con `absolute` dentro de un contenedor con cabecera quedaban
  desplazadas.
- La separación identidad/salud se hace **sin llave foránea a propósito**: el token del
  registro es aleatorio y no se guarda en `Participant`.

### Validado (no volver a revisar)

- Envío real del formulario crea una fila en cada tabla y devuelve el agregado (probado
  con un registro de prueba que ya se borró; `prisma/dev.db` queda vacía).
- Las cinco etapas transforman correctamente en escritorio y en 390 px de ancho
  (retícula 3D, clusters, barras con porcentajes encima).
- `tsc --noEmit` limpio.
- Chrome **pausa `requestAnimationFrame` en pestañas ocultas**: si al probar «no anima»,
  primero comprobar que la pestaña está en primer plano. Costó media hora. Al volver a
  primer plano la escena salta a la pose correcta (el tween es por tiempo, no por frame).
- `npm run build` de producción compila sin errores.

### Qué quedó abierto

- **Probar en un móvil real** (iPhone y Android) en la red del evento: toque, teclado
  sobre el campo de texto, rendimiento de las partículas en gama media. Solo se probó con
  iframes de 390 px en Chrome de escritorio.
- **Pantalla de proyección** («Escanea y forma parte del mapa» con QR, contador de
  conectados y cuenta atrás) no está hecha; el deck la incluye. Sería una ruta `/sala`
  que consulte `/api/aggregate` cada pocos segundos.
- **Exportar a Postgres** cuando haya hosting: no probado, solo preparado.
- Textos de los pasos del recorrido y de resultados son propuesta mía, no validados por
  Keila.
- El badge «N» de Next en la esquina es solo en desarrollo; en `npm run build && npm start`
  desaparece.
