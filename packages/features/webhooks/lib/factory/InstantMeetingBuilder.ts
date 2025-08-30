import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import type { InstantMeetingDTO } from "../dto/types";
import type { WebhookPayload } from "./types";

export class InstantMeetingBuilder {
  canHandle(triggerEvent: WebhookTriggerEvents): boolean {
    return triggerEvent === WebhookTriggerEvents.INSTANT_MEETING;
  }

  build(dto: InstantMeetingDTO): WebhookPayload {
    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload: {
        title: dto.title,
        body: dto.body,
        icon: dto.icon,
        url: dto.url,
        actions: dto.actions,
        requireInteraction: dto.requireInteraction,
        type: dto.type,
      },
    };
  }
}
