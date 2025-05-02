import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

import type { DB, Booking } from "./types.ts";

export type { DB, Booking };
const dialect = new PostgresDialect({
  pool: new Pool({
    database: "calendso",
    host: "localhost",
    user: "postgres",
    password: "postgres",
    port: 5450,
  }),
});

const db = new Kysely<DB>({
  dialect,
});

export default db;
