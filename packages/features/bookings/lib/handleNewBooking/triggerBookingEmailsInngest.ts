import {
  sendScheduledEmailsAndSMS,
  sendAttendeeRequestEmailAndSMS,
  sendOrganizerRequestEmail,
  sendRescheduledEmailsAndSMS,
  sendCancelledEmailsAndSMS,
} from "@calcom/emails";
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
  emailType: "scheduled" | "request" | "rescheduled" | "cancelled";
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
    // Log error and fall back to synchronous email sending
    logger.error("Failed to queue booking emails in Inngest, falling back to synchronous sending", {
      error,
      bookingUid: options.calEvent.uid,
      bookingId: options.calEvent.bookingId,
      emailType: options.emailType,
    });

    try {
      // Fallback to synchronous email sending if Inngest fails
      if (options.emailType === "scheduled") {
        await sendScheduledEmailsAndSMS(
          options.calEvent,
          options.eventNameObject,
          options.isHostConfirmationEmailsDisabled,
          options.isAttendeeConfirmationEmailDisabled,
          options.eventTypeMetadata,
          options.curAttendee
        );
      } else if (options.emailType === "rescheduled") {
        await sendRescheduledEmailsAndSMS(options.calEvent, options.eventTypeMetadata);
      } else if (options.emailType === "cancelled") {
        await sendCancelledEmailsAndSMS(
          options.calEvent,
          options.eventNameObject
            ? { eventName: options.eventNameObject.eventName }
            : { eventName: undefined },
          options.eventTypeMetadata
        );
      } else if (options.emailType === "request") {
        if (options.firstAttendee) {
          await sendOrganizerRequestEmail(options.calEvent, options.eventTypeMetadata);
          await sendAttendeeRequestEmailAndSMS(
            options.calEvent,
            options.firstAttendee,
            options.eventTypeMetadata
          );
        } else {
          logger.error("Cannot send request emails: firstAttendee is required", {
            bookingUid: options.calEvent.uid,
            bookingId: options.calEvent.bookingId,
          });
        }
      }

      logger.info("Booking emails sent synchronously as fallback", {
        bookingUid: options.calEvent.uid,
        bookingId: options.calEvent.bookingId,
        emailType: options.emailType,
      });
    } catch (fallbackError) {
      // If fallback also fails, log but don't throw - booking should still succeed
      logger.error("Failed to send booking emails synchronously as fallback", {
        error: fallbackError,
        bookingUid: options.calEvent.uid,
        bookingId: options.calEvent.bookingId,
        emailType: options.emailType,
      });
    }
  }
}
