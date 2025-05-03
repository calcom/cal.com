import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

import type { DB, Booking } from "./types.ts";

export type { DB, Booking };

const connectionString = process.env.DATABASE_URL ?? "postgresql://postgres:@localhost:5450/calendso";
const parsedUrl = new URL(connectionString);
const poolOptions = {
  database: parsedUrl.pathname?.slice(1) || undefined, // Remove leading '/'
  host: parsedUrl.hostname || "localhost",
  user: parsedUrl.username || undefined, // Use undefined if not provided
  password: parsedUrl.password || undefined, // Use undefined if not provided
  port: parsedUrl.port ? parseInt(parsedUrl.port, 10) : 5432, // Default PG port is 5432
};
const dialect = new PostgresDialect({
  pool: new Pool(poolOptions),
});

const db = new Kysely<DB>({
  dialect,
});

export default db;
