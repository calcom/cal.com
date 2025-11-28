import type { PrismaClient } from "@calcom/prisma";
import type { Tasker } from "@calcom/features/tasker/tasker";
import type { Logger } from "tslog";
import { NotificationPreferenceRepository } from "../repositories/NotificationPreferenceRepository";
import { NotificationPreferenceService } from "./NotificationPreferenceService";
import { NotificationPreferenceTaskerProxy } from "./NotificationPreferenceTaskerProxy";
import type { INotificationMetadataExtractor } from "./NotificationMetadataExtractor";

export class NotificationPreferenceTaskerFactory {
  static createProxiedTasker(
    tasker: Tasker,
    prisma: PrismaClient,
    logger: Logger,
    metadataExtractor: INotificationMetadataExtractor
  ): Tasker {
    const repository = new NotificationPreferenceRepository(prisma);
    const preferenceService = new NotificationPreferenceService(repository);

    return new NotificationPreferenceTaskerProxy(tasker, preferenceService, metadataExtractor, logger);
  }
}

