import type { BillingService } from "./billing-service";
import { BillingFactory } from "./billing-service-factory";

const globalForBilling = global as unknown as {
  billingService: BillingService;
};

const billing = globalForBilling.billingService || new BillingFactory();

if (process.env.NODE_ENV !== "production") {
  globalForBilling.billingService = billing;
}

export default billing;
