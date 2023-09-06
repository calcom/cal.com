import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZGetClientInputSchema } from "./getClient.schema";

type OAuthRouterHandlerCache = {
  getClient?: typeof import("./getClient.handler").getClientHandler;
};

const UNSTABLE_HANDLER_CACHE: OAuthRouterHandlerCache = {};

export const oAuthRouter = router({
  getClient: authedProcedure.input(ZGetClientInputSchema).query(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.getClient) {
      UNSTABLE_HANDLER_CACHE.getClient = await import("./getClient.handler").then(
        (mod) => mod.getClientHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.getClient) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.getClient({
      ctx,
      input,
    });
  }),
});
