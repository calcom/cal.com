import { getUserSession } from "../../../middlewares/sessionMiddleware";
import publicProcedure from "../../../procedures/publicProcedure";
import { ZEventInputSchema } from "../event.schema";

const NAMESPACE = "publicViewer";
const namespaced = (s: string) => `${NAMESPACE}.${s}`;

export const event = publicProcedure.input(ZEventInputSchema).query(async (opts) => {
  const { user } = await getUserSession(opts.ctx);
  const { default: handler } = await import("../event.handler");
  return handler({ input: opts.input, userId: user?.id });
});
