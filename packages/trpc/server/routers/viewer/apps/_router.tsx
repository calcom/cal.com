import authedProcedure, { authedAdminProcedure } from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZAppByIdInputSchema } from "./appById.schema";
import { ZAppCredentialsByTypeInputSchema } from "./appCredentialsByType.schema";
import { checkGlobalKeysSchema } from "./checkGlobalKeys.schema";
import { ZIntegrationsInputSchema } from "./integrations.schema";
import { ZListLocalInputSchema } from "./listLocal.schema";
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
  toggle?: typeof import("./toggle.handler").toggleHandler;
  saveKeys?: typeof import("./saveKeys.handler").saveKeysHandler;
  checkForGCal?: typeof import("./checkForGCal.handler").checkForGCalHandler;
  updateAppCredentials?: typeof import("./updateAppCredentials.handler").updateAppCredentialsHandler;
  queryForDependencies?: typeof import("./queryForDependencies.handler").queryForDependenciesHandler;
  checkGlobalKeys?: typeof import("./checkGlobalKeys.handler").checkForGlobalKeysHandler;
  setDefaultConferencingApp?: typeof import("./setDefaultConferencingApp.handler").setDefaultConferencingAppHandler;
  updateUserDefaultConferencingApp?: typeof import("./updateUserDefaultConferencingApp.handler").updateUserDefaultConferencingAppHandler;
};

const UNSTABLE_HANDLER_CACHE: AppsRouterHandlerCache = {};

export const appsRouter = router({
  appById: authedProcedure.input(ZAppByIdInputSchema).query(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.appById) {
      UNSTABLE_HANDLER_CACHE.appById = (await import("./appById.handler")).appByIdHandler;
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.appById) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.appById({ ctx, input });
  }),

  appCredentialsByType: authedProcedure
    .input(ZAppCredentialsByTypeInputSchema)
    .query(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.appCredentialsByType) {
        UNSTABLE_HANDLER_CACHE.appCredentialsByType = (
          await import("./appCredentialsByType.handler")
        ).appCredentialsByTypeHandler;
      }

      // Unreachable code but required for type safety
      if (!UNSTABLE_HANDLER_CACHE.appCredentialsByType) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.appCredentialsByType({ ctx, input });
    }),
  getUsersDefaultConferencingApp: authedProcedure.query(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.getUsersDefaultConferencingApp) {
      UNSTABLE_HANDLER_CACHE.getUsersDefaultConferencingApp = (
        await import("./getUsersDefaultConferencingApp.handler")
      ).getUsersDefaultConferencingAppHandler;
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.getUsersDefaultConferencingApp) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.getUsersDefaultConferencingApp({ ctx });
  }),
  integrations: authedProcedure.input(ZIntegrationsInputSchema).query(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.integrations) {
      UNSTABLE_HANDLER_CACHE.integrations = (await import("./integrations.handler")).integrationsHandler;
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.integrations) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.integrations({ ctx, input });
  }),
  listLocal: authedAdminProcedure.input(ZListLocalInputSchema).query(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.listLocal) {
      UNSTABLE_HANDLER_CACHE.listLocal = await import("./listLocal.handler").then(
        (mod) => mod.listLocalHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.listLocal) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.listLocal({
      ctx,
      input,
    });
  }),

  toggle: authedAdminProcedure.input(ZToggleInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.toggle) {
      UNSTABLE_HANDLER_CACHE.toggle = await import("./toggle.handler").then((mod) => mod.toggleHandler);
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.toggle) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.toggle({
      ctx,
      input,
    });
  }),

  saveKeys: authedAdminProcedure.input(ZSaveKeysInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.saveKeys) {
      UNSTABLE_HANDLER_CACHE.saveKeys = await import("./saveKeys.handler").then((mod) => mod.saveKeysHandler);
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.saveKeys) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.saveKeys({
      ctx,
      input,
    });
  }),

  checkForGCal: authedProcedure.query(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.checkForGCal) {
      UNSTABLE_HANDLER_CACHE.checkForGCal = await import("./checkForGCal.handler").then(
        (mod) => mod.checkForGCalHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.checkForGCal) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.checkForGCal({
      ctx,
    });
  }),

  setDefaultConferencingApp: authedProcedure
    .input(ZSetDefaultConferencingAppSchema)
    .mutation(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.setDefaultConferencingApp) {
        UNSTABLE_HANDLER_CACHE.setDefaultConferencingApp = await import(
          "./setDefaultConferencingApp.handler"
        ).then((mod) => mod.setDefaultConferencingAppHandler);
      }

      // Unreachable code but required for type safety
      if (!UNSTABLE_HANDLER_CACHE.setDefaultConferencingApp) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.setDefaultConferencingApp({
        ctx,
        input,
      });
    }),
  updateAppCredentials: authedProcedure
    .input(ZUpdateAppCredentialsInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.updateAppCredentials) {
        UNSTABLE_HANDLER_CACHE.updateAppCredentials = await import("./updateAppCredentials.handler").then(
          (mod) => mod.updateAppCredentialsHandler
        );
      }

      // Unreachable code but required for type safety
      if (!UNSTABLE_HANDLER_CACHE.updateAppCredentials) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.updateAppCredentials({
        ctx,
        input,
      });
    }),

  queryForDependencies: authedProcedure
    .input(ZQueryForDependenciesInputSchema)
    .query(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.queryForDependencies) {
        UNSTABLE_HANDLER_CACHE.queryForDependencies = await import("./queryForDependencies.handler").then(
          (mod) => mod.queryForDependenciesHandler
        );
      }

      // Unreachable code but required for type safety
      if (!UNSTABLE_HANDLER_CACHE.queryForDependencies) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.queryForDependencies({
        ctx,
        input,
      });
    }),
  checkGlobalKeys: authedProcedure.input(checkGlobalKeysSchema).query(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.checkGlobalKeys) {
      UNSTABLE_HANDLER_CACHE.checkGlobalKeys = await import("./checkGlobalKeys.handler").then(
        (mod) => mod.checkForGlobalKeysHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.checkGlobalKeys) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.checkGlobalKeys({
      ctx,
      input,
    });
  }),
  updateUserDefaultConferencingApp: authedProcedure
    .input(ZUpdateUserDefaultConferencingAppInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!UNSTABLE_HANDLER_CACHE.updateUserDefaultConferencingApp) {
        UNSTABLE_HANDLER_CACHE.updateUserDefaultConferencingApp = (
          await import("./updateUserDefaultConferencingApp.handler")
        ).updateUserDefaultConferencingAppHandler;
      }

      // Unreachable code but required for type safety
      if (!UNSTABLE_HANDLER_CACHE.updateUserDefaultConferencingApp) {
        throw new Error("Failed to load handler");
      }

      return UNSTABLE_HANDLER_CACHE.updateUserDefaultConferencingApp({ ctx, input });
    }),
});
