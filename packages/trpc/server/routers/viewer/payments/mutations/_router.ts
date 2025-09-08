import authedProcedure from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { ZChargerCardInputSchema } from "./chargeCard.schema";

export const paymentsRouter = router({
  chargeCard: authedProcedure.input(ZChargerCardInputSchema).mutation(async ({ ctx, input }) => {
    const { chargeCardHandler } = await import("./chargeCard.handler");

    return chargeCardHandler({
      ctx,
      input,
    });
  }),
});
