import type { INotificationMetadataExtractor, NotificationMetadata } from "./NotificationMetadataExtractor";

export class DefaultNotificationMetadataExtractor implements INotificationMetadataExtractor {
  extract(type: string, payload: unknown): NotificationMetadata | null {
    if (typeof payload === "string") {
      try {
        const parsed = JSON.parse(payload);
        return this.extractFromObject(type, parsed);
      } catch {
        return null;
      }
    }

    if (typeof payload === "object" && payload !== null) {
      return this.extractFromObject(type, payload);
    }

    return null;
  }

  private extractFromObject(type: string, payload: Record<string, unknown>): NotificationMetadata | null {
    const notificationTypeMap: Record<string, { notificationType: string; channel: "EMAIL" | "SMS" }> = {
      sendSms: { notificationType: "sms", channel: "SMS" },
      sendWorkflowEmails: { notificationType: "workflow_email", channel: "EMAIL" },
      sendWebhook: { notificationType: "webhook", channel: "EMAIL" },
    };

    const typeConfig = notificationTypeMap[type];
    if (!typeConfig) {
      return null;
    }

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

