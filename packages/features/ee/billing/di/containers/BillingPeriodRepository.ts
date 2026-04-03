import { createContainer } from "@calcom/features/di/di";
import type { BillingPeriodRepository } from "@calcom/features/ee/billing/repository/billingPeriod/BillingPeriodRepository";

import { billingPeriodRepositoryModuleLoader } from "../modules/BillingPeriodRepository";
import { DI_TOKENS } from "../tokens";

const container = createContainer();

export function getBillingPeriodRepository(): BillingPeriodRepository {
  billingPeriodRepositoryModuleLoader.loadModule(container);
  return container.get<BillingPeriodRepository>(DI_TOKENS.BILLING_PERIOD_REPOSITORY);
}
