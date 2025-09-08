import { authedAdminProcedure } from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { ZUpdateInputSchema } from "./update.schema";

export const deploymentSetupMutationsRouter = router({
  update: authedAdminProcedure.input(ZUpdateInputSchema).mutation(async ({ input, ctx }) => {
    const { updateHandler } = await import("./update.handler");

    return updateHandler({
      ctx,
      input,
    });
  }),
});
