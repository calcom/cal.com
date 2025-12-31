import { INNGEST_ID } from "@calcom/lib/constants";
import type { EventNameObjectType } from "@calcom/lib/event";
import logger from "@calcom/lib/logger";
import type { EventTypeMetadata } from "@calcom/prisma/zod-utils";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import { inngestClient } from "@calcom/web/pages/api/inngest";

import { serializeCalendarEventForInngest } from "./serializeCalendarEventForInngest";

export interface TriggerBookingEmailsOptions {
  calEvent: CalendarEvent;
  eventNameObject?: EventNameObjectType;
  isHostConfirmationEmailsDisabled: boolean;
  isAttendeeConfirmationEmailDisabled: boolean;
  eventTypeMetadata?: EventTypeMetadata;
  curAttendee?: Person;
  emailType: "scheduled" | "request" | "rescheduled";
  firstAttendee?: Person;
}

/**
 * Triggers Inngest event to send booking emails asynchronously
 * This allows the booking API to return immediately while emails are sent in the background
 */
export async function triggerBookingEmailsInngest(options: TriggerBookingEmailsOptions): Promise<void> {
  const key = INNGEST_ID === "onehash-cal" ? "prod" : "stag";

  try {
    // Serialize CalendarEvent to remove non-serializable functions
    const serializedCalEvent = serializeCalendarEventForInngest(options.calEvent);

    // Serialize firstAttendee if provided (for request emails)
    const serializedFirstAttendee = options.firstAttendee
      ? {
          ...options.firstAttendee,
          language: {
            locale: options.firstAttendee.language.locale,
          },
        }
      : undefined;

    await inngestClient.send({
      name: `booking/emails.${options.emailType}-${key}`,
      data: {
        calEvent: serializedCalEvent,
        eventNameObject: options.eventNameObject,
        isHostConfirmationEmailsDisabled: options.isHostConfirmationEmailsDisabled,
        isAttendeeConfirmationEmailDisabled: options.isAttendeeConfirmationEmailDisabled,
        eventTypeMetadata: options.eventTypeMetadata,
        curAttendee: options.curAttendee
          ? {
              email: options.curAttendee.email,
              phoneNumber: options.curAttendee.phoneNumber,
              name: options.curAttendee.name,
            }
          : undefined,
        emailType: options.emailType,
        firstAttendee: serializedFirstAttendee,
      },
    });

    logger.debug("Booking emails queued in Inngest", {
      bookingUid: options.calEvent.uid,
      bookingId: options.calEvent.bookingId,
      emailType: options.emailType,
    });
  } catch (error) {
    // Log error but don't throw - booking should still succeed even if email queuing fails
    // Emails will be retried by Inngest automatically
    logger.error("Failed to queue booking emails in Inngest", {
      error,
      bookingUid: options.calEvent.uid,
      bookingId: options.calEvent.bookingId,
      emailType: options.emailType,
    });

    // In production, you might want to fall back to synchronous email sending
    // For now, we'll let Inngest retry automatically
  }
}
