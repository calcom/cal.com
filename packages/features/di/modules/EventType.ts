import { DI_TOKENS } from "@calcom/features/di/tokens";
import { EventTypeRepository } from "@calcom/features/eventtypes/repositories/eventTypeRepository";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";

import { createModule, bindModuleToClassOnToken, type ModuleLoader } from "../di";

export const eventTypeRepositoryModule = createModule();
const token = DI_TOKENS.EVENT_TYPE_REPOSITORY;
const moduleToken = DI_TOKENS.EVENT_TYPE_REPOSITORY_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: eventTypeRepositoryModule,
  moduleToken,
  token,
  classs: EventTypeRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};
