import type {
  MeetingStartedDTO,
  MeetingEndedDTO,
  AfterHostsNoShowDTO,
  AfterGuestsNoShowDTO,
} from "../../../dto/types";
import type { WebhookPayload } from "../../types";
import { BaseMeetingPayloadBuilder } from "../../base/BaseMeetingPayloadBuilder";

/**
 * Meeting payload builder for webhook version 2021-10-20.
 *
 * This is the initial meeting webhook payload format.
 * It includes the full booking data in the payload.
 */
export class MeetingPayloadBuilder extends BaseMeetingPayloadBuilder {
  /**
   * Build the meeting webhook payload for v2021-10-20.
   */
  build(
    dto: MeetingStartedDTO | MeetingEndedDTO | AfterHostsNoShowDTO | AfterGuestsNoShowDTO
  ): WebhookPayload {
    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload: { ...dto.booking },
    };
  }
}
