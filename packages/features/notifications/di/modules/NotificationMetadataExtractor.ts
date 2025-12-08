import { type Container, createModule } from "@calcom/features/di/di";

import { DefaultNotificationMetadataExtractor } from "../../lib/DefaultNotificationMetadataExtractor";
import type { INotificationMetadataExtractor } from "../../lib/NotificationMetadataExtractor";
import { NOTIFICATION_DI_TOKENS } from "../tokens";

export const notificationMetadataExtractorModule = createModule();
const token = NOTIFICATION_DI_TOKENS.NOTIFICATION_METADATA_EXTRACTOR;
const moduleToken = NOTIFICATION_DI_TOKENS.NOTIFICATION_METADATA_EXTRACTOR_MODULE;

notificationMetadataExtractorModule.bind(token).toClass(DefaultNotificationMetadataExtractor, []);

export const moduleLoader = {
  token,
  loadModule: (container: Container) => {
    container.load(moduleToken, notificationMetadataExtractorModule);
  },
};
