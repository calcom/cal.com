import { DI_TOKENS } from "@calcom/features/di/tokens";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { TeamNotificationPreferenceRepository } from "../../repositories/TeamNotificationPreferenceRepository";

import { createModule, bindModuleToClassOnToken, type ModuleLoader } from "@calcom/features/di/di";
import { NOTIFICATION_DI_TOKENS } from "../tokens";

export const teamNotificationPreferenceRepositoryModule = createModule();
const token = NOTIFICATION_DI_TOKENS.TEAM_NOTIFICATION_PREFERENCE_REPOSITORY;
const moduleToken = NOTIFICATION_DI_TOKENS.TEAM_NOTIFICATION_PREFERENCE_REPOSITORY_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: teamNotificationPreferenceRepositoryModule,
  moduleToken,
  token,
  classs: TeamNotificationPreferenceRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

