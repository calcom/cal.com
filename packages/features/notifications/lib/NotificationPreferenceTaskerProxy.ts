import type { Tasker, TaskTypes, TaskPayloads } from "@calcom/features/tasker/tasker";
import type { Logger } from "tslog";
import { NotificationPreferenceService, type NotificationPreferenceCheck } from "./NotificationPreferenceService";
import type { INotificationMetadataExtractor } from "./NotificationMetadataExtractor";

export class NotificationPreferenceTaskerProxy implements Tasker {
  constructor(
    private readonly tasker: Tasker,
    private readonly preferenceService: NotificationPreferenceService,
    private readonly metadataExtractor: INotificationMetadataExtractor,
    private readonly logger: Logger
  ) {}

  async create<TaskKey extends keyof TaskPayloads>(
    type: TaskKey,
    payload: TaskPayloads[TaskKey],
    options?: { scheduledAt?: Date; maxAttempts?: number; referenceUid?: string }
  ): Promise<string> {
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
        // Return a placeholder ID to indicate skip
        return `skipped-${Date.now()}`;
      }
    }

    // If preference check passes or not a notification task, dispatch to actual tasker
    return this.tasker.create(type, payload, options);
  }

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

