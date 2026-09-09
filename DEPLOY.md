# Subir a Railway

La app corre en Railway con SQLite guardada en un **volumen** (si no, la base se borra en
cada deploy). Cinco pasos:

1. **Subir el repo a GitHub** (Angel hace el commit y el push).

2. **Crear el proyecto en Railway**: New Project → Deploy from GitHub repo → elegir
   `cromoapp`. Railway detecta Node y usa `nixpacks.toml` + `railway.json` de este repo
   (build `npm run build`, arranque `prisma migrate deploy && npm run start`).

3. **Añadir un volumen**: en el servicio → pestaña *Volumes* → *Add volume* → mount path
   `/data`.

4. **Variables** (servicio → *Variables*):

   ```
   DATABASE_URL=file:/data/cromodata.db
   ROOM_BASELINE=120
   ```

   `PORT` la pone Railway sola y Next la respeta. `ROOM_BASELINE=0` quita la sala simulada.

5. **Dominio**: servicio → *Settings* → *Networking* → *Generate domain*. Esa URL es la que
   se comparte por QR con los asistentes. Para ensayar: `https://<dominio>/?demo=1`.

## Comprobar

- `https://<dominio>/api/aggregate` debe devolver JSON (es el healthcheck).
- Rellenar el formulario desde un móvil y ver que `nReal` sube en ese JSON.

## Alternativa con Postgres

Si más adelante se quiere Postgres: añadir el plugin Postgres en Railway, cambiar
`provider = "postgresql"` en `prisma/schema.prisma`, usar `@prisma/adapter-pg` en
`src/lib/db.ts`, borrar `prisma/migrations` y correr `npx prisma migrate dev --name init`
contra esa base. El volumen deja de hacer falta.

## Redeploy

Cada push a la rama conectada vuelve a desplegar. La base en el volumen se conserva.
