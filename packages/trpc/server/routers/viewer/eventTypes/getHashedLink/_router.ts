import authedProcedure from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { ZGetHashedLinkInputSchema } from "../getHashedLink.schema";

export const getHashedLinkRouter = router({
  get: authedProcedure.input(ZGetHashedLinkInputSchema).query(async ({ ctx, input }) => {
    const { getHashedLinkHandler } = await import("../getHashedLink.handler");

    return getHashedLinkHandler({
      ctx,
      input,
    });
  }),
});
