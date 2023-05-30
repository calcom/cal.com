import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZCreateInputSchema } from "./create.schema";
import { ZUpdateInputSchema } from "./update.schema";
import { ZVerifyCodeInputSchema } from "./verifyCode.schema";

type OrganizationsRouterHandlerCache = {
  create?: typeof import("./create.handler").createHandler;
  update?: typeof import("./update.handler").updateHandler;
  verifyCode?: typeof import("./verifyCode.handler").verifyCodeHandler;
};

const UNSTABLE_HANDLER_CACHE: OrganizationsRouterHandlerCache = {};

export const viewerOrganizationsRouter = router({
  create: authedProcedure.input(ZCreateInputSchema).mutation(async ({ ctx, input }) => {
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
  verifyCode: authedProcedure.input(ZVerifyCodeInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.verifyCode) {
      UNSTABLE_HANDLER_CACHE.verifyCode = await import("./verifyCode.handler").then(
        (mod) => mod.verifyCodeHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.verifyCode) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.verifyCode({
      ctx,
      input,
    });
  }),
});
