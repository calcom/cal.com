import { authedAdminProcedure } from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZAdminDeleteTeamSchema } from "../teams/adminDelete.schema";
import { ZAdminGetTeamSchema } from "../teams/adminGet.schema";
import { ZAdminGetAllTeamsInputSchema } from "../teams/adminGetAll.schema";
import { ZAdminGetTeamBillingSchema } from "../teams/adminGetBilling.schema";
import { ZAdminUpdateTeamSchema } from "../teams/adminUpdate.schema";

export const adminTeamsRouter = router({
  getAll: authedAdminProcedure.input(ZAdminGetAllTeamsInputSchema).query(async (opts) => {
    const { default: handler } = await import("../teams/adminGetAll.handler");
    return handler(opts);
  }),
  get: authedAdminProcedure.input(ZAdminGetTeamSchema).query(async (opts) => {
    const { default: handler } = await import("../teams/adminGet.handler");
    return handler(opts);
  }),
  getBilling: authedAdminProcedure.input(ZAdminGetTeamBillingSchema).query(async (opts) => {
    const { default: handler } = await import("../teams/adminGetBilling.handler");
    return handler(opts);
  }),
  update: authedAdminProcedure.input(ZAdminUpdateTeamSchema).mutation(async (opts) => {
    const { default: handler } = await import("../teams/adminUpdate.handler");
    return handler(opts);
  }),
  delete: authedAdminProcedure.input(ZAdminDeleteTeamSchema).mutation(async (opts) => {
    const { default: handler } = await import("../teams/adminDelete.handler");
    return handler(opts);
  }),
});
