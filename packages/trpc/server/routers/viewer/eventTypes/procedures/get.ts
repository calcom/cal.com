import { ZGetInputSchema } from "../get.schema";
import { eventOwnerProcedure } from "../util";

export const get = eventOwnerProcedure.input(ZGetInputSchema).query(async ({ ctx, input }) => {
  const handler = (await import("../get.handler")).getHandler;

  return handler({
    ctx,
    input,
  });
});
