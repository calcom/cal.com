import authedProcedure from "../../../../procedures/authedProcedure";

export const platformMe = authedProcedure.query(async ({ ctx }) => {
  const handler = (await import("../platformMe.handler")).platformMeHandler;

  return handler({ ctx });
});
