import { router } from "../../../../trpc";
import { ZDeleteInputSchema } from "../delete.schema";
import { eventOwnerProcedure } from "../util";

export const deleteRouter = router({
  do: eventOwnerProcedure.input(ZDeleteInputSchema).mutation(async ({ ctx, input }) => {
    const { deleteHandler } = await import("../delete.handler");

    return deleteHandler({
      ctx,
      input,
    });
  }),
});
