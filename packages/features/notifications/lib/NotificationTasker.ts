import type { Logger } from "tslog";

import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import type { Tasker } from "@calcom/features/tasker/tasker";
import type { PrismaClient } from "@calcom/prisma";

import { NotificationPreferenceRepository } from "../repositories/NotificationPreferenceRepository";
import type { INotificationMetadataExtractor } from "./NotificationMetadataExtractor";
import { NotificationPreferenceService } from "./NotificationPreferenceService";
import { NotificationTaskerPreferenceProxy } from "./NotificationTaskerPreferenceProxy";

export class NotificationTaskerPreferenceFactory {
  static async createProxiedTasker(
    tasker: Tasker,
    prisma: PrismaClient,
    logger: Logger<unknown>,
    metadataExtractor: INotificationMetadataExtractor
  ): Promise<Tasker> {
    const featuresRepository = new FeaturesRepository(prisma);
    const isNotificationCenterEnabled = await featuresRepository.checkIfFeatureIsEnabledGlobally(
      "notification-center"
    );

    // If notification center is not enabled globally, return the original tasker
    if (!isNotificationCenterEnabled) {
      return tasker;
    }

    const repository = new NotificationPreferenceRepository(prisma);
    const preferenceService = new NotificationPreferenceService(repository);

    return new NotificationTaskerPreferenceProxy(tasker, preferenceService, metadataExtractor, logger);
  }
}
