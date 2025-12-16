import { authedAdminProcedure } from "@calcom/trpc/server/procedures/authedProcedure";
import { router } from "@calcom/trpc/server/trpc";

import { ZCreatePolicyVersionSchema, ZListPolicyVersionsSchema } from "./schemas";

export const adminPolicyRouter = router({
  create: authedAdminProcedure.input(ZCreatePolicyVersionSchema).mutation(async (opts) => {
    const { default: handler } = await import("./create.handler");
    return handler(opts);
  }),
  list: authedAdminProcedure.input(ZListPolicyVersionsSchema).query(async (opts) => {
    const { default: handler } = await import("./list.handler");
    return handler(opts);
  }),
});
