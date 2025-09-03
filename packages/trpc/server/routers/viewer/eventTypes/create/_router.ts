import authedProcedure from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { ZCreateInputSchema } from "../create.schema";

export const createRouter = router({
  do: authedProcedure.input(ZCreateInputSchema).mutation(async ({ ctx, input }) => {
    const { createHandler } = await import("../create.handler");

    return createHandler({
      ctx,
      input,
    });
  }),
});
