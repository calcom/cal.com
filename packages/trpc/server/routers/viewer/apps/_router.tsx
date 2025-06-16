import authedProcedure, { authedAdminProcedure } from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZAppByIdInputSchema } from "./appById.schema";
import { ZAppCredentialsByTypeInputSchema } from "./appCredentialsByType.schema";
import { checkGlobalKeysSchema } from "./checkGlobalKeys.schema";
import { ZIntegrationsInputSchema } from "./integrations.schema";
import { ZListLocalInputSchema } from "./listLocal.schema";
import { ZLocationOptionsInputSchema } from "./locationOptions.schema";
import { ZQueryForDependenciesInputSchema } from "./queryForDependencies.schema";
import { ZSaveKeysInputSchema } from "./saveKeys.schema";
import { ZSetDefaultConferencingAppSchema } from "./setDefaultConferencingApp.schema";
import { ZToggleInputSchema } from "./toggle.schema";
import { ZUpdateAppCredentialsInputSchema } from "./updateAppCredentials.schema";
import { ZUpdateUserDefaultConferencingAppInputSchema } from "./updateUserDefaultConferencingApp.schema";

type AppsRouterHandlerCache = {
  appById?: typeof import("./appById.handler").appByIdHandler;
  appCredentialsByType?: typeof import("./appCredentialsByType.handler").appCredentialsByTypeHandler;
  getUsersDefaultConferencingApp?: typeof import("./getUsersDefaultConferencingApp.handler").getUsersDefaultConferencingAppHandler;
  integrations?: typeof import("./integrations.handler").integrationsHandler;
  listLocal?: typeof import("./listLocal.handler").listLocalHandler;
  locationOptions?: typeof import("./locationOptions.handler").locationOptionsHandler;
  toggle?: typeof import("./toggle.handler").toggleHandler;
  saveKeys?: typeof import("./saveKeys.handler").saveKeysHandler;
  checkForGCal?: typeof import("./checkForGCal.handler").checkForGCalHandler;
  updateAppCredentials?: typeof import("./updateAppCredentials.handler").updateAppCredentialsHandler;
  queryForDependencies?: typeof import("./queryForDependencies.handler").queryForDependenciesHandler;
  checkGlobalKeys?: typeof import("./checkGlobalKeys.handler").checkForGlobalKeysHandler;
  setDefaultConferencingApp?: typeof import("./setDefaultConferencingApp.handler").setDefaultConferencingAppHandler;
  updateUserDefaultConferencingApp?: typeof import("./updateUserDefaultConferencingApp.handler").updateUserDefaultConferencingAppHandler;
};

export const appsRouter = router({
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

  toggle: authedAdminProcedure.input(ZToggleInputSchema).mutation(async ({ ctx, input }) => {
    const { toggleHandler } = await import("./toggle.handler");
    return toggleHandler({
      ctx,
      input,
    });
  }),

  saveKeys: authedAdminProcedure.input(ZSaveKeysInputSchema).mutation(async ({ ctx, input }) => {
    const { saveKeysHandler } = await import("./saveKeys.handler");
    return saveKeysHandler({
      ctx,
      input,
    });
  }),

  checkForGCal: authedProcedure.query(async ({ ctx }) => {
    const { checkForGCalHandler } = await import("./checkForGCal.handler");
    return checkForGCalHandler({
      ctx,
    });
  }),

  setDefaultConferencingApp: authedProcedure
    .input(ZSetDefaultConferencingAppSchema)
    .mutation(async ({ ctx, input }) => {
      const { setDefaultConferencingAppHandler } = await import("./setDefaultConferencingApp.handler");
      return setDefaultConferencingAppHandler({
        ctx,
        input,
      });
    }),
  updateAppCredentials: authedProcedure
    .input(ZUpdateAppCredentialsInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { updateAppCredentialsHandler } = await import("./updateAppCredentials.handler");
      return updateAppCredentialsHandler({
        ctx,
        input,
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
  updateUserDefaultConferencingApp: authedProcedure
    .input(ZUpdateUserDefaultConferencingAppInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { updateUserDefaultConferencingAppHandler } = await import(
        "./updateUserDefaultConferencingApp.handler"
      );
      return updateUserDefaultConferencingAppHandler({ ctx, input });
    }),
});
