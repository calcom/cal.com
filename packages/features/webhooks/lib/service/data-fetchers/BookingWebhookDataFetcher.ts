import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { CalendarEventBuilder } from "@calcom/features/CalendarEventBuilder";
import { getTranslation } from "@calcom/i18n/server";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { IWebhookDataFetcher, SubscriberContext } from "../../interface/IWebhookDataFetcher";
import type { ILogger } from "../../interface/infrastructure";
import type { BookingWebhookTaskPayload } from "../../types/webhookTask";
import { noShowMetadataSchema } from "../../types/webhookTask";

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

    if (payload.triggerEvent === WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED) {
      return this.fetchNoShowData(payload);
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
      // Pass attendeeSeatId so the builder can resolve the correct seat without email-matching
      const calendarEvent = (
        await CalendarEventBuilder.fromBooking(booking, {
          platformClientId: payload.oAuthClientId ?? undefined,
          platformRescheduleUrl: payload.platformRescheduleUrl ?? undefined,
          platformCancelUrl: payload.platformCancelUrl ?? undefined,
          platformBookingUrl: payload.platformBookingUrl ?? undefined,
          attendeeSeatId: payload.attendeeSeatId,
          hashedLink: payload.hashedLink ?? undefined,
        })
      ).build();

      if (!calendarEvent) {
        this.logger.error("Failed to build CalendarEvent from booking", { bookingUid });
        return null;
      }

      // For BOOKING_RESCHEDULED, fetch the original booking's details
      let previousBooking: {
        id: number;
        uid: string;
        startTime: Date;
        endTime: Date;
        rescheduledBy: string | null;
      } | null = null;
      if (
        payload.triggerEvent === WebhookTriggerEvents.BOOKING_RESCHEDULED &&
        (booking as Record<string, unknown>).fromReschedule
      ) {
        previousBooking = await this.bookingRepository.findPreviousBooking({
          fromReschedule: (booking as Record<string, unknown>).fromReschedule as string,
        });
      }

      // Return complete data needed for webhook payload building
      return {
        calendarEvent,
        booking,
        eventType: booking.eventType,
        ...(previousBooking ? { previousBooking } : {}),
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

  /**
   * Resolves attendee PII from DB using only the attendeeIds passed through the queue.
   * By the time this runs the attendee.noShow flags have already been persisted.
   */
  private async fetchNoShowData(payload: BookingWebhookTaskPayload): Promise<Record<string, unknown> | null> {
    const parsed = noShowMetadataSchema.safeParse(payload.metadata);

    if (!parsed.success) {
      this.logger.warn("Missing attendeeIds in no-show metadata", {
        bookingUid: payload.bookingUid,
      });
      return null;
    }

    const { attendeeIds, bookingId, locale } = parsed.data;

    try {
      const attendees = await this.bookingRepository.findAttendeeNoShowByIds({ ids: attendeeIds });

      if (attendees.length === 0) {
        this.logger.warn("No attendees found for no-show webhook", {
          bookingUid: payload.bookingUid,
          attendeeIds,
        });
        return null;
      }

      const t = await getTranslation(locale ?? "en", "common");
      let message: string;
      if (attendees.length === 1) {
        const [attendee] = attendees;
        message = t(attendee.noShow ? "x_marked_as_no_show" : "x_unmarked_as_no_show", {
          x: attendee.email ?? "User",
        });
      } else {
        message = t("no_show_updated");
      }

      const noShowAttendees = attendees.map((a) => ({ email: a.email, noShow: a.noShow }));

      return {
        noShowMessage: message,
        noShowAttendees,
        bookingId,
        bookingUid: payload.bookingUid,
      };
    } catch (error) {
      this.logger.error("Error fetching no-show data for webhook", {
        bookingUid: payload.bookingUid,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }
}
