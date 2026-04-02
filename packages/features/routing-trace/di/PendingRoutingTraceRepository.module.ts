import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { PrismaPendingRoutingTraceRepository } from "../repositories/PrismaPendingRoutingTraceRepository";
import { ROUTING_TRACE_DI_TOKENS } from "./tokens";

export const pendingRoutingTraceRepositoryModule = createModule();
const token = ROUTING_TRACE_DI_TOKENS.PENDING_ROUTING_TRACE_REPOSITORY;
const moduleToken = ROUTING_TRACE_DI_TOKENS.PENDING_ROUTING_TRACE_REPOSITORY_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: pendingRoutingTraceRepositoryModule,
  moduleToken,
  token,
  classs: PrismaPendingRoutingTraceRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { PrismaPendingRoutingTraceRepository };
