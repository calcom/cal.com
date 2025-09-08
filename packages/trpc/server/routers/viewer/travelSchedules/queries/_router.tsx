import authedProcedure from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";

export const travelSchedulesQueriesRouter = router({
  get: authedProcedure.query(async ({ ctx }) => {
    const { getTravelSchedulesHandler } = await import("./get.handler");
    return getTravelSchedulesHandler({ ctx });
  }),
});
