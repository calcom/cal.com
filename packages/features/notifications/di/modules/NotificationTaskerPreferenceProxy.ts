import { SHARED_TOKENS } from "@calcom/features/di/shared/shared.tokens";
import { type Container, createModule } from "@calcom/features/di/di";
import { NotificationTaskerPreferenceProxy } from "../../lib/NotificationTaskerPreferenceProxy";

import { NOTIFICATION_DI_TOKENS } from "../tokens";
import { notificationPreferenceServiceModuleLoader } from "./NotificationPreferenceService";
import { notificationMetadataExtractorModuleLoader } from "./NotificationMetadataExtractor";

export const notificationTaskerPreferenceProxyModule = createModule();
const token = NOTIFICATION_DI_TOKENS.NOTIFICATION_TASKER_PREFERENCE_PROXY;
const moduleToken = NOTIFICATION_DI_TOKENS.NOTIFICATION_TASKER_PREFERENCE_PROXY_MODULE;

notificationTaskerPreferenceProxyModule.bind(token).toClass(NotificationTaskerPreferenceProxy, [
  SHARED_TOKENS.TASKER,
  NOTIFICATION_DI_TOKENS.NOTIFICATION_PREFERENCE_SERVICE,
  NOTIFICATION_DI_TOKENS.NOTIFICATION_METADATA_EXTRACTOR,
  SHARED_TOKENS.LOGGER,
]);

export const moduleLoader = {
  token,
  loadModule: (container: Container) => {
    container.load(moduleToken, notificationTaskerPreferenceProxyModule);
    notificationPreferenceServiceModuleLoader.loadModule(container);
    notificationMetadataExtractorModuleLoader.loadModule(container);
  },
};

