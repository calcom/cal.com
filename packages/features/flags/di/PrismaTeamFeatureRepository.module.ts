import { createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import type { Module } from "@evyweb/ioctopus";
import { PrismaTeamFeatureRepository } from "../repositories/PrismaTeamFeatureRepository";
import { FLAGS_DI_TOKENS } from "./tokens";

const thisModule: Module = createModule();
const token: symbol = FLAGS_DI_TOKENS.PRISMA_TEAM_FEATURE_REPOSITORY;
const moduleToken: symbol = FLAGS_DI_TOKENS.PRISMA_TEAM_FEATURE_REPOSITORY_MODULE;

thisModule.bind(token).toClass(PrismaTeamFeatureRepository, [prismaModuleLoader.token]);

const loadModule = (container: ReturnType<typeof import("@calcom/features/di/di").createContainer>): void => {
  container.load(moduleToken, thisModule);
  prismaModuleLoader.loadModule(container);
};

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { PrismaTeamFeatureRepository };
