import { SmtpConfigurationRepository } from "@calcom/features/ee/organizations/repositories/SmtpConfigurationRepository";

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
  classs: SmtpConfigurationRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { SmtpConfigurationRepository };
