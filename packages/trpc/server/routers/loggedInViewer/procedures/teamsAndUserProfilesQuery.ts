import authedProcedure from "../../../procedures/authedProcedure";
import { ZteamsAndUserProfilesQuerySchema } from "../teamsAndUserProfilesQuery.schema";

export const teamsAndUserProfilesQuery = authedProcedure
  .input(ZteamsAndUserProfilesQuerySchema)
  .query(async ({ ctx, input }) => {
    const handler = (await import("../teamsAndUserProfilesQuery.handler")).teamsAndUserProfilesQuery;

    return handler({ ctx, input });
  });
