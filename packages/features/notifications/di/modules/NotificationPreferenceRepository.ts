import { type Container, createModule } from "@calcom/features/di/di";
import { DI_TOKENS } from "@calcom/features/di/tokens";

import { NotificationPreferenceRepository } from "../../repositories/NotificationPreferenceRepository";
import { NOTIFICATION_DI_TOKENS } from "../tokens";

export const notificationPreferenceRepositoryModule = createModule();
const token = NOTIFICATION_DI_TOKENS.NOTIFICATION_PREFERENCE_REPOSITORY;
const moduleToken = NOTIFICATION_DI_TOKENS.NOTIFICATION_PREFERENCE_REPOSITORY_MODULE;

notificationPreferenceRepositoryModule
  .bind(token)
  .toClass(NotificationPreferenceRepository, [DI_TOKENS.PRISMA_CLIENT]);

export const moduleLoader = {
  token,
  loadModule: (container: Container) => {
    container.load(moduleToken, notificationPreferenceRepositoryModule);
  },
};
