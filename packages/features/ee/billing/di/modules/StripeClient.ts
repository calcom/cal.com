import Stripe from "stripe";

import { type Container, createModule, ModuleLoader } from "@calcom/features/di/di";
import getStripe from "@calcom/features/ee/payments/server/stripe";

import { DI_TOKENS } from "../tokens";

export const stripeClientModule = createModule();
const token = DI_TOKENS.STRIPE_CLIENT;

const apiKey = process.env.STRIPE_PRIVATE_KEY;

let client: Stripe;

if (apiKey) {
  // ✅ Only initialize Stripe if the key exists
  client = getStripe(apiKey)!;
} else {
  // ⚠️ If missing, use a dummy object to prevent the server from crashing on startup
  console.warn("STRIPE_PRIVATE_KEY is missing. Stripe features will be disabled.");
  client = {} as unknown as Stripe;
}

stripeClientModule.bind(token).toValue(client);

export const stripeClientModuleLoader: ModuleLoader = {
  token,
  loadModule: (container: Container) => {
    container.load(DI_TOKENS.STRIPE_CLIENT_MODULE, stripeClientModule);
  },
};