import { router, authedProcedure } from "../../../trpc";
import { ZDeleteInputSchema } from "./delete.schema";
import { ZGetInputSchema } from "./get.schema";
import { ZUpdateInputSchema } from "./update.schema";
import { ZUpdateOIDCInputSchema } from "./updateOIDC.schema";

type SSORouterHandlerCache = {
  get?: typeof import("./get.handler").getHandler;
  update?: typeof import("./update.handler").updateHandler;
  delete?: typeof import("./delete.handler").deleteHandler;
  updateOIDC?: typeof import("./updateOIDC.handler").updateOIDCHandler;
};

const UNSTABLE_HANDLER_CACHE: SSORouterHandlerCache = {};

export const ssoRouter = router({
  // Retrieve SSO Connection
  get: authedProcedure.input(ZGetInputSchema).query(async ({ ctx, input }) => {
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

  // Update the SAML Connection
  update: authedProcedure.input(ZUpdateInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.update) {
      UNSTABLE_HANDLER_CACHE.update = await import("./update.handler").then((mod) => mod.updateHandler);
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.update) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.update({
      ctx,
      input,
    });
  }),

  // Delete the SAML Connection
  delete: authedProcedure.input(ZDeleteInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.delete) {
      UNSTABLE_HANDLER_CACHE.delete = await import("./delete.handler").then((mod) => mod.deleteHandler);
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.delete) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.delete({
      ctx,
      input,
    });
  }),

  // Update the OIDC Connection
  updateOIDC: authedProcedure.input(ZUpdateOIDCInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.updateOIDC) {
      UNSTABLE_HANDLER_CACHE.updateOIDC = await import("./updateOIDC.handler").then(
        (mod) => mod.updateOIDCHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.updateOIDC) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.updateOIDC({
      ctx,
      input,
    });
  }),
});
