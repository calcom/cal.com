import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import type { WebhookEventDTO } from "../dto/types";
import type { BookingPayloadBuilder } from "../factory/BookingPayloadBuilder";
import type { FormPayloadBuilder } from "../factory/FormPayloadBuilder";
import type { InstantMeetingBuilder } from "../factory/InstantMeetingBuilder";
import type { MeetingPayloadBuilder } from "../factory/MeetingPayloadBuilder";
import type { OOOPayloadBuilder } from "../factory/OOOPayloadBuilder";
import type { RecordingPayloadBuilder } from "../factory/RecordingPayloadBuilder";
import type { WebhookPayload } from "../factory/types";
import type { ILogger } from "../interface/infrastructure";
import type { IWebhookService } from "../interface/services";
import type { IWebhookNotificationHandler } from "../interface/webhook";

export class WebhookNotificationHandler implements IWebhookNotificationHandler {
  private readonly log: ILogger;

  constructor(
    private readonly webhookService: IWebhookService,
    private readonly bookingPayloadBuilder: BookingPayloadBuilder,
    private readonly formPayloadBuilder: FormPayloadBuilder,
    private readonly oooPayloadBuilder: OOOPayloadBuilder,
    private readonly recordingPayloadBuilder: RecordingPayloadBuilder,
    private readonly meetingPayloadBuilder: MeetingPayloadBuilder,
    private readonly instantMeetingBuilder: InstantMeetingBuilder,
    logger: ILogger
  ) {
    this.log = logger.getSubLogger({ prefix: ["[WebhookNotificationHandler]"] });
  }

  async handleNotification(dto: WebhookEventDTO, isDryRun = false): Promise<void> {
    const trigger = dto.triggerEvent;

    try {
      if (isDryRun) {
        this.log.debug(`Dry run mode - skipping webhook notification for: ${trigger}`);
        return;
      }

      const subscriptionParams = {
        userId: dto.userId,
        eventTypeId: dto.eventTypeId,
        triggerEvent: trigger,
        teamId: dto.teamId,
        orgId: dto.orgId,
        oAuthClientId: dto.platformClientId,
      };

      this.log.debug(`Querying for webhook subscribers with params:`, subscriptionParams);

      const subscribers = await this.webhookService.getSubscribers(subscriptionParams);

      if (subscribers.length === 0) {
        this.log.debug(`No subscribers found for event: ${trigger}`, {
          bookingId: dto.bookingId,
          eventTypeId: dto.eventTypeId,
        });
        return;
      }

      const webhookPayload = this.createPayload(dto);

      await this.webhookService.processWebhooks(trigger, webhookPayload, subscribers);

      this.log.debug(`Successfully processed webhook notification: ${trigger}`, {
        subscriberCount: subscribers.length,
        bookingId: dto.bookingId,
      });
    } catch (error) {
      this.log.error(`Error handling webhook notification: ${trigger}`, {
        error: error instanceof Error ? error.message : String(error),
        bookingId: dto.bookingId,
        eventTypeId: dto.eventTypeId,
      });
      throw error;
    }
  }

  private createPayload(dto: WebhookEventDTO): WebhookPayload {
    switch (dto.triggerEvent) {
      // Booking events
      case WebhookTriggerEvents.BOOKING_CREATED:
      case WebhookTriggerEvents.BOOKING_CANCELLED:
      case WebhookTriggerEvents.BOOKING_REQUESTED:
      case WebhookTriggerEvents.BOOKING_RESCHEDULED:
      case WebhookTriggerEvents.BOOKING_REJECTED:
      case WebhookTriggerEvents.BOOKING_PAID:
      case WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED:
      case WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED:
        return this.bookingPayloadBuilder.build(dto);

      // Form events
      case WebhookTriggerEvents.FORM_SUBMITTED:
      case WebhookTriggerEvents.FORM_SUBMITTED_NO_EVENT:
        return this.formPayloadBuilder.build(dto);

      // OOO events
      case WebhookTriggerEvents.OOO_CREATED:
        return this.oooPayloadBuilder.build(dto);

      // Recording events
      case WebhookTriggerEvents.RECORDING_READY:
      case WebhookTriggerEvents.RECORDING_TRANSCRIPTION_GENERATED:
        return this.recordingPayloadBuilder.build(dto);

      // Meeting events
      case WebhookTriggerEvents.MEETING_STARTED:
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

      case WebhookTriggerEvents.DELEGATION_CREDENTIAL_ERROR: {
        return {
          triggerEvent: dto.triggerEvent,
          createdAt: dto.createdAt,
          payload: {
            error: dto.error,
            credential: dto.credential,
            user: dto.user,
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
