import authedProcedure from "../../../procedures/authedProcedure";

export const meStats = authedProcedure.query(async ({ ctx, input }) => {
  const handler = (await import("../meStats.handler")).meStatsHandler;

  return handler({ ctx });
});
