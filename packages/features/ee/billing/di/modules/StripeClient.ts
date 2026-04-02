import process from "node:process";
import { type Container, createModule, type ModuleLoader } from "@calcom/features/di/di";
import Stripe from "stripe";
import { DI_TOKENS } from "../tokens";

export const stripeClientModule = createModule();
const token = DI_TOKENS.STRIPE_CLIENT;

/**
 * Creates a deep proxy that only throws when a Stripe function is invoked.
 * Property access (e.g. stripe.customers, stripe.customers.create) returns another proxy so that
 * code doing capability checks (typeof stripe.customers?.create === "function") does not immediately throw.
 */
function createLazyThrowingStripeStub(error: Error): Stripe {
  // Using unknown instead of any to satisfy lint while still allowing broad proxying.
  function makeDeepProxy(): unknown {
    return new Proxy(() => {}, {
      get() {
        // Return another proxy for any nested property (resources/methods)
        return makeDeepProxy();
      },
      apply() {
        throw error; // Throw only when a function is actually called
      },
    });
  }
  return makeDeepProxy() as Stripe;
}

stripeClientModule.bind(token).toFactory(() => {
  if (!process.env.STRIPE_PRIVATE_KEY) {
    const error = new Error("STRIPE_PRIVATE_KEY is not set");
    // Inject a stub that defers throwing until a method invocation
    return createLazyThrowingStripeStub(error);
  }

  return new Stripe(process.env.STRIPE_PRIVATE_KEY!, {
    apiVersion: "2020-08-27",
  });
});

export const stripeClientModuleLoader: ModuleLoader = {
  token,
  loadModule: (container: Container) => {
    container.load(token, stripeClientModule);
  },
};
