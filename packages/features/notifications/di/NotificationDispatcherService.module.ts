import type { ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as loggerModuleLoader } from "@calcom/features/di/shared/services/logger.service";
import { SHARED_TOKENS } from "@calcom/features/di/shared/shared.tokens";
import { NotificationDispatcherService } from "@calcom/features/notifications/services/NotificationDispatcherService";
import type { INotificationChannel } from "@calcom/features/notifications/types/NotificationChannel";
import type { ResolveFunction } from "@evyweb/ioctopus";
import { createModule } from "@evyweb/ioctopus";
import { moduleLoader as slackChannelModuleLoader } from "./SlackNotificationChannelService.module";
import { NOTIFICATION_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = NOTIFICATION_DI_TOKENS.NOTIFICATION_DISPATCHER;
const moduleToken = NOTIFICATION_DI_TOKENS.NOTIFICATION_DISPATCHER_MODULE;

thisModule.bind(token).toFactory((resolve: ResolveFunction) => {
  const channels: INotificationChannel[] = [
    resolve(NOTIFICATION_DI_TOKENS.SLACK_CHANNEL) as INotificationChannel,
  ];

  return new NotificationDispatcherService({
    channels,
    logger: resolve(SHARED_TOKENS.LOGGER),
  });
});

const loadModule = (container: import("@evyweb/ioctopus").Container) => {
  container.load(moduleToken, thisModule);
  slackChannelModuleLoader.loadModule(container);
  loggerModuleLoader.loadModule(container);
};

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
