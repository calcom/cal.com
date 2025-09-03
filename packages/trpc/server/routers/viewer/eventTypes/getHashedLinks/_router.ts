import authedProcedure from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { ZGetHashedLinksInputSchema } from "../getHashedLinks.schema";

export const getHashedLinksRouter = router({
  get: authedProcedure.input(ZGetHashedLinksInputSchema).query(async ({ ctx, input }) => {
    const { getHashedLinksHandler } = await import("../getHashedLinks.handler");

    return getHashedLinksHandler({
      ctx,
      input,
    });
  }),
});
