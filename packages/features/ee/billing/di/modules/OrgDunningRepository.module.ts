import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { OrgDunningRepository } from "@calcom/features/ee/billing/repository/dunning/OrgDunningRepository";
import { DI_TOKENS } from "../tokens";

const thisModule = createModule();
const token = DI_TOKENS.ORG_DUNNING_REPOSITORY;
const moduleToken = DI_TOKENS.ORG_DUNNING_REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: OrgDunningRepository,
  dep: prismaModuleLoader,
});

export const orgDunningRepositoryModuleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { OrgDunningRepository };
