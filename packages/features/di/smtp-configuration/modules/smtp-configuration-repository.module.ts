import { PrismaSmtpConfigurationRepository } from "@calcom/features/ee/organizations/repositories/prisma-smtp-configuration-repository";

import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "../../di";
import { moduleLoader as prismaModuleLoader } from "../../modules/Prisma";
import { SMTP_CONFIGURATION_DI_TOKENS } from "../tokens";

const thisModule = createModule();
const token = SMTP_CONFIGURATION_DI_TOKENS.SMTP_CONFIGURATION_REPOSITORY;
const moduleToken = SMTP_CONFIGURATION_DI_TOKENS.SMTP_CONFIGURATION_REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: PrismaSmtpConfigurationRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { PrismaSmtpConfigurationRepository };
