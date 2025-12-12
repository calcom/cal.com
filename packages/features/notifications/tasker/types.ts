import type { NotificationChannel, NotificationType } from "../types";

export type BaseNotificationTaskerSendData = {
  userId: number;
  teamId?: number | null;
  notificationType: NotificationType;
  channel: NotificationChannel;
};

