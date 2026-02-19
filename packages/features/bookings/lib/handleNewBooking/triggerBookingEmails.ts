import { JobName, dispatcher } from "@calid/job-dispatcher";
import type { BookingEmailsJobData } from "@calid/job-engine";
import { QueueName } from "@calid/queue";

import {
  sendScheduledEmailsAndSMS,
  sendAttendeeRequestEmailAndSMS,
  sendOrganizerRequestEmail,
  sendRescheduledEmailsAndSMS,
  sendCancelledEmailsAndSMS,
} from "@calcom/emails";
import type { EventNameObjectType } from "@calcom/lib/event";
import logger from "@calcom/lib/logger";
import type { EventTypeMetadata } from "@calcom/prisma/zod-utils";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

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
 * Maps emailType to its JobName for queue routing.
 * Each email type is a separate named job so workers can
 * prioritize or scale them independently if needed.
 */
const emailTypeToJobName: Record<TriggerBookingEmailsOptions["emailType"], JobName> = {
  scheduled: JobName.BOOKING_EMAILS_SCHEDULED,
  request: JobName.BOOKING_EMAILS_REQUEST,
  rescheduled: JobName.BOOKING_EMAILS_RESCHEDULED,
  cancelled: JobName.BOOKING_EMAILS_CANCELLED,
};

/**
 * Sends booking emails asynchronously via the job dispatcher.
 * Falls back to synchronous sending if dispatch fails.
 */
export async function triggerBookingEmails(options: TriggerBookingEmailsOptions): Promise<void> {
  try {
    // Serialize CalendarEvent - strip non-serializable translate functions
    const serializedCalEvent = serializeCalendarEventForInngest(options.calEvent);

    // Serialize firstAttendee if provided (request emails only)
    const serializedFirstAttendee = options.firstAttendee
      ? {
          ...options.firstAttendee,
          language: {
            locale: options.firstAttendee.language.locale,
          },
        }
      : undefined;

    const payload: BookingEmailsJobData = {
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
    };

    const { jobId } = await dispatcher.dispatch({
      queue: QueueName.DEFAULT,
      name: emailTypeToJobName[options.emailType],
      data: payload,
      bullmqOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: {
          age: 86400, // 24 hours
          count: 100,
        },
        removeOnFail: {
          age: 604800, // 7 days
          count: 1000,
        },
      },
      // allowBlocking: true,
    });

    logger.debug("Booking emails job dispatched", {
      bookingUid: options.calEvent.uid,
      bookingId: options.calEvent.bookingId,
      emailType: options.emailType,
      jobId,
    });
  } catch (error) {
    // Log error and fall back to synchronous sending
    // Booking must not fail because email dispatch failed
    logger.error("Failed to dispatch booking emails job, falling back to synchronous sending", {
      error,
      bookingUid: options.calEvent.uid,
      bookingId: options.calEvent.bookingId,
      emailType: options.emailType,
    });

    await sendEmailsSynchronously(options);
  }
}

/**
 * Synchronous fallback - called when dispatch fails.
 * Mirrors exactly what the workflow does so behavior is identical.
 */
async function sendEmailsSynchronously(options: TriggerBookingEmailsOptions): Promise<void> {
  try {
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
        options.eventNameObject ? { eventName: options.eventNameObject.eventName } : { eventName: undefined },
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
        logger.error("Cannot send request emails synchronously: firstAttendee is required", {
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
    // Fallback also failed - log but never throw
    // Booking flow must not be blocked by email failures
    logger.error("Failed to send booking emails synchronously as fallback", {
      error: fallbackError,
      bookingUid: options.calEvent.uid,
      bookingId: options.calEvent.bookingId,
      emailType: options.emailType,
    });
  }
}
