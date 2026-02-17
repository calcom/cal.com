import type { WebhookTriggerEvents } from "@calcom/prisma/enums";

export interface NotificationEvent {
  triggerEvent: WebhookTriggerEvents;
  payload: Record<string, unknown>;
  metadata: {
    userId?: number | null;
    teamId?: number | null;
    bookingId?: number;
    eventTypeId?: number | null;
    timestamp: string;
  };
}

export interface NotificationDeliveryResult {
  success: boolean;
  channelId: string;
  externalMessageId?: string;
  error?: string;
}

export interface ChannelConfig {
  channelType: string;
  destination: string;
  credentialId: number;
  settings?: Record<string, unknown>;
}

export interface INotificationChannel {
  readonly channelId: string;
  canHandle(event: NotificationEvent): boolean;
  send(event: NotificationEvent, config: ChannelConfig): Promise<NotificationDeliveryResult>;
}
