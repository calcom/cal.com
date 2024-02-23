import authedProcedure from "../../../procedures/authedProcedure";

export const teamsAndUserProfilesQuery = authedProcedure.query(async ({ ctx }) => {
  const handler = (await import("../teamsAndUserProfilesQuery.handler")).teamsAndUserProfilesQuery;

  return handler({ ctx });
});
