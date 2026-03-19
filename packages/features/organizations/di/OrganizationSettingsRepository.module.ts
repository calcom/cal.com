import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { OrganizationSettingsRepository } from "../repositories/OrganizationSettingsRepository";

const thisModule = createModule();
const token = DI_TOKENS.ORGANIZATION_SETTINGS_REPOSITORY;
const moduleToken = DI_TOKENS.ORGANIZATION_SETTINGS_REPOSITORY_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: OrganizationSettingsRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};
