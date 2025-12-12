import type { Kysely } from "kysely";

import type { DB, Booking } from "./types";

export type { DB, Booking };

export { createKyselyDb } from "./factory";
export type { KyselyConfig } from "./factory";

export { default as kyselyRead } from "./read";
export { default as kyselyWrite } from "./write";

export type KyselyDb = Kysely<DB>;

import kyselyWrite from "./write";

export default kyselyWrite;
