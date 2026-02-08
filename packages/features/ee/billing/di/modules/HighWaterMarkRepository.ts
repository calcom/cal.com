import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { HighWaterMarkRepository } from "@calcom/features/ee/billing/repository/highWaterMark/HighWaterMarkRepository";

import { DI_TOKENS } from "../tokens";

const thisModule = createModule();
const token = DI_TOKENS.HIGH_WATER_MARK_REPOSITORY;
const moduleToken = DI_TOKENS.HIGH_WATER_MARK_REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: HighWaterMarkRepository,
  dep: prismaModuleLoader,
});

export const highWaterMarkRepositoryModuleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { HighWaterMarkRepository };
