import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZAddClientInputSchema } from "./addClient.schema";
import { ZGetClientInputSchema } from "./getClient.schema";

type OAuthRouterHandlerCache = {
  getClient?: typeof import("./getClient.handler").getClientHandler;
  addClient?: typeof import("./addClient.handler").addClientHandler;
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

  //needs to be and adminauthed protected route
  addClient: authedProcedure.input(ZAddClientInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.addClient) {
      UNSTABLE_HANDLER_CACHE.addClient = await import("./addClient.handler").then(
        (mod) => mod.addClientHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.addClient) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.addClient({
      ctx,
      input,
    });
  }),
});
