import { moduleLoader as creditPurchaseLogRepositoryModuleLoader } from "@calcom/features/credits/di/PrismaCreditPurchaseLogRepository.module";
import type { PrismaCreditPurchaseLogRepository } from "@calcom/features/credits/repositories/PrismaCreditPurchaseLogRepository";
import { createContainer } from "../di";

const container = createContainer();

export function getCreditPurchaseLogRepository(): PrismaCreditPurchaseLogRepository {
  creditPurchaseLogRepositoryModuleLoader.loadModule(container);
  return container.get<PrismaCreditPurchaseLogRepository>(creditPurchaseLogRepositoryModuleLoader.token);
}
