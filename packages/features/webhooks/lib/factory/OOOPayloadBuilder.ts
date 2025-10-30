import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import type { OOOCreatedDTO } from "../dto/types";
import type { WebhookPayload } from "./types";

export class OOOPayloadBuilder {
  canHandle(triggerEvent: WebhookTriggerEvents): boolean {
    return triggerEvent === WebhookTriggerEvents.OOO_CREATED;
  }

  build(dto: OOOCreatedDTO): WebhookPayload {
    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload: { oooEntry: dto.oooEntry },
    };
  }
}
