import authedProcedure from "@calcom/trpc/server/procedures/authedProcedure";
import { router } from "@calcom/trpc/server/trpc";

import { ZTablesInputSchema } from "./tables.schema";

const UNSTABLE_HANDLER_CACHE: any = {};

const appAirtable = router({
  bases: authedProcedure.query(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.bases) {
      UNSTABLE_HANDLER_CACHE.bases = await import("./bases.handler").then((mod) => mod.basesHandler);
    }
    return UNSTABLE_HANDLER_CACHE.bases({ ctx });
  }),
  tables: authedProcedure.input(ZTablesInputSchema).query(async ({ ctx, input: { baseId } }) => {
    if (!UNSTABLE_HANDLER_CACHE.tables) {
      UNSTABLE_HANDLER_CACHE.tables = await import("./tables.handler").then((mod) => mod.tablesHandler);
    }
    return UNSTABLE_HANDLER_CACHE.tables({ ctx, baseId });
  }),
});

export default appAirtable;
