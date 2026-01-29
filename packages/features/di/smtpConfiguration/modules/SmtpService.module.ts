import { SmtpService } from "@calcom/features/ee/organizations/lib/service/SmtpService";
import type { Container } from "@evyweb/ioctopus";

import { createModule, type ModuleLoader } from "../../di";
import { SMTP_CONFIGURATION_DI_TOKENS } from "../tokens";

const thisModule = createModule();
const token = SMTP_CONFIGURATION_DI_TOKENS.SMTP_SERVICE;
const moduleToken = SMTP_CONFIGURATION_DI_TOKENS.SMTP_SERVICE_MODULE;

thisModule.bind(token).toFactory(() => new SmtpService(), "singleton");

export const moduleLoader: ModuleLoader = {
  token,
  loadModule: (container: Container) => {
    container.load(moduleToken, thisModule);
  },
};

export type { SmtpService };
