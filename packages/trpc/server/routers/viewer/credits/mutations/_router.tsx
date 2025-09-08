import authedProcedure from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { ZBuyCreditsSchema } from "./buyCredits.schema";

export const creditsRouter = router({
  buyCredits: authedProcedure.input(ZBuyCreditsSchema).mutation(async ({ input, ctx }) => {
    const { buyCreditsHandler } = await import("./buyCredits.handler");

    return buyCreditsHandler({
      ctx,
      input,
    });
  }),
});
