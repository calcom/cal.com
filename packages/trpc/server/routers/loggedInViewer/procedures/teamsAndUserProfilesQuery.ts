import authedProcedure from "../../../procedures/authedProcedure";
import { ZTeamsAndUserProfilesQueryInputSchema } from "../teamsAndUserProfilesQuery.schema";

export const teamsAndUserProfilesQuery = authedProcedure
  .input(ZTeamsAndUserProfilesQueryInputSchema)
  .query(async ({ ctx, input }) => {
    const handler = (await import("../teamsAndUserProfilesQuery.handler")).teamsAndUserProfilesQuery;

    return handler({ ctx, input });
  });
