import authedOrgAdminProcedure from "@calcom/trpc/server/procedures/authedProcedure";
import { router, importHandler } from "@calcom/trpc/server/trpc";

import { ZCreateInputSchema } from "./create.schema";
import { ZDeleteInputSchema } from "./delete.schema";

const NAMESPACE = "teamGroupMapping";

const namespaced = (s: string) => `${NAMESPACE}.${s}`;

export const teamGroupMappingRouter = router({
  get: authedOrgAdminProcedure.query(async (opts) => {
    const handler = await importHandler(namespaced("get"), () => import("./get.handler"));
    return handler(opts);
  }),
  create: authedOrgAdminProcedure.input(ZCreateInputSchema).mutation(async (opts) => {
    const handler = await importHandler(namespaced("create"), () => import("./create.handler"));
    return handler(opts);
  }),
  delete: authedOrgAdminProcedure.input(ZDeleteInputSchema).mutation(async (opts) => {
    const handler = await importHandler(namespaced("delete"), () => import("./delete.handler"));
    return handler(opts);
  }),
});
