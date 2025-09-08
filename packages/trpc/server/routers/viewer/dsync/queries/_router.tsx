import authedOrgAdminProcedure from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { ZGetInputSchema } from "./get.schema";

export const dsyncRouter = router({
  // Get directory sync connection
  get: authedOrgAdminProcedure.input(ZGetInputSchema).query(async (opts) => {
    const { default: handler } = await import("./get.handler");
    return handler(opts);
  }),
});
