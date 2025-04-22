import sessionMiddleware from "../../../middlewares/sessionMiddleware";
import publicProcedure from "../../../procedures/publicProcedure";

const NAMESPACE = "publicViewer";

const namespaced = (s: string) => `${NAMESPACE}.${s}`;

export const session = publicProcedure.use(sessionMiddleware).query(async (opts) => {
  const { default: handler } = await import("../session.handler");
  return handler(opts);
});
