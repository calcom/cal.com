import { NonRetriableError } from "inngest";

import {
  sendScheduledEmailsAndSMS,
  sendAttendeeRequestEmailAndSMS,
  sendOrganizerRequestEmail,
} from "@calcom/emails";
import type { EventNameObjectType } from "@calcom/lib/event";
import logger from "@calcom/lib/logger";
import type { EventTypeMetadata } from "@calcom/prisma/zod-utils";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import type { serializeCalendarEventForInngest } from "./serializeCalendarEventForInngest";

export interface SendBookingEmailsPayload {
  calEvent: ReturnType<typeof serializeCalendarEventForInngest>;
  eventNameObject?: EventNameObjectType;
  isHostConfirmationEmailsDisabled: boolean;
  isAttendeeConfirmationEmailDisabled: boolean;
  eventTypeMetadata?: EventTypeMetadata;
  curAttendee?: {
    email?: string;
    phoneNumber?: string | null;
    name?: string;
  };
  emailType: "scheduled" | "request";
  firstAttendee?: Omit<Person, "language"> & { language: { locale: string } };
}

/**
 * Inngest handler for sending booking confirmation emails
 * This handles both confirmed bookings (scheduled emails) and pending bookings (request emails)
 */
export default async function sendBookingEmailsHandler({
  event,
  step,
  logger: inngestLogger,
}: {
  event: { data: SendBookingEmailsPayload };
  step: any;
  logger: any;
}) {
  const {
    calEvent: serializedCalEvent,
    eventNameObject,
    isHostConfirmationEmailsDisabled,
    isAttendeeConfirmationEmailDisabled,
    eventTypeMetadata,
    curAttendee,
    emailType,
    firstAttendee,
  } = event.data;

  return await step.run("send-booking-emails", async () => {
    try {
      inngestLogger.info("Sending booking emails via Inngest", {
        bookingUid: serializedCalEvent.uid,
        bookingId: serializedCalEvent.bookingId,
        emailType,
        attendeeCount: serializedCalEvent.attendees?.length || 0,
      });

      // Reconstruct CalendarEvent with translate functions for email sending
      // We need to get translations for each person's locale
      const { getTranslation } = await import("@calcom/lib/server/i18n");

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

      const calEvent: CalendarEvent = {
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

      if (emailType === "scheduled") {
        // Send confirmation emails for accepted bookings
        await sendScheduledEmailsAndSMS(
          calEvent,
          eventNameObject,
          isHostConfirmationEmailsDisabled,
          isAttendeeConfirmationEmailDisabled,
          eventTypeMetadata,
          curAttendee as Person | undefined
        );
      } else {
        // Send request emails for pending bookings
        if (firstAttendee) {
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
          throw new NonRetriableError("firstAttendee is required for request emails");
        }
      }

      logger.info("Booking emails sent successfully via Inngest", {
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
      logger.error("Failed to send booking emails via Inngest", {
        error,
        bookingUid: serializedCalEvent.uid,
        bookingId: serializedCalEvent.bookingId,
        emailType,
      });

      // If it's a non-retriable error, throw it as-is
      if (error instanceof NonRetriableError) {
        throw error;
      }

      // For other errors, wrap in NonRetriableError if it's a validation error
      // Otherwise, let Inngest retry
      if (error instanceof Error && error.message.includes("required")) {
        throw new NonRetriableError(`Failed to send booking emails: ${error.message}`);
      }

      throw error;
    }
  });
}
