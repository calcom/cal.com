import { createContainer } from "@calcom/features/di/di";
import type { NotificationDispatcherService } from "../services/NotificationDispatcherService";
import { moduleLoader as dispatcherModuleLoader } from "./NotificationDispatcherService.module";
import { NOTIFICATION_DI_TOKENS } from "./tokens";

const notificationContainer = createContainer();

export function getNotificationDispatcher(): NotificationDispatcherService {
  dispatcherModuleLoader.loadModule(notificationContainer);
  return notificationContainer.get<NotificationDispatcherService>(
    NOTIFICATION_DI_TOKENS.NOTIFICATION_DISPATCHER
  );
}
