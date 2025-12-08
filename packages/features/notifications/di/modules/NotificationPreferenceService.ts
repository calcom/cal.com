import { type Container, createModule } from "@calcom/features/di/di";

import { NotificationPreferenceService } from "../../lib/NotificationPreferenceService";
import { NOTIFICATION_DI_TOKENS } from "../tokens";
import { notificationPreferenceRepositoryModuleLoader } from "./NotificationPreferenceRepository";

export const notificationPreferenceServiceModule = createModule();
const token = NOTIFICATION_DI_TOKENS.NOTIFICATION_PREFERENCE_SERVICE;
const moduleToken = NOTIFICATION_DI_TOKENS.NOTIFICATION_PREFERENCE_SERVICE_MODULE;

notificationPreferenceServiceModule
  .bind(token)
  .toClass(NotificationPreferenceService, [NOTIFICATION_DI_TOKENS.NOTIFICATION_PREFERENCE_REPOSITORY]);

export const moduleLoader = {
  token,
  loadModule: (container: Container) => {
    container.load(moduleToken, notificationPreferenceServiceModule);
    notificationPreferenceRepositoryModuleLoader.loadModule(container);
  },
};
