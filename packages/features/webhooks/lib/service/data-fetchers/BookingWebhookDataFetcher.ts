import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { CalendarEventBuilder } from "@calcom/features/CalendarEventBuilder";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { IWebhookDataFetcher, SubscriberContext } from "../../interface/IWebhookDataFetcher";
import type { ILogger } from "../../interface/infrastructure";
import type { BookingWebhookTaskPayload } from "../../types/webhookTask";

export class BookingWebhookDataFetcher implements IWebhookDataFetcher {
  private readonly BOOKING_TRIGGERS = new Set([
    WebhookTriggerEvents.BOOKING_CREATED,
    WebhookTriggerEvents.BOOKING_CANCELLED,
    WebhookTriggerEvents.BOOKING_RESCHEDULED,
    WebhookTriggerEvents.BOOKING_REQUESTED,
    WebhookTriggerEvents.BOOKING_REJECTED,
    WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED,
  ]);

  constructor(
    private readonly logger: ILogger,
    private readonly bookingRepository: BookingRepository
  ) {}

  canHandle(triggerEvent: WebhookTriggerEvents): boolean {
    return this.BOOKING_TRIGGERS.has(triggerEvent as never);
  }

  async fetchEventData(payload: BookingWebhookTaskPayload): Promise<Record<string, unknown> | null> {
    const { bookingUid } = payload;

    if (!bookingUid) {
      this.logger.warn("Missing bookingUid for booking webhook");
      return null;
    }

    try {
      // Fetch complete booking data with all related entities
      const booking = await this.bookingRepository.getBookingForCalEventBuilderFromUid(bookingUid);

      if (!booking) {
        this.logger.warn("Booking not found", { bookingUid });
        return null;
      }

      // Build CalendarEvent using the builder pattern (same pattern used by email/sms tasks)
      // Map oAuthClientId to platformClientId for platform metadata
      const calendarEvent = (
        await CalendarEventBuilder.fromBooking(booking, {
          platformClientId: payload.oAuthClientId ?? undefined,
          platformRescheduleUrl: payload.platformRescheduleUrl ?? undefined,
          platformCancelUrl: payload.platformCancelUrl ?? undefined,
          platformBookingUrl: payload.platformBookingUrl ?? undefined,
        })
      ).build();

      if (!calendarEvent) {
        this.logger.error("Failed to build CalendarEvent from booking", { bookingUid });
        return null;
      }

      // Return complete data needed for webhook payload building
      return {
        calendarEvent,
        booking,
        eventType: booking.eventType,
      };
    } catch (error) {
      this.logger.error("Error fetching booking data for webhook", {
        bookingUid,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  getSubscriberContext(payload: BookingWebhookTaskPayload): SubscriberContext {
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
