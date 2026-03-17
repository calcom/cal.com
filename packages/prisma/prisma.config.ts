import path from "node:path";

import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

dotenv.config({ path: path.join(__dirname, ".env") });

const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl) {
  try {
    const url = new URL(databaseUrl);
    console.log(`Datasource "db": PostgreSQL server at "${url.hostname}:${url.port || 5432}"`);
  } catch {}
}

export default defineConfig({
  schema: path.join(__dirname, "schema.prisma"),
  migrations: {
    seed: "yarn seed-basic",
  },
});
