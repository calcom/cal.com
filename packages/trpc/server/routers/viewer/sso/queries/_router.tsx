import authedProcedure from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { ZGetInputSchema } from "./get.schema";

type SSOQueriesRouterHandlerCache = {
  get?: typeof import("./get.handler").getHandler;
};

const UNSTABLE_HANDLER_CACHE: SSOQueriesRouterHandlerCache = {};

export const ssoQueriesRouter = router({
  get: authedProcedure.input(ZGetInputSchema).query(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.get) {
      UNSTABLE_HANDLER_CACHE.get = await import("./get.handler").then((mod) => mod.getHandler);
    }

    if (!UNSTABLE_HANDLER_CACHE.get) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.get({
      ctx,
      input,
    });
  }),
});
