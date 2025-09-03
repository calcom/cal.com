import authedProcedure from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { ZGetTeamAndEventTypeOptionsSchema } from "../getTeamAndEventTypeOptions.schema";

export const getTeamAndEventTypeOptionsRouter = router({
  get: authedProcedure.input(ZGetTeamAndEventTypeOptionsSchema).query(async ({ ctx, input }) => {
    const { getTeamAndEventTypeOptions } = await import("../getTeamAndEventTypeOptions.handler");

    return getTeamAndEventTypeOptions({
      ctx,
      input,
    });
  }),
});
