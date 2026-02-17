import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as loggerModuleLoader } from "@calcom/features/di/shared/services/logger.service";
import { SlackApiClientService } from "@calcom/features/notifications/channels/slack/SlackApiClientService";
import { NOTIFICATION_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = NOTIFICATION_DI_TOKENS.SLACK_API_CLIENT;
const moduleToken = NOTIFICATION_DI_TOKENS.SLACK_API_CLIENT_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: SlackApiClientService,
  depsMap: {
    logger: loggerModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
