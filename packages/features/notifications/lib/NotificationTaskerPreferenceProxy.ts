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
    try {
      // Extract notification metadata
      const metadata = this.metadataExtractor.extract(type as string, payload);

      if (metadata) {
        // Check preferences before dispatching
        const shouldSend = await this.preferenceService.shouldSendNotification({
          userId: metadata.userId,
          teamId: metadata.teamId,
          notificationType: metadata.notificationType,
          channel: metadata.channel,
        });

        if (!shouldSend) {
          // Log skipped notification for observability
          this.logger.info("Notification skipped due to user preferences", {
            userId: metadata.userId,
            teamId: metadata.teamId,
            notificationType: metadata.notificationType,
            channel: metadata.channel,
            taskType: type,
          });

          // Return a placeholder ID to indicate skip
          return `${SKIPPED_TASK_PREFIX}-${Date.now()}`;
        }
      }

      // If preference check passes or not a notification task, dispatch to actual tasker
      // Type assertion is necessary here because Parameters<TaskerCreate>[1] loses the generic
      // relationship between TaskKey and the payload type. At runtime, the payload is guaranteed
      // to match TaskPayloads[TaskKey] since both come from the same TaskerCreate signature.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return this.tasker.create(type, payload as any, options);
    } catch (error) {
      // Log error but don't fail silently - rethrow to maintain error propagation
      this.logger.error("Error in notification preference proxy", {
        error,
        taskType: type,
        hasMetadata: !!this.metadataExtractor.extract(type as string, payload),
      });
      throw error;
    }
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
