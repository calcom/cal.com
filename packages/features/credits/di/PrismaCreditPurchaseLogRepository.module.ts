import { PrismaCreditPurchaseLogRepository } from "@calcom/features/credits/repositories/PrismaCreditPurchaseLogRepository";
import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { DI_TOKENS } from "@calcom/features/di/tokens";

export const creditPurchaseLogRepositoryModule = createModule();
const token = DI_TOKENS.CREDIT_PURCHASE_LOG_REPOSITORY;
const moduleToken = DI_TOKENS.CREDIT_PURCHASE_LOG_REPOSITORY_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: creditPurchaseLogRepositoryModule,
  moduleToken,
  token,
  classs: PrismaCreditPurchaseLogRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { PrismaCreditPurchaseLogRepository };
