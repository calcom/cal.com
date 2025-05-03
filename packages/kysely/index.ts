import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

import type { DB, Booking } from "./types.ts";

export type { DB, Booking };

const connectionString = process.env.DATABASE_URL ?? "postgresql://postgres:@localhost:5450/calendso";

const dialect = new PostgresDialect({
  pool: new Pool({ connectionString }),
});

const db = new Kysely<DB>({
  dialect,
});

export default db;
