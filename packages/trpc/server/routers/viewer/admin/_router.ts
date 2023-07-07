import { authedAdminProcedure } from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZListMembersSchema } from "./listPaginated.schema";

type AdminRouterHandlerCache = {
  listPaginated?: typeof import("./listPaginated.handler").listPaginatedHandler;
};

const UNSTABLE_HANDLER_CACHE: AdminRouterHandlerCache = {};

export const apiKeysRouter = router({
  listPaginated: authedAdminProcedure.input(ZListMembersSchema).query(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.listPaginated) {
      UNSTABLE_HANDLER_CACHE.listPaginated = await import("./listPaginated.handler").then(
        (mod) => mod.listPaginatedHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.listPaginated) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.listPaginated({
      ctx,
      input,
    });
  }),
});
