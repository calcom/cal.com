import { type Container, createModule } from "@calcom/features/di/di";
import { moduleLoader as featuresRepositoryModuleLoader } from "@calcom/features/di/modules/Features";
import { SHARED_TOKENS } from "@calcom/features/di/shared/shared.tokens";
import { DI_TOKENS } from "@calcom/features/di/tokens";

import { NotificationTaskerFactory } from "../../lib/NotificationTaskerFactory";
import { NOTIFICATION_DI_TOKENS } from "../tokens";
import { moduleLoader as notificationMetadataExtractorModuleLoader } from "./NotificationMetadataExtractor";
import { moduleLoader as notificationPreferenceServiceModuleLoader } from "./NotificationPreferenceService";

export const notificationTaskerFactoryModule = createModule();
const token = NOTIFICATION_DI_TOKENS.NOTIFICATION_TASKER_FACTORY;
const moduleToken = NOTIFICATION_DI_TOKENS.NOTIFICATION_TASKER_FACTORY_MODULE;

notificationTaskerFactoryModule.bind(token).toClass(NotificationTaskerFactory, {
  prisma: DI_TOKENS.PRISMA_CLIENT,
  preferenceService: NOTIFICATION_DI_TOKENS.NOTIFICATION_PREFERENCE_SERVICE,
  metadataExtractor: NOTIFICATION_DI_TOKENS.NOTIFICATION_METADATA_EXTRACTOR,
  logger: SHARED_TOKENS.LOGGER,
});

export const moduleLoader = {
  token,
  loadModule: (container: Container) => {
    container.load(moduleToken, notificationTaskerFactoryModule);
    notificationPreferenceServiceModuleLoader.loadModule(container);
    notificationMetadataExtractorModuleLoader.loadModule(container);
    featuresRepositoryModuleLoader.loadModule(container);
  },
};
