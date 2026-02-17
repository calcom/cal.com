import { createModule, type ModuleLoader } from "@calcom/features/di/di";
import { SlackMessageFormatterService } from "@calcom/features/notifications/channels/slack/SlackMessageFormatterService";
import { NOTIFICATION_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = NOTIFICATION_DI_TOKENS.SLACK_FORMATTER;
const moduleToken = NOTIFICATION_DI_TOKENS.SLACK_FORMATTER_MODULE;

thisModule.bind(token).toClass(SlackMessageFormatterService, {});

const loadModule = (container: import("@evyweb/ioctopus").Container) => {
  container.load(moduleToken, thisModule);
};

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
