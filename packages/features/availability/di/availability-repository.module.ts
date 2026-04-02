import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { AvailabilityRepository } from "../repositories/availability-repository";
import { AVAILABILITY_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = AVAILABILITY_DI_TOKENS.REPOSITORY;
const moduleToken = AVAILABILITY_DI_TOKENS.REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: AvailabilityRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { AvailabilityRepository };
