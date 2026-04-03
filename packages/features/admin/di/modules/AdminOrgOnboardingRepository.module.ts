import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { AdminOrgOnboardingRepository } from "../../repositories/AdminOrgOnboardingRepository";
import { ADMIN_DI_TOKENS } from "../tokens";

const thisModule = createModule();
const token = ADMIN_DI_TOKENS.ADMIN_ORG_ONBOARDING_REPOSITORY;
const moduleToken = ADMIN_DI_TOKENS.ADMIN_ORG_ONBOARDING_REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: AdminOrgOnboardingRepository,
  dep: prismaModuleLoader,
});

export const adminOrgOnboardingRepositoryModuleLoader: ModuleLoader = {
  token,
  loadModule,
};
