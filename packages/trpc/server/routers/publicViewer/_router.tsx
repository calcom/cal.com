import publicProcedure from "../../procedures/publicProcedure";
import { importHandler, router } from "../../trpc";
import { ZUserEmailVerificationRequiredSchema } from "./checkIfUserEmailVerificationRequired.schema";
import { ZMarkHostAsNoShowInputSchema } from "./markHostAsNoShow.schema";
import { event } from "./procedures/event";
import { session } from "./procedures/session";
import { ZSamlTenantProductInputSchema } from "./samlTenantProduct.schema";
import { ZStripeCheckoutSessionInputSchema } from "./stripeCheckoutSession.schema";
import { ZSubmitRatingInputSchema } from "./submitRating.schema";

const NAMESPACE = "publicViewer";

const namespaced = (s: string) => `${NAMESPACE}.${s}`;

// things that unauthenticated users can query about themselves
export const publicViewerRouter = router({
  session,
  countryCode: publicProcedure.query(async (opts) => {
    const handler = await importHandler(namespaced("countryCode"), () => import("./countryCode.handler"));
    return handler(opts);
  }),
  submitRating: publicProcedure.input(ZSubmitRatingInputSchema).mutation(async (opts) => {
    const handler = await importHandler(namespaced("submitRating"), () => import("./submitRating.handler"));
    return handler(opts);
  }),
  markHostAsNoShow: publicProcedure.input(ZMarkHostAsNoShowInputSchema).mutation(async (opts) => {
    const handler = await importHandler(
      namespaced("markHostAsNoShow"),
      () => import("./markHostAsNoShow.handler")
    );
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
  event,
  ssoConnections: publicProcedure.query(async () => {
    const handler = await importHandler(
      namespaced("ssoConnections"),
      () => import("./ssoConnections.handler")
    );
    return handler();
  }),

  checkIfUserEmailVerificationRequired: publicProcedure
    .input(ZUserEmailVerificationRequiredSchema)
    .query(async (opts) => {
      const handler = await importHandler(
        namespaced("checkIfUserEmailVerificationRequired"),
        () => import("./checkIfUserEmailVerificationRequired.handler")
      );
      return handler(opts);
    }),
});
