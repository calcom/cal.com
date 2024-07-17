import authedOrgAdminProcedure from "../../../procedures/authedProcedure";
import { router, importHandler } from "../../../trpc";
import { ZCreateInputSchema } from "./create.schema";
import { ZDeleteInputSchema } from "./delete.schema";
import { ZGetInputSchema } from "./get.schema";
import { teamGroupMappingRouter } from "./teamGroupMapping/_router";

const NAMESPACE = "dsync";

const namespaced = (s: string) => `${NAMESPACE}.${s}`;

export const dsyncRouter = router({
  // Create directory sync connection
  create: authedOrgAdminProcedure.input(ZCreateInputSchema).mutation(async (opts) => {
    const handler = await importHandler(namespaced("create"), () => import("./create.handler"));
    return handler(opts);
  }),
  // Get directory sync connection
  get: authedOrgAdminProcedure.input(ZGetInputSchema).query(async (opts) => {
    const handler = await importHandler(namespaced("get"), () => import("./get.handler"));
    return handler(opts);
  }),
  // Delete directory sync connection
  delete: authedOrgAdminProcedure.input(ZDeleteInputSchema).mutation(async (opts) => {
    const handler = await importHandler(namespaced("delete"), () => import("./delete.handler"));
    return handler(opts);
  }),

  teamGroupMapping: teamGroupMappingRouter,
});
