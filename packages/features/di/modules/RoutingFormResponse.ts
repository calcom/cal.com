import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { RoutingFormResponseRepository } from "@calcom/lib/server/repository/formResponse";

import { createModule, bindModuleToClassOnToken, type ModuleLoader } from "../di";

export const routingFormResponseRepositoryModule = createModule();
const token = DI_TOKENS.ROUTING_FORM_RESPONSE_REPOSITORY;
const moduleToken = DI_TOKENS.ROUTING_FORM_RESPONSE_REPOSITORY_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: routingFormResponseRepositoryModule,
  moduleToken,
  token,
  classs: RoutingFormResponseRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};
