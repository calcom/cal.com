import sessionMiddleware from "../../../middlewares/sessionMiddleware";
import publicProcedure from "../../../procedures/publicProcedure";
import { importHandler } from "../../../trpc";
import { ZsessionInputSchema } from "../session.schema";

const NAMESPACE = "publicViewer";

const namespaced = (s: string) => `${NAMESPACE}.${s}`;

export const session = publicProcedure
  .input(ZsessionInputSchema)
  .use(sessionMiddleware)
  .query(async (opts) => {
    const handler = await importHandler(namespaced("session"), () => import("../session.handler"));
    return handler(opts);
  });
