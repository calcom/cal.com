import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as loggerModuleLoader } from "@calcom/features/di/shared/services/logger.service";
import { SlackNotificationChannelService } from "@calcom/features/notifications/channels/slack/SlackNotificationChannelService";
import { moduleLoader as slackApiClientModuleLoader } from "./SlackApiClientService.module";
import { moduleLoader as slackFormatterModuleLoader } from "./SlackMessageFormatterService.module";
import { NOTIFICATION_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = NOTIFICATION_DI_TOKENS.SLACK_CHANNEL;
const moduleToken = NOTIFICATION_DI_TOKENS.SLACK_CHANNEL_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: SlackNotificationChannelService,
  depsMap: {
    formatter: slackFormatterModuleLoader,
    apiClient: slackApiClientModuleLoader,
    logger: loggerModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
