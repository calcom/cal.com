import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import type { MeetingStartedDTO, MeetingEndedDTO } from "../dto/types";
import type { WebhookPayload } from "./types";

export class MeetingPayloadBuilder {
  canHandle(triggerEvent: WebhookTriggerEvents): boolean {
    return (
      triggerEvent === WebhookTriggerEvents.MEETING_STARTED ||
      triggerEvent === WebhookTriggerEvents.MEETING_ENDED
    );
  }

  build(dto: MeetingStartedDTO | MeetingEndedDTO): WebhookPayload {
    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload: { ...dto.booking },
    };
  }
}
