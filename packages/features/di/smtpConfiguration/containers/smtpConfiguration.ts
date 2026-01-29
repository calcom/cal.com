import { createContainer } from "../../di";
import {
  type SmtpConfigurationService,
  moduleLoader as smtpConfigurationServiceModuleLoader,
} from "../modules/SmtpConfigurationService.module";
import { type SmtpService, moduleLoader as smtpServiceModuleLoader } from "../modules/SmtpService.module";

const smtpConfigurationContainer = createContainer();

export function getSmtpConfigurationService(): SmtpConfigurationService {
  smtpConfigurationServiceModuleLoader.loadModule(smtpConfigurationContainer);
  return smtpConfigurationContainer.get<SmtpConfigurationService>(smtpConfigurationServiceModuleLoader.token);
}

export function getSmtpService(): SmtpService {
  smtpServiceModuleLoader.loadModule(smtpConfigurationContainer);
  return smtpConfigurationContainer.get<SmtpService>(smtpServiceModuleLoader.token);
}
