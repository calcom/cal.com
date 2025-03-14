import authedProcedure from "@calcom/trpc/server/procedures/authedProcedure";

import { router } from "../../../trpc";
import { ZBuyCreditsSchema } from "./buyCredits.schema";
import { ZGetAllCreditsSchema } from "./getAllCredits.schema";
import { ZPayCreditsSchema } from "./payCredits.schema";

type GetAllCreditsCache = {
  getAllCredits?: typeof import("./getAllCredits.handler").getAllCreditsHandler;
  buyCredits?: typeof import("./buyCredits.handler").buyCreditsHandler;
  payCredits?: typeof import("./payCredits.handler").payCreditsHandler;
};

const UNSTABLE_HANDLER_CACHE: GetAllCreditsCache = {};

export const creditsRouter = router({
  getAllCredits: authedProcedure.input(ZGetAllCreditsSchema).query(async ({ input, ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.getAllCredits) {
      UNSTABLE_HANDLER_CACHE.getAllCredits = await import("./getAllCredits.handler").then(
        (mod) => mod.getAllCreditsHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.getAllCredits) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.getAllCredits({
      ctx,
      input,
    });
  }),
  buyCredits: authedProcedure.input(ZBuyCreditsSchema).mutation(async ({ input, ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.buyCredits) {
      UNSTABLE_HANDLER_CACHE.buyCredits = await import("./buyCredits.handler").then(
        (mod) => mod.buyCreditsHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.buyCredits) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.buyCredits({
      ctx,
      input,
    });
  }),
  payCredits: authedProcedure.input(ZPayCreditsSchema).mutation(async ({ input, ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.payCredits) {
      UNSTABLE_HANDLER_CACHE.payCredits = await import("./payCredits.handler").then(
        (mod) => mod.payCreditsHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.payCredits) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.payCredits({
      ctx,
      input,
    });
  }),
});
