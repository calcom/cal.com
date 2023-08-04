import { authedAdminProcedure } from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";

type KYCVerificationRouterHandlerCache = {
  isVerified?: typeof import("./isVerified.handler").isVerifiedHandler;
};

const UNSTABLE_HANDLER_CACHE: KYCVerificationRouterHandlerCache = {};

export const kycVerificationRouter = router({
  isVerified: authedAdminProcedure.query(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.isVerified) {
      UNSTABLE_HANDLER_CACHE.isVerified = await import("./isVerified.handler").then(
        (mod) => mod.isVerifiedHandler
      );
    }
    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.isVerified) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.isVerified({
      ctx,
    });
  }),
});
