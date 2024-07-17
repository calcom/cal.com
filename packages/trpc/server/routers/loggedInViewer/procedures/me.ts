import authedProcedure from "../../../procedures/authedProcedure";
import { ZMeInputSchema } from "../me.schema";

export const me = authedProcedure.input(ZMeInputSchema).query(async ({ ctx, input }) => {
  const handler = (await import("../me.handler")).meHandler;

  return handler({ ctx, input });
});
