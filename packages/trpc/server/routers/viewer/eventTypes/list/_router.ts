import authedProcedure from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";

export const listRouter = router({
  get: authedProcedure.query(async ({ ctx }) => {
    const { listHandler } = await import("../list.handler");

    return listHandler({
      ctx,
    });
  }),
});
