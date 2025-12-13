import authedProcedure from "@calcom/trpc/server/procedures/authedProcedure";
import { router } from "@calcom/trpc/server/trpc";

import { ZAcceptPolicySchema } from "./schemas";

export const policyRouter = router({
  accept: authedProcedure.input(ZAcceptPolicySchema).mutation(async (opts) => {
    const { default: handler } = await import("./accept.handler");
    return handler(opts);
  }),
});
