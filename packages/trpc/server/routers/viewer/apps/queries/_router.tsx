import authedProcedure, { authedAdminProcedure } from "../../../../procedures/authedProcedure";
import { router } from "../../../../trpc";
import { ZAppByIdInputSchema } from "./appById.schema";
import { ZAppCredentialsByTypeInputSchema } from "./appCredentialsByType.schema";
import { checkGlobalKeysSchema } from "./checkGlobalKeys.schema";
import { ZIntegrationsInputSchema } from "./integrations.schema";
import { ZListLocalInputSchema } from "./listLocal.schema";
import { ZLocationOptionsInputSchema } from "./locationOptions.schema";
import { ZQueryForDependenciesInputSchema } from "./queryForDependencies.schema";

export const appsQueriesRouter = router({
  appById: authedProcedure.input(ZAppByIdInputSchema).query(async ({ ctx, input }) => {
    const { appByIdHandler } = await import("./appById.handler");
    return appByIdHandler({ ctx, input });
  }),

  appCredentialsByType: authedProcedure
    .input(ZAppCredentialsByTypeInputSchema)
    .query(async ({ ctx, input }) => {
      const { appCredentialsByTypeHandler } = await import("./appCredentialsByType.handler");
      return appCredentialsByTypeHandler({ ctx, input });
    }),

  getUsersDefaultConferencingApp: authedProcedure.query(async ({ ctx }) => {
    const { getUsersDefaultConferencingAppHandler } = await import(
      "./getUsersDefaultConferencingApp.handler"
    );
    return getUsersDefaultConferencingAppHandler({ ctx });
  }),

  integrations: authedProcedure.input(ZIntegrationsInputSchema).query(async ({ ctx, input }) => {
    const { integrationsHandler } = await import("./integrations.handler");
    return integrationsHandler({ ctx, input });
  }),

  listLocal: authedAdminProcedure.input(ZListLocalInputSchema).query(async ({ ctx, input }) => {
    const { listLocalHandler } = await import("./listLocal.handler");
    return listLocalHandler({
      ctx,
      input,
    });
  }),

  locationOptions: authedProcedure.input(ZLocationOptionsInputSchema).query(async ({ ctx, input }) => {
    const { locationOptionsHandler } = await import("./locationOptions.handler");
    return locationOptionsHandler({ ctx, input });
  }),

  checkForGCal: authedProcedure.query(async ({ ctx }) => {
    const { checkForGCalHandler } = await import("./checkForGCal.handler");
    return checkForGCalHandler({
      ctx,
    });
  }),

  queryForDependencies: authedProcedure
    .input(ZQueryForDependenciesInputSchema)
    .query(async ({ ctx, input }) => {
      const { queryForDependenciesHandler } = await import("./queryForDependencies.handler");
      return queryForDependenciesHandler({
        ctx,
        input,
      });
    }),

  checkGlobalKeys: authedProcedure.input(checkGlobalKeysSchema).query(async ({ ctx, input }) => {
    const { checkForGlobalKeysHandler } = await import("./checkGlobalKeys.handler");
    return checkForGlobalKeysHandler({
      ctx,
      input,
    });
  }),
});
