import { getSession } from "../../../middlewares/sessionMiddleware";
import publicProcedure from "../../../procedures/publicProcedure";
import { ZEventInputSchema } from "../event.schema";

export const event = publicProcedure.input(ZEventInputSchema).query(async (opts) => {
  const session = await getSession(opts.ctx);
  const userId = session?.user?.id;
  const { default: handler } = await import("../event.handler");
  return handler({ input: opts.input, userId });
});
