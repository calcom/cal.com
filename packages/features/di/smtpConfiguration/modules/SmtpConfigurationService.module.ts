import { SmtpConfigurationService } from "@calcom/features/ee/organizations/lib/service/SmtpConfigurationService";

import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "../../di";
import { SMTP_CONFIGURATION_DI_TOKENS } from "../tokens";
import { moduleLoader as smtpConfigurationRepositoryModuleLoader } from "./SmtpConfigurationRepository.module";
import { moduleLoader as smtpServiceModuleLoader } from "./SmtpService.module";

const thisModule = createModule();
const token = SMTP_CONFIGURATION_DI_TOKENS.SMTP_CONFIGURATION_SERVICE;
const moduleToken = SMTP_CONFIGURATION_DI_TOKENS.SMTP_CONFIGURATION_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: SmtpConfigurationService,
  depsMap: {
    repository: smtpConfigurationRepositoryModuleLoader,
    smtpService: smtpServiceModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { SmtpConfigurationService };
