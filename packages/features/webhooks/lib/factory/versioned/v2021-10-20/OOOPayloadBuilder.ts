import type { OOOCreatedDTO } from "../../../dto/types";
import type { WebhookPayload } from "../../types";
import { BaseOOOPayloadBuilder } from "../../base/BaseOOOPayloadBuilder";

/**
 * OOO (Out of Office) payload builder for webhook version 2021-10-20.
 *
 * This is the initial OOO webhook payload format.
 * It includes the OOO entry data in the payload.
 */
export class OOOPayloadBuilder extends BaseOOOPayloadBuilder {
  /**
   * Build the OOO webhook payload for v2021-10-20.
   */
  build(dto: OOOCreatedDTO): WebhookPayload {
    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload: { oooEntry: dto.oooEntry },
    };
  }
}
