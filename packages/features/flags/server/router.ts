import { z } from "zod";

import { publicProcedure, router } from "@calcom/trpc/server/trpc";

export const featureFlagRouter = router({
  // Fetch contract `name` and `symbol` or error
  contract: publicProcedure
    .input(
      z.object({
        name: z.string(),
      })
    )
    .query(async ({ input }) => {
      return { message: "hello" };
    }),
});
