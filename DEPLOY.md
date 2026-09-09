# Subir a Railway (Postgres)

La app corre en Railway con el servicio **Postgres** del mismo proyecto. Ya no hace falta
volumen: la base vive en Postgres.

1. **Subir el repo a GitHub** (Angel hace el commit y el push). Railway despliega solo.

2. **Variables del servicio `cromodata.app`** (pestaña *Variables*):

   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   ROOM_BASELINE=120
   ADMIN_PASSWORD=<una clave larga>
   ADMIN_TZ=America/Mexico_City
   ```

   `${{Postgres.DATABASE_URL}}` es una referencia a la variable del servicio Postgres:
   escríbela tal cual y Railway la resuelve. `PORT` la pone Railway y Next la respeta.
   `ROOM_BASELINE=0` quita la sala simulada.

3. Al arrancar, `npx prisma migrate deploy` crea las tablas `Participant` y `HealthRecord`
   (migración `prisma/migrations/20260909_init`). Healthcheck en `/api/aggregate`.

4. **Dominio**: *Settings → Networking → Generate domain*. Esa URL va al QR.

## Panel de respuestas

`https://<dominio>/admin` pide la contraseña de `ADMIN_PASSWORD` y muestra dos pestañas:
onboarding profesional (nombre, correo, organización, sector, área, nivel, decisión,
contacto) y respuestas de salud anónimas (por token). Botón «Descargar CSV» en cada una.
La sesión dura 12 horas; cambiar la contraseña en Railway cierra todas las sesiones.

## Desarrollo local

En `.env` pon `DATABASE_URL` apuntando a tu Postgres local o a la `DATABASE_PUBLIC_URL`
del Postgres de Railway (pestaña *Variables* del servicio Postgres), y `ADMIN_PASSWORD`.
Después: `npx prisma migrate deploy` y `npm run dev`.

## Comprobar

- `https://<dominio>/api/aggregate` devuelve JSON con `nReal` (respuestas reales).
- Rellenar el formulario desde un móvil y ver que aparece en `/admin`.
