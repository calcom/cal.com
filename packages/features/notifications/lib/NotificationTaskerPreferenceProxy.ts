import type { Logger } from "tslog";

import type { Tasker as ITasker, TaskTypes, TaskerCreate } from "@calcom/features/tasker/tasker";

import type { INotificationMetadataExtractor } from "./NotificationMetadataExtractor";
import {
  NotificationPreferenceService,
  type NotificationPreferenceCheck,
} from "./NotificationPreferenceService";

const SKIPPED_TASK_PREFIX = "skipped";

export class NotificationTaskerPreferenceProxy implements ITasker {
  constructor(
    private readonly tasker: ITasker,
    private readonly preferenceService: NotificationPreferenceService,
    private readonly metadataExtractor: INotificationMetadataExtractor,
    private readonly logger: Logger<unknown>
  ) {}

  create: TaskerCreate = async <TaskKey extends TaskTypes>(
    type: TaskKey,
    payload: Parameters<TaskerCreate>[1],
    options?: Parameters<TaskerCreate>[2]
  ): Promise<string> => {
    const metadata = await this.metadataExtractor.extract(
      type as string,
      payload,
      options?.notificationContext
    );

    if (metadata) {
      const shouldSend = await this.preferenceService.shouldSendNotification({
        userId: metadata.userId,
        teamId: metadata.teamId,
        notificationType: metadata.notificationType,
        channel: metadata.channel,
      });

      if (!shouldSend) {
        this.logger.info("Notification skipped due to user preferences", {
          userId: metadata.userId,
          teamId: metadata.teamId,
          notificationType: metadata.notificationType,
          channel: metadata.channel,
          taskType: type,
        });

        return `${SKIPPED_TASK_PREFIX}-${Date.now()}`;
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.tasker.create(type, payload as any, options);
  };

  async cleanup(): Promise<void> {
    return this.tasker.cleanup();
  }

  async cancel(id: string): Promise<string> {
    return this.tasker.cancel(id);
  }

  async cancelWithReference(referenceUid: string, type: TaskTypes): Promise<string | null> {
    return this.tasker.cancelWithReference(referenceUid, type);
  }
}
