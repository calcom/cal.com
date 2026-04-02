import { type Container, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { StripeBillingService } from "../../service/billingProvider/StripeBillingService";
import { DI_TOKENS } from "../tokens";
import { stripeClientModuleLoader } from "./StripeClient";

const billingProviderServiceModule = createModule();
const token = DI_TOKENS.BILLING_PROVIDER_SERVICE;
billingProviderServiceModule.bind(token).toClass(StripeBillingService, [DI_TOKENS.STRIPE_CLIENT]);

export const billingProviderServiceModuleLoader: ModuleLoader = {
  token,
  loadModule: (container: Container) => {
    // Load dependency first
    stripeClientModuleLoader.loadModule(container);

    // Then load this module
    container.load(DI_TOKENS.BILLING_PROVIDER_SERVICE_MODULE, billingProviderServiceModule);
  },
};
