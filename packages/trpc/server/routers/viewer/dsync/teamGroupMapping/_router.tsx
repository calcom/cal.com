import authedOrgAdminProcedure from "@calcom/trpc/server/procedures/authedProcedure";
import { router } from "@calcom/trpc/server/trpc";
import { ZCreateInputSchema } from "./create.schema";
import { ZDeleteInputSchema } from "./delete.schema";

export const teamGroupMappingRouter = router({
  get: authedOrgAdminProcedure.query(async (opts) => {
    const { default: handler } = await import("./get.handler");
    return handler(opts);
  }),
  create: authedOrgAdminProcedure.input(ZCreateInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./create.handler");
    return handler(opts);
  }),
  delete: authedOrgAdminProcedure.input(ZDeleteInputSchema).mutation(async (opts) => {
    const { default: handler } = await import("./delete.handler");
    return handler(opts);
  }),
});
