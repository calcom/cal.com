import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { CalendarEventBuilder } from "@calcom/features/CalendarEventBuilder";
import { getKV } from "@calcom/features/di/containers/KV";
import { getTranslation } from "@calcom/i18n/server";
import { Prisma } from "@calcom/prisma/client";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type {
  FetchEventDataResult,
  IWebhookDataFetcher,
  SubscriberContext,
} from "../../interface/IWebhookDataFetcher";
import type { ILogger } from "../../interface/infrastructure";
import type { BookingWebhookTaskPayload } from "../../types/webhookTask";
import { cancelledSeatAttendeeSchema, noShowMetadataSchema } from "../../types/webhookTask";

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

  async fetchEventData(payload: BookingWebhookTaskPayload): Promise<FetchEventDataResult> {
    const { bookingUid } = payload;

    if (!bookingUid) {
      this.logger.warn("Missing bookingUid for booking webhook");
      return { data: null };
    }

    if (payload.triggerEvent === WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED) {
      return this.fetchNoShowData(payload);
    }

    try {
      // Fetch complete booking data with all related entities
      const booking = await this.bookingRepository.getBookingForCalEventBuilderFromUid(bookingUid);

      if (!booking) {
        this.logger.warn("Booking not found", { bookingUid });
        return { data: null };
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
        return { data: null };
      }

      if (payload.attendeeSeatId && payload.triggerEvent !== WebhookTriggerEvents.BOOKING_CANCELLED) {
        const attendees = calendarEvent.attendees ?? [];
        const seatAttendee = attendees.find(
          (attendee) => attendee.bookingSeat?.referenceUid === payload.attendeeSeatId
        );
        if (seatAttendee) {
          calendarEvent.attendees = [seatAttendee];
        }
      }

      // Legacy parity: recurringEvent was only included when all remaining instances
      // were cancelled. The builder always populates it from eventType, so strip it
      // for single-booking cancellations to preserve payload parity.
      if (payload.triggerEvent === WebhookTriggerEvents.BOOKING_CANCELLED && !payload.allRemainingBookings) {
        calendarEvent.recurringEvent = undefined;
      }

      // Seat cancellation: the attendee is deleted from DB before the consumer runs.
      // The producer stashes PII in short-lived KV keyed by seatReferenceUid so we
      // can reconstruct the single cancelled attendee without PII in the queue.
      if (payload.triggerEvent === WebhookTriggerEvents.BOOKING_CANCELLED && payload.attendeeSeatId) {
        const kvKey = `webhook:cancelled-seat:${payload.attendeeSeatId}`;
        let raw: string | null = null;
        try {
          raw = await getKV().get(kvKey);
        } catch (kvErr) {
          this.logger.warn("KV get failed for cancelled seat attendee, falling back to placeholder", {
            bookingUid,
            seatId: payload.attendeeSeatId,
            error: kvErr instanceof Error ? kvErr.message : String(kvErr),
          });
        }
        const t = await getTranslation("en", "common");
        if (raw) {
          let parsed: unknown;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = null;
          }
          const seatAttendee = cancelledSeatAttendeeSchema.safeParse(parsed);
          if (seatAttendee.success) {
            const locale = seatAttendee.data.locale ?? "en";
            const tLocale = locale !== "en" ? await getTranslation(locale, "common") : t;
            calendarEvent.attendees = [
              {
                email: seatAttendee.data.email,
                name: seatAttendee.data.name ?? "",
                timeZone: seatAttendee.data.timeZone,
                language: { translate: tLocale, locale },
                phoneNumber: seatAttendee.data.phoneNumber ?? undefined,
              },
            ];
            if (seatAttendee.data.cancellationReason) {
              calendarEvent.cancellationReason = seatAttendee.data.cancellationReason;
            }
          } else {
            this.logger.warn("Cancelled seat attendee KV data failed validation", {
              bookingUid,
              seatId: payload.attendeeSeatId,
            });
            calendarEvent.attendees = [
              {
                email: "",
                name: "[attendee data unavailable]",
                timeZone: "UTC",
                language: { translate: t, locale: "en" },
              },
            ];
          }
        } else {
          this.logger.warn("Cancelled seat attendee KV entry missing (TTL expired or KV unavailable)", {
            bookingUid,
            seatId: payload.attendeeSeatId,
          });
          calendarEvent.attendees = [
            {
              email: "",
              name: "[attendee data unavailable]",
              timeZone: "UTC",
              language: { translate: t, locale: "en" },
            },
          ];
        }
      }

      // For BOOKING_RESCHEDULED or BOOKING_REQUESTED (reschedule requiring confirmation),
      // fetch the original booking's details so rescheduleUid/rescheduleId are included in the payload.
      let previousBooking: {
        id: number;
        uid: string;
        startTime: Date;
        endTime: Date;
        rescheduledBy: string | null;
      } | null = null;
      if (
        (payload.triggerEvent === WebhookTriggerEvents.BOOKING_RESCHEDULED ||
          payload.triggerEvent === WebhookTriggerEvents.BOOKING_REQUESTED) &&
        (booking as Record<string, unknown>).fromReschedule
      ) {
        previousBooking = await this.bookingRepository.findPreviousBooking({
          fromReschedule: (booking as Record<string, unknown>).fromReschedule as string,
        });
      }

      // Return complete data needed for webhook payload building
      return {
        data: {
          calendarEvent,
          booking,
          eventType: booking.eventType,
          ...(previousBooking ? { previousBooking } : {}),
        },
      };
    } catch (error) {
      this.logger.error("Error fetching booking data for webhook", {
        bookingUid,
        error: error instanceof Error ? error.message : String(error),
      });
      return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
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
  private async fetchNoShowData(payload: BookingWebhookTaskPayload): Promise<FetchEventDataResult> {
    const parsed = noShowMetadataSchema.safeParse(payload.metadata);

    if (!parsed.success) {
      this.logger.warn("Missing attendeeIds in no-show metadata", {
        bookingUid: payload.bookingUid,
      });
      return { data: null };
    }

    const { attendeeIds, bookingId, locale } = parsed.data;

    try {
      const attendees = await this.bookingRepository.findAttendeeNoShowByIds({ ids: attendeeIds });

      if (attendees.length === 0) {
        this.logger.warn("No attendees found for no-show webhook", {
          bookingUid: payload.bookingUid,
          attendeeIds,
        });
        return { data: null };
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
        data: {
          noShowMessage: message,
          noShowAttendees,
          bookingId,
          bookingUid: payload.bookingUid,
        },
      };
    } catch (error) {
      this.logger.error("Error fetching no-show data for webhook", {
        bookingUid: payload.bookingUid,
        error: error instanceof Error ? error.message : String(error),
      });
      return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }
}
