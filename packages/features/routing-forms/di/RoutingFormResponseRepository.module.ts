import { PrismaRoutingFormResponseRepository } from "@calcom/lib/server/repository/PrismaRoutingFormResponseRepository";
import { ROUTING_FORM_DI_TOKENS } from "@calcom/features/routing-forms/di/tokens";
import { bindModuleToClassOnToken } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { createModule } from "../../di/di";

export const routingFormResponseRepositoryModule = createModule();
const token = ROUTING_FORM_DI_TOKENS.ROUTING_FORM_RESPONSE_REPOSITORY;
const moduleToken = ROUTING_FORM_DI_TOKENS.ROUTING_FORM_RESPONSE_REPOSITORY_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: routingFormResponseRepositoryModule,
  moduleToken,
  token,
  classs: PrismaRoutingFormResponseRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader = {
  token,
  loadModule,
};
