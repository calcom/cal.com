import { z } from "zod";

import authedProcedure from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";

export const bulkUpdateToDefaultLocationRouter = router({
  do: authedProcedure
    .input(
      z.object({
        eventTypeIds: z.array(z.number()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { bulkUpdateToDefaultLocationHandler } = await import("../bulkUpdateToDefaultLocation.handler");

      return bulkUpdateToDefaultLocationHandler({
        ctx,
        input,
      });
    }),
});
