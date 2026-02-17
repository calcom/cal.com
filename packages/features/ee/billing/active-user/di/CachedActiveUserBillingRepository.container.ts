import { createContainer } from "@calcom/features/di/di";
import type { CachedActiveUserBillingRepository } from "@calcom/features/ee/billing/active-user/repositories/CachedActiveUserBillingRepository";
import { moduleLoader as cachedActiveUserBillingRepositoryModuleLoader } from "./CachedActiveUserBillingRepository.module";

const container = createContainer();

export function getCachedActiveUserBillingRepository(): CachedActiveUserBillingRepository {
  cachedActiveUserBillingRepositoryModuleLoader.loadModule(container);
  return container.get<CachedActiveUserBillingRepository>(
    cachedActiveUserBillingRepositoryModuleLoader.token
  );
}
