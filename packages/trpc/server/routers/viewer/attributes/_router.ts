import authedProcedure from "../../../procedures/authedProcedure";
import { router, importHandler } from "../../../trpc";

const NAMESPACE = "attributes";

const namespaced = (s: string) => `${NAMESPACE}.${s}`;

export const attributesRouter = router({
  get: authedProcedure.query(async (opts) => {
    const handler = await importHandler(namespaced("getAttributes"), () => import("./getAttributes.handler"));
    return handler(opts);
  }),
});
