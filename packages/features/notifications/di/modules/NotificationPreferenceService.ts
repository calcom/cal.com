import { moduleLoader as userRepoModuleLoader } from "./UserNotificationPreference";
import { moduleLoader as teamRepoModuleLoader } from "./TeamNotificationPreference";
import { NotificationPreferenceService } from "../../services/NotificationPreferenceService";

import { createModule, bindModuleToClassOnToken, type ModuleLoader } from "@calcom/features/di/di";
import { NOTIFICATION_DI_TOKENS } from "../tokens";

export const notificationPreferenceServiceModule = createModule();
const token = NOTIFICATION_DI_TOKENS.NOTIFICATION_PREFERENCE_SERVICE;
const moduleToken = NOTIFICATION_DI_TOKENS.NOTIFICATION_PREFERENCE_SERVICE_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: notificationPreferenceServiceModule,
  moduleToken,
  token,
  classs: NotificationPreferenceService,
  depsMap: {
    userNotificationPreferenceRepository: userRepoModuleLoader,
    teamNotificationPreferenceRepository: teamRepoModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

