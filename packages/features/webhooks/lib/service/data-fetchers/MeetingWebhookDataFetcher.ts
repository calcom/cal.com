import { ALL_APPS } from "@calcom/app-store/utils";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import {
  bookingMetadataSchema,
  bookingResponses as bookingResponsesSchema,
  customInputSchema,
  eventTypeBookingFields,
} from "@calcom/prisma/zod-utils";
import { z } from "zod";

const APP_TYPE_TO_NAME_MAP = new Map<string, string>(ALL_APPS.map((app) => [app.type, app.name]));

import type {
  FetchEventDataResult,
  IWebhookDataFetcher,
  SubscriberContext,
} from "../../interface/IWebhookDataFetcher";
import type { ILogger } from "../../interface/infrastructure";
import type { MeetingWebhookTaskPayload } from "../../types/webhookTask";

/**
 * Data fetcher for MEETING_STARTED / MEETING_ENDED webhooks.
 *
 * Returns the raw Prisma booking with getCalEventResponses applied,
 * matching the legacy scheduleTrigger → handleWebhookScheduledTriggers format.
 * CalendarEventBuilder is intentionally NOT used here — the production payload
 * is the raw booking, not a CalendarEvent.
 */
export class MeetingWebhookDataFetcher implements IWebhookDataFetcher {
  private readonly MEETING_TRIGGERS = new Set([
    WebhookTriggerEvents.MEETING_STARTED,
    WebhookTriggerEvents.MEETING_ENDED,
  ]);

  constructor(
    private readonly logger: ILogger,
    private readonly bookingRepository: BookingRepository
  ) {}

  canHandle(triggerEvent: WebhookTriggerEvents): boolean {
    // Cast needed: Set is inferred as Set<"MEETING_STARTED" | "MEETING_ENDED">
    // but canHandle receives the full WebhookTriggerEvents enum
    return this.MEETING_TRIGGERS.has(triggerEvent as never);
  }

  async fetchEventData(payload: MeetingWebhookTaskPayload): Promise<FetchEventDataResult> {
    const { bookingUid } = payload;

    if (!bookingUid) {
      this.logger.warn("Missing bookingUid for meeting webhook");
      return { data: null };
    }

    try {
      const booking = await this.bookingRepository.findBookingForMeetingWebhook(bookingUid);

      if (!booking) {
        this.logger.warn("Booking not found for meeting webhook", { bookingUid });
        return { data: null };
      }

      // Parse JSON fields from Prisma into typed values, falling back gracefully on invalid data
      const parsedResponses = bookingResponsesSchema.safeParse(booking.responses);
      const responses = parsedResponses.success ? parsedResponses.data : null;

      const parsedMetadata = bookingMetadataSchema.safeParse(booking.metadata);
      const metadata = parsedMetadata.success ? parsedMetadata.data : null;

      const parsedCustomInputs = z.array(customInputSchema).safeParse(booking.customInputs);
      const customInputs = parsedCustomInputs.success ? parsedCustomInputs.data : [];

      const parsedBookingFields = eventTypeBookingFields
        .nullable()
        .safeParse(booking.eventType?.bookingFields ?? null);
      const bookingFields = parsedBookingFields.success ? parsedBookingFields.data : null;

      // Apply getCalEventResponses to match the legacy payload format
      // (responses become { label, value, isHidden } structures)
      let calEventResponses: Record<string, unknown> = {};
      try {
        calEventResponses = getCalEventResponses({
          bookingFields,
          booking,
        });
      } catch {
        this.logger.warn("Failed to build calEventResponses for meeting webhook, using raw responses", {
          bookingUid,
        });
      }

      // Reconstruct appsStatus from booking references
      // (same logic as CalendarEventBuilder.fromBooking)
      const appsStatus = booking.references
        .filter((r) => r && r.type)
        .map((ref) => ({
          appName: APP_TYPE_TO_NAME_MAP.get(ref.type) || ref.type.replace("_", "-"),
          type: ref.type,
          success: ref.uid ? 1 : 0,
          failures: ref.uid ? 0 : 1,
          errors: [] as string[],
        }));

      // Return raw booking spread with calEventResponses, matching the legacy
      // scheduleTrigger format: { triggerEvent, ...booking, ...calEventResponses }
      return {
        data: {
          ...booking,
          responses,
          metadata,
          customInputs,
          eventType: booking.eventType ? { ...booking.eventType, bookingFields } : null,
          ...calEventResponses,
          userUuid: booking.user?.uuid ?? null,
          ...(appsStatus.length > 0 ? { appsStatus } : {}),
        } as Record<string, unknown>,
      };
    } catch (error) {
      this.logger.error("Error fetching meeting webhook data", {
        bookingUid,
        error: error instanceof Error ? error.message : String(error),
      });
      return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }

  getSubscriberContext(payload: MeetingWebhookTaskPayload): SubscriberContext {
    return {
      triggerEvent: payload.triggerEvent,
      userId: payload.userId,
      eventTypeId: payload.eventTypeId,
      teamId: payload.teamId,
      orgId: payload.orgId,
      oAuthClientId: payload.oAuthClientId,
    };
  }
}
