import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { AdminBillingRepository } from "@calcom/features/ee/billing/repository/adminBilling/AdminBillingRepository";

import { DI_TOKENS } from "../tokens";

const thisModule = createModule();
const token = DI_TOKENS.ADMIN_BILLING_REPOSITORY;
const moduleToken = DI_TOKENS.ADMIN_BILLING_REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: AdminBillingRepository,
  dep: prismaModuleLoader,
});

export const adminBillingRepositoryModuleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { AdminBillingRepository };
