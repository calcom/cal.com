import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import type { WebhookEventDTO } from "../dto/types";
import type { IWebhookPayloadFactory } from "../interface/factory";
import type { BookingPayloadBuilder } from "./BookingPayloadBuilder";
import type { FormPayloadBuilder } from "./FormPayloadBuilder";
import type { InstantMeetingBuilder } from "./InstantMeetingBuilder";
import type { MeetingPayloadBuilder } from "./MeetingPayloadBuilder";
import type { OOOPayloadBuilder } from "./OOOPayloadBuilder";
import type { RecordingPayloadBuilder } from "./RecordingPayloadBuilder";
import type { WebhookPayload } from "./types";

export class WebhookPayloadFactory implements IWebhookPayloadFactory {
  constructor(
    private readonly bookingPayloadBuilder: BookingPayloadBuilder,
    private readonly formPayloadBuilder: FormPayloadBuilder,
    private readonly oooPayloadBuilder: OOOPayloadBuilder,
    private readonly recordingPayloadBuilder: RecordingPayloadBuilder,
    private readonly meetingPayloadBuilder: MeetingPayloadBuilder,
    private readonly instantMeetingBuilder: InstantMeetingBuilder
  ) {}

  createPayload(dto: WebhookEventDTO): WebhookPayload {
    switch (dto.triggerEvent) {
      // Booking events
      case WebhookTriggerEvents.BOOKING_CREATED:
        return this.bookingPayloadBuilder.build(dto);
      case WebhookTriggerEvents.BOOKING_CANCELLED:
        return this.bookingPayloadBuilder.build(dto);
      case WebhookTriggerEvents.BOOKING_REQUESTED:
        return this.bookingPayloadBuilder.build(dto);
      case WebhookTriggerEvents.BOOKING_RESCHEDULED:
        return this.bookingPayloadBuilder.build(dto);
      case WebhookTriggerEvents.BOOKING_REJECTED:
        return this.bookingPayloadBuilder.build(dto);
      case WebhookTriggerEvents.BOOKING_PAID:
        return this.bookingPayloadBuilder.build(dto);
      case WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED:
        return this.bookingPayloadBuilder.build(dto);
      case WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED:
        return this.bookingPayloadBuilder.build(dto);

      // Form events
      case WebhookTriggerEvents.FORM_SUBMITTED:
        return this.formPayloadBuilder.build(dto);
      case WebhookTriggerEvents.FORM_SUBMITTED_NO_EVENT:
        return this.formPayloadBuilder.build(dto);

      // OOO events
      case WebhookTriggerEvents.OOO_CREATED:
        return this.oooPayloadBuilder.build(dto);

      // Recording events
      case WebhookTriggerEvents.RECORDING_READY:
        return this.recordingPayloadBuilder.build(dto);
      case WebhookTriggerEvents.RECORDING_TRANSCRIPTION_GENERATED:
        return this.recordingPayloadBuilder.build(dto);

      // Meeting events
      case WebhookTriggerEvents.MEETING_STARTED:
        return this.meetingPayloadBuilder.build(dto);
      case WebhookTriggerEvents.MEETING_ENDED:
        return this.meetingPayloadBuilder.build(dto);

      // Instant meeting events
      case WebhookTriggerEvents.INSTANT_MEETING:
        return this.instantMeetingBuilder.build(dto);

      // No-show events (special handling)
      case WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW:
      case WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW: {
        return {
          triggerEvent: dto.triggerEvent,
          createdAt: dto.createdAt,
          payload: {
            bookingId: dto.bookingId,
            webhook: dto.webhook,
          },
        };
      }

      default: {
        // TypeScript exhaustiveness check - this should never happen if all cases are covered
        const _exhaustiveCheck: never = dto;
        throw new Error(`Unsupported triggerEvent: ${JSON.stringify(_exhaustiveCheck)}`);
      }
    }
  }
}
