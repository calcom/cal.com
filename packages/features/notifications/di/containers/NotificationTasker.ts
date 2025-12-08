import { createContainer } from "@calcom/features/di/di";
import { prismaModule } from "@calcom/features/di/modules/Prisma";
import { moduleLoader as loggerModuleLoader } from "@calcom/features/di/shared/services/logger.service";
import { taskerServiceModule } from "@calcom/features/di/shared/services/tasker.service";
import { SHARED_TOKENS } from "@calcom/features/di/shared/shared.tokens";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import type { Tasker as ITasker } from "@calcom/features/tasker/tasker";

import type { INotificationTaskerFactory } from "../../lib/NotificationTaskerFactory";
import { moduleLoader as notificationTaskerFactoryModuleLoader } from "../modules/NotificationTaskerFactory";
import { NOTIFICATION_DI_TOKENS } from "../tokens";

const notificationTaskerContainer = createContainer();

notificationTaskerContainer.load(DI_TOKENS.PRISMA_MODULE, prismaModule);
notificationTaskerContainer.load(SHARED_TOKENS.TASKER, taskerServiceModule);
loggerModuleLoader.loadModule(notificationTaskerContainer);
notificationTaskerFactoryModuleLoader.loadModule(notificationTaskerContainer);

export function getNotificationTaskerFactory(): INotificationTaskerFactory {
  return notificationTaskerContainer.get<INotificationTaskerFactory>(
    NOTIFICATION_DI_TOKENS.NOTIFICATION_TASKER_FACTORY
  );
}

export async function createProxiedTasker(tasker: ITasker): Promise<ITasker> {
  const factory = getNotificationTaskerFactory();
  return factory.createProxiedTasker(tasker);
}
