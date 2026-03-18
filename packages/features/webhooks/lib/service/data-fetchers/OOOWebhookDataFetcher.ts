import type { PrismaOOORepository } from "@calcom/features/ooo/repositories/PrismaOOORepository";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import dayjs from "@calcom/dayjs";

import type { IWebhookDataFetcher, SubscriberContext } from "../../interface/IWebhookDataFetcher";
import type { ILogger } from "../../interface/infrastructure";
import type { OOOWebhookTaskPayload } from "../../types/webhookTask";
import { oooMetadataSchema } from "../../types/webhookTask";

export class OOOWebhookDataFetcher implements IWebhookDataFetcher {
  constructor(
    private readonly logger: ILogger,
    private readonly oooRepository: PrismaOOORepository
  ) {}

  canHandle(triggerEvent: WebhookTriggerEvents): boolean {
    return triggerEvent === WebhookTriggerEvents.OOO_CREATED;
  }

  async fetchEventData(payload: OOOWebhookTaskPayload): Promise<Record<string, unknown> | null> {
    const { oooEntryId } = payload;

    try {
      const entry = await this.oooRepository.findByIdForWebhook(oooEntryId);

      if (!entry) {
        this.logger.warn("OOO entry not found", { oooEntryId });
        return null;
      }

      const userTimeZone = entry.user.timeZone;

      const oooEntry = {
        id: entry.id,
        uuid: entry.uuid,
        start: dayjs(entry.start).tz(userTimeZone, true).format("YYYY-MM-DDTHH:mm:ssZ"),
        end: dayjs(entry.end).tz(userTimeZone, true).format("YYYY-MM-DDTHH:mm:ssZ"),
        createdAt: entry.createdAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString(),
        notes: entry.notes,
        reason: {
          emoji: entry.reason?.emoji,
          reason: entry.reason?.reason,
        },
        reasonId: entry.reasonId ?? 0,
        user: {
          id: entry.user.id,
          name: entry.user.name,
          username: entry.user.username,
          email: entry.user.email,
          timeZone: entry.user.timeZone,
        },
        toUser: entry.toUser
          ? {
              id: entry.toUser.id,
              name: entry.toUser.name,
              username: entry.toUser.username,
              email: entry.toUser.email,
              timeZone: entry.toUser.timeZone,
            }
          : null,
      };

      return { oooEntry };
    } catch (error) {
      this.logger.error("Error fetching OOO data for webhook", {
        oooEntryId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  getSubscriberContext(payload: OOOWebhookTaskPayload): SubscriberContext {
    const parsed = oooMetadataSchema.safeParse(payload.metadata);
    const meta = parsed.success ? parsed.data : undefined;

    return {
      triggerEvent: payload.triggerEvent,
      userId: payload.userId,
      eventTypeId: undefined,
      teamId: meta?.teamIds ?? payload.teamId ?? undefined,
      orgId: meta?.orgId ?? undefined,
      oAuthClientId: payload.oAuthClientId,
    };
  }
}
