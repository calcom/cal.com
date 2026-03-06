import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { BillingPeriodRepository } from "@calcom/features/ee/billing/repository/billingPeriod/BillingPeriodRepository";
import { DI_TOKENS } from "../tokens";

const thisModule = createModule();
const token = DI_TOKENS.BILLING_PERIOD_REPOSITORY;
const moduleToken = DI_TOKENS.BILLING_PERIOD_REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: BillingPeriodRepository,
  dep: prismaModuleLoader,
});

export const billingPeriodRepositoryModuleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { BillingPeriodRepository };
