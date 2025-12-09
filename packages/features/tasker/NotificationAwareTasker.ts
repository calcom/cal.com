import type { NotificationPreferenceService } from "@calcom/features/notifications/services/NotificationPreferenceService";

import type { Tasker, TaskerCreate, TaskTypes } from "./tasker";

type Dependencies = {
  tasker: Tasker;
  notificationPreferenceService: NotificationPreferenceService;
};

export class NotificationAwareTasker implements Tasker {
  private readonly tasker: Tasker;
  private readonly notificationPreferenceService: NotificationPreferenceService;

  constructor(deps: Dependencies) {
    this.tasker = deps.tasker;
    this.notificationPreferenceService = deps.notificationPreferenceService;
  }

  create: TaskerCreate = async (type, payload, options = {}) => {
    const { notificationContext, ...restOptions } = options;

    if (notificationContext) {
      const isEnabled = await this.notificationPreferenceService.isNotificationEnabled(notificationContext);

      if (!isEnabled) {
        return Promise.resolve("");
      }
    }

    return this.tasker.create(type, payload, restOptions);
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
