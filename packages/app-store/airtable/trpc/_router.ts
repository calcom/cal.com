import authedProcedure from "@calcom/trpc/server/procedures/authedProcedure";
import { router } from "@calcom/trpc/server/trpc";

const UNSTABLE_HANDLER_CACHE: any = {};

const appAirtable = router({
  bases: authedProcedure.query(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.bases) {
      UNSTABLE_HANDLER_CACHE.bases = await import("./getBases.handler").then((mod) => mod.getBasesHandler);
    }
    return UNSTABLE_HANDLER_CACHE.bases({ ctx });
  }),
});

export default appAirtable;
