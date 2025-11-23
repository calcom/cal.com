import Stripe from "stripe";

import { type Container, createModule, ModuleLoader } from "@calcom/features/di/di";

import { DI_TOKENS } from "../tokens";

export const stripeClientModule = createModule();
const token = DI_TOKENS.STRIPE_CLIENT;
stripeClientModule.bind(token).toFactory(() => {
  if (!process.env.STRIPE_PRIVATE_KEY) {
    throw new Error("STRIPE_PRIVATE_KEY is not set");
  }

  return new Stripe(process.env.STRIPE_PRIVATE_KEY!, {
    apiVersion: "2020-08-27",
  });
});

export const stripeClientModuleLoader: ModuleLoader = {
  token,
  loadModule: function (container: Container) {
    container.load(token, stripeClientModule);
  },
};
