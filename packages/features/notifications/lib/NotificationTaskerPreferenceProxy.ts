import type { Logger } from "tslog";

import type { Tasker as ITasker, TaskTypes, TaskerCreate } from "@calcom/features/tasker/tasker";

import type { INotificationMetadataExtractor } from "./NotificationMetadataExtractor";
import {
  NotificationPreferenceService,
  type NotificationPreferenceCheck,
} from "./NotificationPreferenceService";

export class NotificationTaskerPreferenceProxy implements ITasker {
  constructor(
    private readonly tasker: ITasker,
    private readonly preferenceService: NotificationPreferenceService,
    private readonly metadataExtractor: INotificationMetadataExtractor,
    private readonly logger: Logger<unknown>
  ) {}

  async create<TaskKey extends TaskTypes>(
    type: TaskKey,
    payload: Parameters<TaskerCreate>[1],
    options?: Parameters<TaskerCreate>[2]
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
    // Type assertion needed because Parameters<TaskerCreate>[1] loses the generic relationship
    return this.tasker.create(type, payload as any, options);
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
