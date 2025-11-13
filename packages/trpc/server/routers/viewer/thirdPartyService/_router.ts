import authedProcedure, { authedAdminProcedure } from "@calcom/trpc/server/procedures/authedProcedure";

import { router } from "../../../trpc";
import { ZGetAllServicesInputSchema } from "./getAllServices.schema";
import { ZGetServiceProviderInputSchema } from "./getServiceProvider.schema";
import { ZUpdateServiceProviderInputSchema } from "./updateServiceProvider.schema";

type ThirdPartyServiceRouterHandlerCache = {
  getAllServices?: typeof import("./getAllServices.handler").getAllServicesHandler;

  getServiceProvider?: typeof import("./getServiceProvider.handler").getServiceProviderHandler;
  updateServiceProvider?: typeof import("./updateServiceProvider.handler").updateServiceProviderHandler;
};

const UNSTABLE_HANDLER_CACHE: ThirdPartyServiceRouterHandlerCache = {};

export const thirdPartyServiceRouter = router({
  getAllServices: authedAdminProcedure.input(ZGetAllServicesInputSchema).query(async ({ input }) => {
    if (!UNSTABLE_HANDLER_CACHE.getAllServices) {
      UNSTABLE_HANDLER_CACHE.getAllServices = (
        await import("./getAllServices.handler")
      ).getAllServicesHandler;
    }

    const handler = UNSTABLE_HANDLER_CACHE.getAllServices;
    return handler({
      input,
    });
  }),
  getServiceProvider: authedProcedure.input(ZGetServiceProviderInputSchema).query(async ({ input }) => {
    if (!UNSTABLE_HANDLER_CACHE.getServiceProvider) {
      UNSTABLE_HANDLER_CACHE.getServiceProvider = (
        await import("./getServiceProvider.handler")
      ).getServiceProviderHandler;
    }

    const handler = UNSTABLE_HANDLER_CACHE.getServiceProvider;
    return handler({
      input,
    });
  }),

  updateServiceProvider: authedAdminProcedure
    .input(ZUpdateServiceProviderInputSchema)
    .mutation(async ({ input }) => {
      if (!UNSTABLE_HANDLER_CACHE.updateServiceProvider) {
        UNSTABLE_HANDLER_CACHE.updateServiceProvider = (
          await import("./updateServiceProvider.handler")
        ).updateServiceProviderHandler;
      }

      const handler = UNSTABLE_HANDLER_CACHE.updateServiceProvider;
      return handler({
        input,
      });
    }),
});
