import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { CachedActiveUserBillingRepository } from "@calcom/features/ee/billing/active-user/repositories/CachedActiveUserBillingRepository";
import { moduleLoader as activeUserBillingRepositoryModuleLoader } from "./ActiveUserBillingRepository.module";
import { ACTIVE_USER_BILLING_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = ACTIVE_USER_BILLING_DI_TOKENS.CACHED_ACTIVE_USER_BILLING_REPOSITORY;
const moduleToken = ACTIVE_USER_BILLING_DI_TOKENS.CACHED_ACTIVE_USER_BILLING_REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: CachedActiveUserBillingRepository,
  dep: activeUserBillingRepositoryModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};
