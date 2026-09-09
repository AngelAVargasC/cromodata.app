import "dotenv/config";
import { defineConfig } from "prisma/config";

// En build (Railway) puede no existir DATABASE_URL todavía: `prisma generate` no la
// necesita, así que se usa un valor por defecto en vez de fallar.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" },
});
