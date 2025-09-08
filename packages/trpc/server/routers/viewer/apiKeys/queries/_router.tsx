import authedProcedure from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { ZFindKeyOfTypeInputSchema } from "./findKeyOfType.schema";

export const apiKeysQueriesRouter = router({
  list: authedProcedure.query(async ({ ctx }) => {
    const { listHandler } = await import("./list.handler");

    return listHandler({
      ctx,
    });
  }),

  findKeyOfType: authedProcedure.input(ZFindKeyOfTypeInputSchema).query(async ({ ctx, input }) => {
    const { findKeyOfTypeHandler } = await import("./findKeyOfType.handler");

    return findKeyOfTypeHandler({
      ctx,
      input,
    });
  }),
});
