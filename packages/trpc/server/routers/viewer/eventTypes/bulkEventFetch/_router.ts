import authedProcedure from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";

export const bulkEventFetchRouter = router({
  get: authedProcedure.query(async ({ ctx }) => {
    const { bulkEventFetchHandler } = await import("../bulkEventFetch.handler");

    return bulkEventFetchHandler({
      ctx,
    });
  }),
});
