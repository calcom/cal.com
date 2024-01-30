import authedProcedure from "../../../procedures/authedProcedure";

export const me = authedProcedure.query(async ({ ctx }) => {
  const handler = (await import("../me.handler")).meHandler;

  return handler({ ctx });
});
