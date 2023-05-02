import localeMiddleware from "../../middlewares/localeMiddleware";
import sessionMiddleware from "../../middlewares/sessionMiddleware";
import publicProcedure from "../../procedures/publicProcedure";
import { router } from "../../trpc";
import { slotsRouter } from "../viewer/slots/_router";
import { ZEventInputSchema } from "./event.schema";
import { ZSamlTenantProductInputSchema } from "./samlTenantProduct.schema";
import { ZStripeCheckoutSessionInputSchema } from "./stripeCheckoutSession.schema";

type PublicViewerRouterHandlerCache = {
  session?: typeof import("./session.handler").sessionHandler;
  i18n?: typeof import("./i18n.handler").i18nHandler;
  countryCode?: typeof import("./countryCode.handler").countryCodeHandler;
  samlTenantProduct?: typeof import("./samlTenantProduct.handler").samlTenantProductHandler;
  stripeCheckoutSession?: typeof import("./stripeCheckoutSession.handler").stripeCheckoutSessionHandler;
  cityTimezones?: typeof import("./cityTimezones.handler").cityTimezonesHandler;
  event?: typeof import("./event.handler").eventHandler;
};

const UNSTABLE_HANDLER_CACHE: PublicViewerRouterHandlerCache = {};

// things that unauthenticated users can query about themselves
export const publicViewerRouter = router({
  session: publicProcedure.use(sessionMiddleware).query(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.session) {
      UNSTABLE_HANDLER_CACHE.session = await import("./session.handler").then((mod) => mod.sessionHandler);
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.session) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.session({
      ctx,
    });
  }),

  i18n: publicProcedure.use(localeMiddleware).query(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.i18n) {
      UNSTABLE_HANDLER_CACHE.i18n = await import("./i18n.handler").then((mod) => mod.i18nHandler);
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.i18n) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.i18n({ ctx });
  }),

  countryCode: publicProcedure.query(async ({ ctx }) => {
    if (!UNSTABLE_HANDLER_CACHE.countryCode) {
      UNSTABLE_HANDLER_CACHE.countryCode = await import("./countryCode.handler").then(
        (mod) => mod.countryCodeHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.countryCode) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.countryCode({
      ctx,
    });
  }),

  samlTenantProduct: publicProcedure.input(ZSamlTenantProductInputSchema).mutation(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.samlTenantProduct) {
      UNSTABLE_HANDLER_CACHE.samlTenantProduct = await import("./samlTenantProduct.handler").then(
        (mod) => mod.samlTenantProductHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.samlTenantProduct) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.samlTenantProduct({
      ctx,
      input,
    });
  }),

  stripeCheckoutSession: publicProcedure.input(ZStripeCheckoutSessionInputSchema).query(async ({ input }) => {
    if (!UNSTABLE_HANDLER_CACHE.stripeCheckoutSession) {
      UNSTABLE_HANDLER_CACHE.stripeCheckoutSession = await import("./stripeCheckoutSession.handler").then(
        (mod) => mod.stripeCheckoutSessionHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.stripeCheckoutSession) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.stripeCheckoutSession({
      input,
    });
  }),

  cityTimezones: publicProcedure.query(async () => {
    if (!UNSTABLE_HANDLER_CACHE.cityTimezones) {
      UNSTABLE_HANDLER_CACHE.cityTimezones = await import("./cityTimezones.handler").then(
        (mod) => mod.cityTimezonesHandler
      );
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.cityTimezones) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.cityTimezones();
  }),

  // REVIEW: This router is part of both the public and private viewer router?
  slots: slotsRouter,
  event: publicProcedure.input(ZEventInputSchema).query(async ({ ctx, input }) => {
    if (!UNSTABLE_HANDLER_CACHE.event) {
      UNSTABLE_HANDLER_CACHE.event = await import("./event.handler").then((mod) => mod.eventHandler);
    }

    // Unreachable code but required for type safety
    if (!UNSTABLE_HANDLER_CACHE.event) {
      throw new Error("Failed to load handler");
    }

    return UNSTABLE_HANDLER_CACHE.event({
      ctx,
      input,
    });
  }),
});
