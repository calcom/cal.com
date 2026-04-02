import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";

import { CustomDomainRepository } from "../repositories/custom-domain-repository";
import { CUSTOM_DOMAIN_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = CUSTOM_DOMAIN_DI_TOKENS.CUSTOM_DOMAIN_REPOSITORY;
const moduleToken = CUSTOM_DOMAIN_DI_TOKENS.CUSTOM_DOMAIN_REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: CustomDomainRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { CustomDomainRepository };
