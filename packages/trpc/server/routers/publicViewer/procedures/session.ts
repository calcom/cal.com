import sessionMiddleware from "../../../middlewares/sessionMiddleware";
import publicProcedure from "../../../procedures/publicProcedure";
import { importHandler } from "../../../trpc";

const NAMESPACE = "publicViewer";

const namespaced = (s: string) => `${NAMESPACE}.${s}`;

export const session = publicProcedure.use(sessionMiddleware).query(async (opts) => {
  const handler = await importHandler(namespaced("session"), () => import("../session.handler"));
  return handler(opts);
});
