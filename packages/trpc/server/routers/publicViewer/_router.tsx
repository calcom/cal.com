import sessionMiddleware from "../../middlewares/sessionMiddleware";
import publicProcedure from "../../procedures/publicProcedure";
import { importHandler, router } from "../../trpc";
import { slotsRouter } from "../viewer/slots/_router";
import { ZEventInputSchema } from "./event.schema";
import { i18nInputSchema } from "./i18n.schema";
import { ZSamlTenantProductInputSchema } from "./samlTenantProduct.schema";
import { ZStripeCheckoutSessionInputSchema } from "./stripeCheckoutSession.schema";

const NAMESPACE = "publicViewer";

const namespaced = (s: string) => `${NAMESPACE}.${s}`;

// things that unauthenticated users can query about themselves
export const publicViewerRouter = router({
  session: publicProcedure.use(sessionMiddleware).query(async (opts) => {
    const handler = await importHandler(namespaced("session"), () => import("./session.handler"));
    return handler(opts);
  }),
  i18n: publicProcedure.input(i18nInputSchema).query(async (opts) => {
    const handler = await importHandler(namespaced("i18n"), () => import("./i18n.handler"));
    return handler(opts);
  }),
  countryCode: publicProcedure.query(async (opts) => {
    const handler = await importHandler(namespaced("countryCode"), () => import("./countryCode.handler"));
    return handler(opts);
  }),
  samlTenantProduct: publicProcedure.input(ZSamlTenantProductInputSchema).mutation(async (opts) => {
    const handler = await importHandler(
      namespaced("samlTenantProduct"),
      () => import("./samlTenantProduct.handler")
    );
    return handler(opts);
  }),
  stripeCheckoutSession: publicProcedure.input(ZStripeCheckoutSessionInputSchema).query(async (opts) => {
    const handler = await importHandler(
      namespaced("stripeCheckoutSession"),
      () => import("./stripeCheckoutSession.handler")
    );
    return handler(opts);
  }),
  cityTimezones: publicProcedure.query(async () => {
    const handler = await importHandler(namespaced("cityTimezones"), () => import("./cityTimezones.handler"));
    return handler();
  }),
  // REVIEW: This router is part of both the public and private viewer router?
  slots: slotsRouter,
  event: publicProcedure.input(ZEventInputSchema).query(async (opts) => {
    const handler = await importHandler(namespaced("event"), () => import("./event.handler"));
    return handler(opts);
  }),
  ssoConnections: publicProcedure.query(async () => {
    const handler = await importHandler(
      namespaced("ssoConnections"),
      () => import("./ssoConnections.handler")
    );
    return handler();
  }),
});
