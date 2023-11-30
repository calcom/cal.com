import type { ExpressionBuilder, StringReference } from "kysely";
import { sql } from "kysely";

export function traverseJSON<DB, TB extends keyof DB>(
  eb: ExpressionBuilder<DB, TB>,
  column: StringReference<DB, TB>,
  path: string | [string, ...string[]]
) {
  if (!Array.isArray(path)) {
    path = [path];
  }

  return sql`${sql.ref(column)}->${sql.raw(path.map((item) => `'${item}'`).join("->"))}`;
}
