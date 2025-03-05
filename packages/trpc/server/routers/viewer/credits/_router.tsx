import authedProcedure from "@calcom/trpc/server/procedures/authedProcedure";

import { router } from "../../../trpc";
import { ZGetAllCreditsSchema } from "./getAllCredits.schema";

type GetAllCreditsCache = {
  getAllCredits?: typeof import("./getAllCredits.handler").getAllCreditsHandler;
};

const UNSTABLE_HANDLER_CACHE: GetAllCreditsCache = {};

export const creditsRouter = router({
  getAllCredits: authedProcedure.input(ZGetAllCreditsSchema).query(async ({ input, ctx }) => {
    console.log("asdfasdf");
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
});
