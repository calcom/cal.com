// packages/features/webhooks/lib/calVideoWebhooks.ts
import sendPayload from "webhooks/lib/sendPayload";

import type { Booking, EventType, User } from "@calcom/prisma/client";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";

interface CalVideoWebhookData {
  booking: Booking & {
    eventType: EventType | null;
    user: User | null;
  };
  videoSessionId: string;
  participants: Array<{
    id: string;
    name: string;
    email: string;
    joinedAt?: Date;
    leftAt?: Date;
  }>;
  duration?: number;
  recordingUrl?: string;
  videoQuality?: {
    resolution: string;
    connectionQuality: "excellent" | "good" | "fair" | "poor";
  };
}

export class CalVideoWebhookService {
  static async triggerVideoStarted(data: CalVideoWebhookData) {
    await this.sendCalVideoWebhook(WebhookTriggerEvents.CAL_VIDEO_STARTED, data);
  }

  static async triggerVideoEnded(data: CalVideoWebhookData) {
    await this.sendCalVideoWebhook(WebhookTriggerEvents.CAL_VIDEO_ENDED, data);
  }

  static async triggerRecordingStarted(data: CalVideoWebhookData) {
    await this.sendCalVideoWebhook(WebhookTriggerEvents.CAL_VIDEO_RECORDING_STARTED, data);
  }

  static async triggerRecordingReady(data: CalVideoWebhookData) {
    await this.sendCalVideoWebhook(WebhookTriggerEvents.CAL_VIDEO_RECORDING_READY, data);
  }

  private static async sendCalVideoWebhook(triggerEvent: WebhookTriggerEvents, data: CalVideoWebhookData) {
    const { booking, videoSessionId, participants, duration, recordingUrl, videoQuality } = data;

    const payload = {
      triggerEvent,
      createdAt: new Date().toISOString(),
      payload: {
        booking: {
          id: booking.id,
          uid: booking.uid,
          title: booking.title,
          startTime: booking.startTime,
          endTime: booking.endTime,
          status: booking.status,
          eventTypeId: booking.eventTypeId,
          userId: booking.userId,
        },
        eventType: booking.eventType,
        organizer: booking.user,
        calVideo: {
          sessionId: videoSessionId,
          participants,
          actualDuration: duration,
          recordingUrl,
          videoQuality,
        },
      },
    };

    try {
      await sendPayload(
        triggerEvent,
        new Date().toISOString(),
        booking.eventTypeId || booking.userId,
        payload
      );
    } catch (error) {
      console.error(`Error sending ${triggerEvent} webhook:`, error);
    }
  }
}
