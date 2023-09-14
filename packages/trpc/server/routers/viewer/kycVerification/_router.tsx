import { authedAdminProcedure } from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZVerifyInputSchema } from "./verify.schema";

type KYCVerificationRouterHandlerCache = {
  isVerified?: typeof import("./isVerified.handler").isVerifiedHandler;
  verify?: typeof import("./verify.handler").verifyHandler;
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
  verify: authedAdminProcedure.input(ZVerifyInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.verify) {
      UNSTABLE_HANDLER_CACHE.verify = await import("./verify.handler").then((mod) => mod.verifyHandler);
    }
    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.verify) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.verify({
      ctx,
      input,
    });
  }),
});
