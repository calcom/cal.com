import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";

export const travelSchedulesRouter = router({
  get: authedProcedure.query(async ({ ctx }) => {
    const handler = (await import("./getTravelSchedules.handler")).getTravelSchedulesHandler;
    return handler({ ctx });
  }),
});
