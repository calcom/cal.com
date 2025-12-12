import { Kysely, ParseJSONResultsPlugin, PostgresDialect, DeduplicateJoinsPlugin } from "kysely";
import { Pool } from "pg";

import type { DB } from "./types";

export type KyselyConfig = {
  connectionString: string;
  maxConnections?: number;
};

export function createKyselyDb(config: KyselyConfig): Kysely<DB> {
  const pool = new Pool({
    connectionString: config.connectionString,
    max: config.maxConnections ?? 10,
  });

  const dialect = new PostgresDialect({ pool });

  return new Kysely<DB>({
    dialect,
    plugins: [new ParseJSONResultsPlugin(), new DeduplicateJoinsPlugin()],
  });
}

export type { DB };
