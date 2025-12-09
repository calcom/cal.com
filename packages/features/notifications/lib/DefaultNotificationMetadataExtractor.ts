import { prisma } from "@calcom/prisma";

import type { INotificationMetadataExtractor, NotificationMetadata } from "./NotificationMetadataExtractor";

export class DefaultNotificationMetadataExtractor implements INotificationMetadataExtractor {
  async extract(
    type: string,
    payload: unknown,
    notificationContext?: { userId?: number | null; teamId?: number | null }
  ): Promise<NotificationMetadata | null> {
    // First, check if context was provided directly
    if (notificationContext?.userId) {
      const notificationTypeMap: Record<string, { notificationType: string; channel: "EMAIL" | "SMS" }> = {
        sendSms: { notificationType: "sms", channel: "SMS" },
        sendWorkflowEmails: { notificationType: "workflow_email", channel: "EMAIL" },
        sendWebhook: { notificationType: "webhook", channel: "EMAIL" },
      };

      const typeConfig = notificationTypeMap[type];
      if (!typeConfig) {
        return null;
      }

      return {
        userId: notificationContext.userId,
        teamId: notificationContext.teamId ?? null,
        notificationType: typeConfig.notificationType,
        channel: typeConfig.channel,
      };
    }

    // Parse payload if it's a string
    let parsedPayload: Record<string, unknown>;
    if (typeof payload === "string") {
      try {
        parsedPayload = JSON.parse(payload);
      } catch {
        return null;
      }
    } else if (typeof payload === "object" && payload !== null) {
      parsedPayload = payload as Record<string, unknown>;
    } else {
      return null;
    }

    return await this.extractFromObject(type, parsedPayload);
  }

  private async extractFromObject(
    type: string,
    payload: Record<string, unknown>
  ): Promise<NotificationMetadata | null> {
    const notificationTypeMap: Record<string, { notificationType: string; channel: "EMAIL" | "SMS" }> = {
      sendSms: { notificationType: "sms", channel: "SMS" },
      sendWorkflowEmails: { notificationType: "workflow_email", channel: "EMAIL" },
      sendWebhook: { notificationType: "webhook", channel: "EMAIL" },
    };

    const typeConfig = notificationTypeMap[type];
    if (!typeConfig) {
      return null;
    }

    // For lazy payloads (sendWorkflowEmails with bookingUid), fetch from database
    if (type === "sendWorkflowEmails" && "bookingUid" in payload && typeof payload.bookingUid === "string") {
      return this.extractFromBookingUid(payload.bookingUid, typeConfig);
    }

    // Try to extract from payload directly
    const userId = this.extractUserId(payload);
    const teamId = this.extractTeamId(payload);

    if (!userId) {
      return null;
    }

    return {
      userId,
      teamId,
      notificationType: typeConfig.notificationType,
      channel: typeConfig.channel,
    };
  }

  private async extractFromBookingUid(
    bookingUid: string,
    typeConfig: { notificationType: string; channel: "EMAIL" | "SMS" }
  ): Promise<NotificationMetadata | null> {
    try {
      // Query only the fields we need for notification context
      const booking = await prisma.booking.findUnique({
        where: { uid: bookingUid },
        select: {
          userId: true,
          eventType: {
            select: {
              teamId: true,
            },
          },
        },
      });

      if (!booking || !booking.userId) {
        return null;
      }

      return {
        userId: booking.userId,
        teamId: booking.eventType?.teamId ?? null,
        notificationType: typeConfig.notificationType,
        channel: typeConfig.channel,
      };
    } catch (error) {
      // If we can't fetch, return null (will fall back to allowing notification)
      return null;
    }
  }

  private extractUserId(payload: Record<string, unknown>): number | null {
    if (typeof payload.userId === "number") {
      return payload.userId;
    }
    if (typeof payload.user?.id === "number") {
      return payload.user.id;
    }
    if (typeof payload.booking?.userId === "number") {
      return payload.booking.userId;
    }
    return null;
  }

  private extractTeamId(payload: Record<string, unknown>): number | null {
    if (typeof payload.teamId === "number") {
      return payload.teamId;
    }
    if (typeof payload.team?.id === "number") {
      return payload.team.id;
    }
    if (typeof payload.booking?.teamId === "number") {
      return payload.booking.teamId;
    }
    return null;
  }
}
