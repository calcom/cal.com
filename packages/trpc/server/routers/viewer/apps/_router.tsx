import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZAppCredentialsByTypeInputSchema } from "./appCredentialsByType.schema";
import { checkGlobalKeysSchema } from "./checkGlobalKeys.schema";
import { ZIntegrationsInputSchema } from "./integrations.schema";
import { ZUpdateAppCredentialsInputSchema } from "./updateAppCredentials.schema";

export const appsRouter = router({
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

  checkForGCal: authedProcedure.query(async ({ ctx }) => {
    const { checkForGCalHandler } = await import("./checkForGCal.handler");
    return checkForGCalHandler({
      ctx,
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

  checkGlobalKeys: authedProcedure.input(checkGlobalKeysSchema).query(async ({ ctx, input }) => {
    const { checkForGlobalKeysHandler } = await import("./checkGlobalKeys.handler");
    return checkForGlobalKeysHandler({
      ctx,
      input,
    });
  }),
});
