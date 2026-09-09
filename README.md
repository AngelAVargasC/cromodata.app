# Cromodata · Mapa de salud

Web app para la dinámica «¿Podemos convertir esta sala en un mapa de salud en tres minutos?».
Cada asistente responde un formulario en su móvil y después ve, con una animación WebGL guiada,
cómo sus datos pasan de identificarle a ser un registro anónimo que solo existe como estadística de la sala.

## Arrancar

```bash
npm install          # instala y genera el cliente Prisma
npx prisma migrate dev   # crea prisma/dev.db (solo la primera vez)
npm run dev          # http://localhost:3000
```

Atajos útiles:

- `http://localhost:3000/?demo=1` salta el formulario y entra directo al recorrido (para ensayar).
- Flechas ← → o barra espaciadora avanzan el recorrido; el botón «Auto» avanza solo cada 7,5 s.
- `GET /api/aggregate` devuelve la radiografía de la sala en JSON.
- `npm run db:studio` abre Prisma Studio para ver las tablas.

Para que los asistentes entren desde sus móviles en la misma red: `npm run dev -- -H 0.0.0.0` y compartir la IP local (Next la imprime como «Network»).

## Base de datos

SQLite vía Prisma, en `prisma/dev.db`. Dos tablas **sin relación entre sí**:

- `Participant`: nombre, correo, organización y perfil profesional (bloqueados).
- `HealthRecord`: respuestas de salud con un token aleatorio (visibles solo agregadas).

Cambiar a Postgres: en `prisma/schema.prisma` poner `provider = "postgresql"`, en `.env` la URL de conexión,
en `src/lib/db.ts` usar `@prisma/adapter-pg`, y correr `npx prisma migrate dev`.

`ROOM_BASELINE=0` en `.env` quita las 120 personas simuladas que rellenan la sala por defecto.

## Estructura

- `src/app/page.tsx` — fases: intro → formulario → recorrido → resultados.
- `src/components/` — `Intro`, `Form`, `Journey`, `Results`, `Scene`.
- `src/scene/` — motor WebGL2 a mano: `particles.ts` (poses), `shaders.ts`, `engine.ts`.
- `src/lib/` — `questions.ts` (formulario oficial), `signals.ts` (señales y agregación), `simulation.ts`, `room.ts`, `db.ts`.
- `docs/` — los PDF de contexto de Cromodata.
- `BITACORA.md` — qué se hizo, qué se decidió y qué quedó abierto en cada sesión.
