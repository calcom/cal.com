import authedProcedure from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";

export const listWithTeamRouter = router({
  get: authedProcedure.query(async ({ ctx }) => {
    const { listWithTeamHandler } = await import("../listWithTeam.handler");

    return listWithTeamHandler({
      ctx,
    });
  }),
});
