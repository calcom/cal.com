import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZChargerCardInputSchema } from "./chargeCard.schema";

interface PaymentsRouterHandlerCache {
  chargeCard?: typeof import("./chargeCard.handler").chargeCardHandler;
}

const UNSTABLE_HANDLER_CACHE: PaymentsRouterHandlerCache = {};

export const paymentsRouter = router({
  chargeCard: authedProcedure.input(ZChargerCardInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.chargeCard) {
      UNSTABLE_HANDLER_CACHE.chargeCard = await import("./chargeCard.handler").then(
        (mod) => mod.chargeCardHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.chargeCard) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.chargeCard({
      ctx,
      input,
    });
  }),
});
