import { authedAdminProcedure } from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { ZTeamAssignFeatureSchema } from "./assignFeature.schema";
import { ZTeamDeleteSchema } from "./delete.schema";
import { ZGetTeamFeaturesSchema } from "./getFeatures.schema";
import { ZTeamsListPaginatedSchema } from "./listPaginated.schema";
import { ZTeamRemoveFeatureSchema } from "./removeFeature.schema";
import { ZTeamUpdateSchema } from "./update.schema";
import { ZUpdateOrganizationSettingsSchema } from "./updateOrganizationSettings.schema";

export const teamsRouter = router({
  listPaginated: authedAdminProcedure.input(ZTeamsListPaginatedSchema).query(async (opts) => {
    const { default: handler } = await import("./listPaginated.handler");
    return handler(opts);
  }),
  get: authedAdminProcedure.input(ZTeamDeleteSchema).query(async (opts) => {
    const { default: handler } = await import("./get.handler");
    return handler(opts);
  }),
  update: authedAdminProcedure.input(ZTeamUpdateSchema).mutation(async (opts) => {
    const { default: handler } = await import("./update.handler");
    return handler(opts);
  }),
  delete: authedAdminProcedure.input(ZTeamDeleteSchema).mutation(async (opts) => {
    const { default: handler } = await import("./delete.handler");
    return handler(opts);
  }),
  assignFeature: authedAdminProcedure.input(ZTeamAssignFeatureSchema).mutation(async (opts) => {
    const { default: handler } = await import("./assignFeature.handler");
    return handler(opts);
  }),
  removeFeature: authedAdminProcedure.input(ZTeamRemoveFeatureSchema).mutation(async (opts) => {
    const { default: handler } = await import("./removeFeature.handler");
    return handler(opts);
  }),
  updateOrganizationSettings: authedAdminProcedure
    .input(ZUpdateOrganizationSettingsSchema)
    .mutation(async (opts) => {
      const { default: handler } = await import("./updateOrganizationSettings.handler");
      return handler(opts);
    }),
  getFeatures: authedAdminProcedure.input(ZGetTeamFeaturesSchema).query(async (opts) => {
    const { default: handler } = await import("./getFeatures.handler");
    return handler(opts);
  }),
});
