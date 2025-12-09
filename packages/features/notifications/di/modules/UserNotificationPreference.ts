import { DI_TOKENS } from "@calcom/features/di/tokens";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { UserNotificationPreferenceRepository } from "../../repositories/UserNotificationPreferenceRepository";

import { createModule, bindModuleToClassOnToken, type ModuleLoader } from "@calcom/features/di/di";
import { NOTIFICATION_DI_TOKENS } from "../tokens";

export const userNotificationPreferenceRepositoryModule = createModule();
const token = NOTIFICATION_DI_TOKENS.USER_NOTIFICATION_PREFERENCE_REPOSITORY;
const moduleToken = NOTIFICATION_DI_TOKENS.USER_NOTIFICATION_PREFERENCE_REPOSITORY_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: userNotificationPreferenceRepositoryModule,
  moduleToken,
  token,
  classs: UserNotificationPreferenceRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

