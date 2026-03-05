import { moduleLoader as creditsRepositoryModuleLoader } from "@calcom/features/credits/di/PrismaCreditsRepository.module";
import type { PrismaCreditsRepository } from "@calcom/features/credits/repositories/PrismaCreditsRepository";
import { createContainer } from "../di";

const container = createContainer();

export function getCreditsRepository(): PrismaCreditsRepository {
  creditsRepositoryModuleLoader.loadModule(container);
  return container.get<PrismaCreditsRepository>(creditsRepositoryModuleLoader.token);
}
