import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import type {
  MeetingStartedDTO,
  MeetingEndedDTO,
  AfterHostsNoShowDTO,
  AfterGuestsNoShowDTO,
} from "../../../dto/types";
import type { WebhookPayload } from "../../types";
import { BaseMeetingPayloadBuilder } from "../../base/BaseMeetingPayloadBuilder";

/**
 * Meeting payload builder for webhook version v2021-10-20.
 *
 * Handles:
 * - MEETING_STARTED / MEETING_ENDED: Full booking data in payload
 * - AFTER_HOSTS_CAL_VIDEO_NO_SHOW / AFTER_GUESTS_CAL_VIDEO_NO_SHOW: bookingId and webhook info
 */
export class MeetingPayloadBuilder extends BaseMeetingPayloadBuilder {
  /**
   * Build the meeting webhook payload for v2021-10-20.
   */
  build(
    dto: MeetingStartedDTO | MeetingEndedDTO | AfterHostsNoShowDTO | AfterGuestsNoShowDTO
  ): WebhookPayload {
    // Handle no-show events (different payload structure)
    if (
      dto.triggerEvent === WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW ||
      dto.triggerEvent === WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW
    ) {
      const noShowDto = dto as AfterHostsNoShowDTO | AfterGuestsNoShowDTO;
      return {
        triggerEvent: dto.triggerEvent,
        createdAt: dto.createdAt,
        payload: {
          bookingId: noShowDto.bookingId,
          webhook: noShowDto.webhook,
        },
      };
    }

    // Handle meeting started/ended events
    const meetingDto = dto as MeetingStartedDTO | MeetingEndedDTO;
    return {
      triggerEvent: dto.triggerEvent,
      createdAt: dto.createdAt,
      payload: { ...meetingDto.booking },
    };
  }
}
