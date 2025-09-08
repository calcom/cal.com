import authedProcedure from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { ZDeleteInputSchema } from "./delete.schema";
import { ZUpdateInputSchema } from "./update.schema";
import { ZUpdateOIDCInputSchema } from "./updateOIDC.schema";

type SSORouterHandlerCache = {
  update?: typeof import("./update.handler").updateHandler;
  delete?: typeof import("./delete.handler").deleteHandler;
  updateOIDC?: typeof import("./updateOIDC.handler").updateOIDCHandler;
};

const UNSTABLE_HANDLER_CACHE: SSORouterHandlerCache = {};

export const ssoRouter = router({
  update: authedProcedure.input(ZUpdateInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.update) {
      UNSTABLE_HANDLER_CACHE.update = await import("./update.handler").then((mod) => mod.updateHandler);
    }

    if (!UNSTABLE_HANDLER_CACHE.update) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.update({
      ctx,
      input,
    });
  }),

  delete: authedProcedure.input(ZDeleteInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.delete) {
      UNSTABLE_HANDLER_CACHE.delete = await import("./delete.handler").then((mod) => mod.deleteHandler);
    }

    if (!UNSTABLE_HANDLER_CACHE.delete) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.delete({
      ctx,
      input,
    });
  }),

  updateOIDC: authedProcedure.input(ZUpdateOIDCInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.updateOIDC) {
      UNSTABLE_HANDLER_CACHE.updateOIDC = await import("./updateOIDC.handler").then(
        (mod) => mod.updateOIDCHandler
      );
    }

    if (!UNSTABLE_HANDLER_CACHE.updateOIDC) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.updateOIDC({
      ctx,
      input,
    });
  }),
});
