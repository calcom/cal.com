import authedProcedure from "../../../procedures/authedProcedure";
import { importHandler, router } from "../../../trpc";

const NAMESPACE = "profiles";

const namespaced = (s: string) => `${NAMESPACE}.${s}`;

export const profilesRouter = router({
  listCurrent: authedProcedure.query(async (opts) => {
    const handler = await importHandler(namespaced("listCurrent"), () => import("./list.handler"));
    return handler(opts);
  }),
});
