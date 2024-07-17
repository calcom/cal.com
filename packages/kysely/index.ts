import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

import type { DB } from "./types.ts";

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
