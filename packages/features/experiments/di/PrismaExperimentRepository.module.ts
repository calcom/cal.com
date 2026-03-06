import { createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import type { Module } from "@evyweb/ioctopus";
import { PrismaExperimentRepository } from "../repositories/PrismaExperimentRepository";
import { EXPERIMENTS_DI_TOKENS } from "./tokens";

const thisModule: Module = createModule();
const token: symbol = EXPERIMENTS_DI_TOKENS.PRISMA_EXPERIMENT_REPOSITORY;
const moduleToken: symbol = EXPERIMENTS_DI_TOKENS.PRISMA_EXPERIMENT_REPOSITORY_MODULE;

thisModule.bind(token).toClass(PrismaExperimentRepository, [prismaModuleLoader.token]);

const loadModule = (container: ReturnType<typeof import("@calcom/features/di/di").createContainer>): void => {
  container.load(moduleToken, thisModule);
  prismaModuleLoader.loadModule(container);
};

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { PrismaExperimentRepository };
