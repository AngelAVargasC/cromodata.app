# cromoapp — Cromodata · Mapa de salud

Lee primero `BITACORA.md` (contexto de sesiones) y `README.md` (cómo arrancar y estructura).
Contexto de la empresa en `docs/*.pdf` (deck de la dinámica, plan de Keila, deck Pharmstars).

Reglas del proyecto:

- Angel hace sus propios commits. No commitear ni pushear.
- Marca: naranja `#F26A21` sobre negro `#0D0C0B`, tarjetas blancas redondeadas, Poppins. Fondo naranja con tarjetas blancas en pantallas de resultado. Ver las diapositivas antes de inventar estilos nuevos.
- El formulario de `src/lib/questions.ts` es el oficial del cliente; no cambiar textos ni opciones sin que lo pida.
- La escena WebGL es a mano (sin Three.js): toda la animación vive en el vertex shader, los búferes se suben una vez. Nada de estado de React dentro del bucle.
- Identidad y salud se guardan en dos tablas sin relación; mantener esa separación en cualquier cambio de esquema.
- Al cerrar cada sesión, añade una entrada arriba en `BITACORA.md`.
