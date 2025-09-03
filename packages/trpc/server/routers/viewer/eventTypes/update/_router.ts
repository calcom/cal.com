import { router } from "../../../../trpc";
import { ZUpdateInputSchema } from "../update.schema";
import { eventOwnerProcedure } from "../util";

export const updateRouter = router({
  do: eventOwnerProcedure.input(ZUpdateInputSchema).mutation(async ({ ctx, input }) => {
    const { updateHandler } = await import("../update.handler");

    return updateHandler({
      ctx,
      input,
    });
  }),
});
