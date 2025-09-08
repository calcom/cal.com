import { z } from "zod";

import authedProcedure from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { eventOwnerProcedure } from "../../../util";
import { ZCreateInputSchema } from "./create.schema";
import { ZDeleteInputSchema } from "./delete.schema";
import { ZDuplicateInputSchema } from "./duplicate.schema";
import { ZUpdateInputSchema } from "./update.schema";

export const eventTypesMutationsRouter = router({
  delete: eventOwnerProcedure.input(ZDeleteInputSchema).mutation(async ({ ctx, input }) => {
    const { deleteHandler } = await import("./delete.handler");

    return deleteHandler({
      ctx,
      input,
    });
  }),

  bulkUpdateToDefaultLocation: authedProcedure
    .input(
      z.object({
        eventTypeIds: z.array(z.number()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { bulkUpdateToDefaultLocationHandler } = await import("./bulkUpdateToDefaultLocation.handler");

      return bulkUpdateToDefaultLocationHandler({
        ctx,
        input,
      });
    }),

  create: authedProcedure.input(ZCreateInputSchema).mutation(async ({ ctx, input }) => {
    const { createHandler } = await import("./create.handler");

    return createHandler({
      ctx,
      input,
    });
  }),
  duplicate: eventOwnerProcedure.input(ZDuplicateInputSchema).mutation(async ({ ctx, input }) => {
    const { duplicateHandler } = await import("./duplicate.handler");

    return duplicateHandler({
      ctx,
      input,
    });
  }),
  update: eventOwnerProcedure.input(ZUpdateInputSchema).mutation(async ({ ctx, input }) => {
    const { updateHandler } = await import("./update.handler");

    return updateHandler({
      ctx,
      input,
    });
  }),
});
