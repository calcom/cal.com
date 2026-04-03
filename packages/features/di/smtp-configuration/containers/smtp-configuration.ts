import { createContainer } from "../../di";
import {
  type SmtpConfigurationService,
  moduleLoader as smtpConfigurationServiceModuleLoader,
} from "../modules/smtp-configuration-service.module";
import { type SmtpService, moduleLoader as smtpServiceModuleLoader } from "../modules/smtp-service.module";

const smtpConfigurationContainer = createContainer();

export function getSmtpConfigurationService(): SmtpConfigurationService {
  smtpConfigurationServiceModuleLoader.loadModule(smtpConfigurationContainer);
  return smtpConfigurationContainer.get<SmtpConfigurationService>(smtpConfigurationServiceModuleLoader.token);
}

export function getSmtpService(): SmtpService {
  smtpServiceModuleLoader.loadModule(smtpConfigurationContainer);
  return smtpConfigurationContainer.get<SmtpService>(smtpServiceModuleLoader.token);
}
