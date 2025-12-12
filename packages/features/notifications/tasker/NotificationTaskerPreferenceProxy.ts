import type { NotificationPreferenceService } from "../services/NotificationPreferenceService";
import type { NotificationContext } from "../types";
import type { BaseNotificationTaskerSendData } from "./types";
import type { INotificationTasker } from "./INotificationTasker";

type Dependencies<T extends BaseNotificationTaskerSendData> = {
  realTasker: INotificationTasker<T>;
  notificationPreferenceService: NotificationPreferenceService;
};

export class NotificationTaskerPreferenceProxy<T extends BaseNotificationTaskerSendData>
  implements INotificationTasker<T>
{
  private readonly realTasker: INotificationTasker<T>;
  private readonly notificationPreferenceService: NotificationPreferenceService;

  constructor(deps: Dependencies<T>) {
    this.realTasker = deps.realTasker;
    this.notificationPreferenceService = deps.notificationPreferenceService;
  }

  async send(data: T): Promise<{ runId: string }> {
    const notificationContext = this.extractNotificationContext(data);
    const isEnabled = await this.notificationPreferenceService.isNotificationEnabled(notificationContext);

    if (!isEnabled) {
      return { runId: "notification-blocked-by-preference" };
    }

    return this.realTasker.send(data);
  }

  private extractNotificationContext(data: T): NotificationContext {
    return {
      userId: data.userId,
      teamId: data.teamId,
      notificationType: data.notificationType,
      channel: data.channel,
    } as NotificationContext;
  }
}

