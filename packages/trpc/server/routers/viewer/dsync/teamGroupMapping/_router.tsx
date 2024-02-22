import authedOrgAdminProcedure from "@calcom/trpc/server/procedures/authedProcedure";
import { router } from "@calcom/trpc/server/trpc";

type TeamGroupMappingHandlerCache = {
  get?: typeof import("./get.handler").getHandler;
};

const UNSTABLE_HANDLER_CACHE: TeamGroupMappingHandlerCache = {};

export const teamGroupMappingRouter = router({
  get: authedOrgAdminProcedure.query(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.get) {
      UNSTABLE_HANDLER_CACHE.get = await import("./get.handler").then((mod) => mod.getHandler);
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.get) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.get({
      ctx,
      input,
    });
  }),
});
