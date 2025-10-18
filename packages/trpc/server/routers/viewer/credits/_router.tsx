import authedProcedure from "@calcom/trpc/server/procedures/authedProcedure";

import { router } from "../../../trpc";
import { ZBuyCreditsSchema } from "./buyCredits.schema";
import { ZDownloadExpenseLogSchema } from "./downloadExpenseLog.schema";
import { ZGetAllCreditsSchema } from "./getAllCredits.schema";
import { ZHasAvailableCreditsSchema } from "./hasAvailableCredits.schema";

type CreditsCache = {
  getAllCredits?: typeof import("./getAllCredits.handler").getAllCreditsHandler;
  buyCredits?: typeof import("./buyCredits.handler").buyCreditsHandler;
  downloadExpenseLog?: typeof import("./downloadExpenseLog.handler").downloadExpenseLogHandler;
  hasAvailableCredits?: typeof import("./hasAvailableCredits.handler").hasAvailableCreditsHandler;
};

const UNSTABLE_HANDLER_CACHE: CreditsCache = {};

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
  hasAvailableCredits: authedProcedure.input(ZHasAvailableCreditsSchema).query(async ({ input, ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.hasAvailableCredits) {
      UNSTABLE_HANDLER_CACHE.hasAvailableCredits = await import("./hasAvailableCredits.handler").then(
        (mod) => mod.hasAvailableCreditsHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.hasAvailableCredits) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.hasAvailableCredits({
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
  downloadExpenseLog: authedProcedure.input(ZDownloadExpenseLogSchema).query(async ({ input, ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.downloadExpenseLog) {
      UNSTABLE_HANDLER_CACHE.downloadExpenseLog = await import("./downloadExpenseLog.handler").then(
        (mod) => mod.downloadExpenseLogHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.downloadExpenseLog) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.downloadExpenseLog({
      ctx,
      input,
    });
  }),
});
