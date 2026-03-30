import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";

import { PrismaRoutingTraceRepository } from "../repositories/PrismaRoutingTraceRepository";
import { ROUTING_TRACE_DI_TOKENS } from "./tokens";

export const routingTraceRepositoryModule = createModule();
const token = ROUTING_TRACE_DI_TOKENS.ROUTING_TRACE_REPOSITORY;
const moduleToken = ROUTING_TRACE_DI_TOKENS.ROUTING_TRACE_REPOSITORY_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: routingTraceRepositoryModule,
  moduleToken,
  token,
  classs: PrismaRoutingTraceRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { PrismaRoutingTraceRepository };
