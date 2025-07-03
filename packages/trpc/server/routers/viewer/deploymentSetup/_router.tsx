import { authedAdminProcedure } from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZUpdateInputSchema } from "./update.schema";

type DeploymentSetupRouterHandlerCache = {
  update?: typeof import("./update.handler").updateHandler;
};

export const deploymentSetupRouter = router({
  update: authedAdminProcedure.input(ZUpdateInputSchema).mutation(async ({ input, ctx }) => {
    const { updateHandler } = await import("./update.handler");

    return updateHandler({
      ctx,
      input,
    });
  }),
});
