import { router } from "../../../../trpc";
import { ZDuplicateInputSchema } from "../duplicate.schema";
import { eventOwnerProcedure } from "../util";

export const duplicateRouter = router({
  do: eventOwnerProcedure.input(ZDuplicateInputSchema).mutation(async ({ ctx, input }) => {
    const { duplicateHandler } = await import("../duplicate.handler");

    return duplicateHandler({
      ctx,
      input,
    });
  }),
});
