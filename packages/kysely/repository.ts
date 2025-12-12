import type { Kysely, Transaction } from "kysely";

import type { DB } from "./types";

export type KyselyDb = Kysely<DB>;
export type KyselyTransaction = Transaction<DB>;

export interface KyselyRepositoryContext {
  readDb: KyselyDb;
  writeDb: KyselyDb;
}

export function createRepositoryContext(readDb: KyselyDb, writeDb: KyselyDb): KyselyRepositoryContext {
  return { readDb, writeDb };
}
