import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZChargerCardInputSchema } from "./chargeCard.schema";
import { ZCompletePaymentInputSchema } from "./completePayment.schema";
import { ZSendPaymentLinkInputSchema } from "./sendPaymentLink.schema";

interface PaymentsRouterHandlerCache {
  chargeCard?: typeof import("./chargeCard.handler").chargeCardHandler;
  completePayment?: typeof import("./completePayment.handler").completePaymentHandler;
  sendPaymentLink?: typeof import("./sendPaymentLink.handler").sendPaymentLinkHandler;
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
  completePayment: authedProcedure.input(ZCompletePaymentInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.completePayment) {
      UNSTABLE_HANDLER_CACHE.completePayment = await import("./completePayment.handler").then(
        (mod) => mod.completePaymentHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.completePayment) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.completePayment({
      ctx,
      input,
    });
  }),
  sendPaymentLink: authedProcedure.input(ZSendPaymentLinkInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.sendPaymentLink) {
      UNSTABLE_HANDLER_CACHE.sendPaymentLink = await import("./sendPaymentLink.handler").then(
        (mod) => mod.sendPaymentLinkHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.sendPaymentLink) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.sendPaymentLink({
      ctx,
      input,
    });
  }),
});
