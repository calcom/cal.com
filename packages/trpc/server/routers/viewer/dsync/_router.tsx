import authedOrgAdminProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZCreateInputSchema } from "./create.schema";
import { ZDeleteInputSchema } from "./delete.schema";
import { ZGetInputSchema } from "./get.schema";
import { teamGroupMappingRouter } from "./teamGroupMapping/_router";

export const dsyncRouter = router({
  // Create directory sync connection
  create: authedOrgAdminProcedure.input(ZCreateInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./create.handler");
    return handler(opts);
  }),
  // Get directory sync connection
  get: authedOrgAdminProcedure.input(ZGetInputSchema).query(async (opts) => {
    const { default: handler } = await import("./get.handler");
    return handler(opts);
  }),
  // Delete directory sync connection
  delete: authedOrgAdminProcedure.input(ZDeleteInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./delete.handler");
    return handler(opts);
  }),

  teamGroupMapping: teamGroupMappingRouter,
});
