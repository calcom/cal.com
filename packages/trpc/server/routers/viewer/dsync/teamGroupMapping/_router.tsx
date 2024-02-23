import authedOrgAdminProcedure from "@calcom/trpc/server/procedures/authedProcedure";
import { router } from "@calcom/trpc/server/trpc";

import { ZCreateInputSchema } from "./create.schema";

type TeamGroupMappingHandlerCache = {
  get?: typeof import("./get.handler").getHandler;
  create?: typeof import("./create.handler").getHandler;
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
  create: authedOrgAdminProcedure.input(ZCreateInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.create) {
      UNSTABLE_HANDLER_CACHE.create = await import("./create.handler").then((mod) => mod.createHandler);
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.create) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.create({
      ctx,
      input,
    });
  }),
});
