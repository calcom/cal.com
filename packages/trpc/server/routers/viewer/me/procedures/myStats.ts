import authedProcedure from "../../../../procedures/authedProcedure";

export const myStats = authedProcedure.query(async ({ ctx, input }) => {
  const handler = (await import("../myStats.handler")).myStatsHandler;

  return handler({ ctx });
});
