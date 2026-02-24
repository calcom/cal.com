import type { WorkflowContext } from "@calid/job-dispatcher";

import {
  sendScheduledEmailsAndSMS,
  sendAttendeeRequestEmailAndSMS,
  sendOrganizerRequestEmail,
  sendRescheduledEmailsAndSMS,
  sendCancelledEmailsAndSMS,
} from "@calcom/emails";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import type { BookingEmailsJobData } from "./type";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Reconstructs a CalendarEvent with translate functions from a serialized event.
 * Serialized events have locale strings instead of translate functions - this
 * restores them for email sending.
 */
async function reconstructCalendarEvent(
  serializedCalEvent: BookingEmailsJobData["calEvent"]
): Promise<CalendarEvent> {
  const organizerTranslate = await getTranslation(serializedCalEvent.organizer.language.locale, "common");

  const reconstructedTeam = serializedCalEvent.team
    ? {
        name: serializedCalEvent.team.name,
        id: serializedCalEvent.team.id,
        members: await Promise.all(
          serializedCalEvent.team.members.map(async (member) => {
            const translate = await getTranslation(member.language.locale, "common");
            return {
              ...member,
              language: {
                translate,
                locale: member.language.locale,
              },
            };
          })
        ),
      }
    : undefined;

  return {
    ...serializedCalEvent,
    organizer: {
      ...serializedCalEvent.organizer,
      language: {
        translate: organizerTranslate,
        locale: serializedCalEvent.organizer.language.locale,
      },
    },
    attendees: await Promise.all(
      serializedCalEvent.attendees.map(async (attendee) => {
        const translate = await getTranslation(attendee.language.locale, "common");
        return {
          ...attendee,
          language: {
            translate,
            locale: attendee.language.locale,
          },
        };
      })
    ),
    ...(reconstructedTeam ? { team: reconstructedTeam } : {}),
  };
}

// ============================================================================
// MAIN WORKFLOW EXPORT
// ============================================================================

export async function bookingEmailsService(
  ctx: WorkflowContext,
  payload: BookingEmailsJobData
): Promise<{ success: boolean; message: string; bookingUid?: string; emailType: string }> {
  const {
    calEvent: serializedCalEvent,
    eventNameObject,
    isHostConfirmationEmailsDisabled,
    isAttendeeConfirmationEmailDisabled,
    eventTypeMetadata,
    curAttendee,
    emailType,
    firstAttendee,
  } = payload;

  ctx.log(`Sending booking ${emailType} emails for booking: ${serializedCalEvent.uid}`);

  return await ctx.run("send-booking-emails", async () => {
    try {
      logger.info("Sending booking emails", {
        bookingUid: serializedCalEvent.uid,
        bookingId: serializedCalEvent.bookingId,
        emailType,
        attendeeCount: serializedCalEvent.attendees?.length || 0,
      });

      // Reconstruct CalendarEvent with translate functions
      const calEvent = await reconstructCalendarEvent(serializedCalEvent);

      if (emailType === "scheduled") {
        await sendScheduledEmailsAndSMS(
          calEvent,
          eventNameObject,
          isHostConfirmationEmailsDisabled,
          isAttendeeConfirmationEmailDisabled,
          eventTypeMetadata,
          curAttendee as Person | undefined
        );
      } else if (emailType === "rescheduled") {
        await sendRescheduledEmailsAndSMS(calEvent, eventTypeMetadata);
      } else if (emailType === "cancelled") {
        await sendCancelledEmailsAndSMS(
          calEvent,
          eventNameObject ? { eventName: eventNameObject.eventName } : { eventName: undefined },
          eventTypeMetadata
        );
      } else if (emailType === "request") {
        if (!firstAttendee) {
          throw new Error("firstAttendee is required for request emails");
        }

        // Reconstruct firstAttendee with translate function
        const attendeeTranslate = await getTranslation(firstAttendee.language.locale, "common");
        const attendeeWithTranslate: Person = {
          ...firstAttendee,
          language: {
            translate: attendeeTranslate,
            locale: firstAttendee.language.locale,
          },
        };

        await sendOrganizerRequestEmail(calEvent, eventTypeMetadata);
        await sendAttendeeRequestEmailAndSMS(calEvent, attendeeWithTranslate, eventTypeMetadata);
      } else {
        throw new Error(`Unknown emailType: ${emailType}`);
      }

      logger.info("Booking emails sent successfully", {
        bookingUid: calEvent.uid,
        bookingId: calEvent.bookingId,
        emailType,
      });

      return {
        success: true,
        message: `Booking ${emailType} emails sent`,
        bookingUid: calEvent.uid,
        emailType,
      };
    } catch (error) {
      logger.error("Failed to send booking emails", {
        error,
        bookingUid: serializedCalEvent.uid,
        bookingId: serializedCalEvent.bookingId,
        emailType,
      });

      // Validation errors are non-retriable
      if (error instanceof Error && error.message.includes("required")) {
        throw new Error(`NON_RETRIABLE: Failed to send booking emails: ${error.message}`);
      }

      throw error;
    }
  });
}
