import { authedAdminProcedure } from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZUpdateInputSchema } from "./update.schema";

type DeploymentSetupRouterHandlerCache = {
  update?: typeof import("./update.handler").updateHandler;
};

const UNSTABLE_HANDLER_CACHE: DeploymentSetupRouterHandlerCache = {};

export const deploymentSetupRouter = router({
  update: authedAdminProcedure.input(ZUpdateInputSchema).mutation(async ({ input, ctx }) => {
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
});
