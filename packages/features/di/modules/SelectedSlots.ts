import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { PrismaSelectedSlotRepository } from "@calcom/lib/server/repository/PrismaSelectedSlotRepository";

import { createModule, bindModuleToClassOnToken, type ModuleLoader } from "../di";

export const selectedSlotsRepositoryModule = createModule();
const token = DI_TOKENS.SELECTED_SLOT_REPOSITORY;
const moduleToken = DI_TOKENS.SELECTED_SLOT_REPOSITORY_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: selectedSlotsRepositoryModule,
  moduleToken,
  token,
  classs: PrismaSelectedSlotRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};
