import { authedAdminProcedure } from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { ZCreateAbuseRuleInputSchema } from "./create.schema";
import { ZBulkDeleteAbuseRulesInputSchema, ZDeleteAbuseRuleInputSchema } from "./delete.schema";
import { ZGetAbuseRuleDetailsInputSchema } from "./getDetails.schema";
import { ZListAbuseRulesInputSchema } from "./list.schema";
import { ZUpdateAbuseRuleInputSchema } from "./update.schema";

export const abuseRulesRouter = router({
  list: authedAdminProcedure.input(ZListAbuseRulesInputSchema).query(async (opts) => {
    const { listAbuseRulesHandler: handler } = await import("./list.handler");
    return handler(opts);
  }),
  create: authedAdminProcedure.input(ZCreateAbuseRuleInputSchema).mutation(async (opts) => {
    const { createAbuseRuleHandler: handler } = await import("./create.handler");
    return handler(opts);
  }),
  update: authedAdminProcedure.input(ZUpdateAbuseRuleInputSchema).mutation(async (opts) => {
    const { updateAbuseRuleHandler: handler } = await import("./update.handler");
    return handler(opts);
  }),
  delete: authedAdminProcedure.input(ZDeleteAbuseRuleInputSchema).mutation(async (opts) => {
    const { deleteAbuseRuleHandler: handler } = await import("./delete.handler");
    return handler(opts);
  }),
  bulkDelete: authedAdminProcedure.input(ZBulkDeleteAbuseRulesInputSchema).mutation(async (opts) => {
    const { bulkDeleteAbuseRulesHandler: handler } = await import("./delete.handler");
    return handler(opts);
  }),
  getDetails: authedAdminProcedure.input(ZGetAbuseRuleDetailsInputSchema).query(async (opts) => {
    const { getAbuseRuleDetailsHandler: handler } = await import("./getDetails.handler");
    return handler(opts);
  }),
});
