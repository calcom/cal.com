import publicProcedure from "../../../procedures/publicProcedure";
import { router } from "../../../trpc";
import { ZGetDigestInputSchema } from "./getDigest.schema";

type SlotsRouterHandlerCache = {
  getDigest?: typeof import("./getDigest.handler").getDigestHandler;
};

const UNSTABLE_HANDLER_CACHE: SlotsRouterHandlerCache = {};

export const digestRouter = router({
  getSchedule: publicProcedure.input(ZGetDigestInputSchema).query(async ({ input, ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.getDigest) {
      UNSTABLE_HANDLER_CACHE.getDigest = await import("./getDigest.handler").then(
        (mod) => mod.getDigestHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.getDigest) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.getDigest({
      ctx,
      input,
    });
  }),
});
