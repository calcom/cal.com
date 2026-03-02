import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { ActiveUserBillingRepository } from "@calcom/features/ee/billing/active-user/repositories/ActiveUserBillingRepository";

import { ACTIVE_USER_BILLING_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = ACTIVE_USER_BILLING_DI_TOKENS.ACTIVE_USER_BILLING_REPOSITORY;
const moduleToken = ACTIVE_USER_BILLING_DI_TOKENS.ACTIVE_USER_BILLING_REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: ActiveUserBillingRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};
