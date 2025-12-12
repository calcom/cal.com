import type { BaseNotificationTaskerSendData } from "./types";

export interface INotificationTasker<T extends BaseNotificationTaskerSendData = BaseNotificationTaskerSendData> {
  send(data: T): Promise<{ runId: string }>;
}

