import type { Logger } from "tslog";

import { DI_TOKENS } from "@calcom/features/di/tokens";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import type { Tasker as ITasker } from "@calcom/features/tasker/tasker";
import type { PrismaClient } from "@calcom/prisma";

import type { INotificationMetadataExtractor } from "./NotificationMetadataExtractor";
import { NotificationPreferenceService } from "./NotificationPreferenceService";
import { NotificationTaskerPreferenceProxy } from "./NotificationTaskerPreferenceProxy";

export interface INotificationTaskerFactoryDependencies {
  prisma: PrismaClient;
  preferenceService: NotificationPreferenceService;
  metadataExtractor: INotificationMetadataExtractor;
  logger: Logger<unknown>;
}

export interface INotificationTaskerFactory {
  createProxiedTasker(tasker: ITasker): Promise<ITasker>;
}

export class NotificationTaskerFactory implements INotificationTaskerFactory {
  constructor(private readonly deps: INotificationTaskerFactoryDependencies) {}

  async createProxiedTasker(tasker: ITasker): Promise<ITasker> {
    const featuresRepository = new FeaturesRepository(this.deps.prisma);
    const isNotificationCenterEnabled = await featuresRepository.checkIfFeatureIsEnabledGlobally(
      "notification-center"
    );

    if (!isNotificationCenterEnabled) {
      return tasker;
    }

    return new NotificationTaskerPreferenceProxy(
      tasker,
      this.deps.preferenceService,
      this.deps.metadataExtractor,
      this.deps.logger
    );
  }
}

