import {
  allowDisablingHostConfirmationEmails,
  allowDisablingAttendeeConfirmationEmails,
} from "ee/workflows/lib/allowDisablingStandardEmails";

import dayjs from "@calcom/dayjs";
import type { Workflow as WorkflowType } from "@calcom/ee/workflows/lib/types";
import {
  sendRoundRobinRescheduledEmailsAndSMS,
  sendRoundRobinScheduledEmailsAndSMS,
  sendRoundRobinCancelledEmailsAndSMS,
  sendRescheduledEmailsAndSMS,
  sendScheduledEmailsAndSMS,
  sendOrganizerRequestEmail,
  sendAttendeeRequestEmailAndSMS,
} from "@calcom/emails";
import type { BookingType } from "@calcom/features/bookings/lib/handleNewBooking/originalRescheduledBookingUtils";
import type { EventNameObjectType } from "@calcom/lib/event";
import logger from "@calcom/lib/logger";
import { getPiiFreeCalendarEvent } from "@calcom/lib/piiFreeData";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getTranslation } from "@calcom/lib/server/i18n";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import type { DestinationCalendar, User } from "@calcom/prisma/client";
import { SchedulingType } from "@calcom/prisma/enums";
import type { EventTypeMetadata } from "@calcom/prisma/zod-utils";
import type { AdditionalInformation, CalendarEvent, Person } from "@calcom/types/Calendar";

export enum BookingSideEffectAction {
  /** For newly confirmed bookings. */
  BOOKING_CONFIRMED = "BOOKING_CONFIRMED",
  /** For bookings that have been successfully rescheduled. */
  BOOKING_RESCHEDULED = "BOOKING_RESCHEDULED",
  /** For bookings that require organizer confirmation. */
  BOOKING_REQUESTED = "BOOKING_REQUESTED",
}

export type EmailAndSmsPayload = {
  evt: CalendarEvent;
  eventType: {
    metadata?: EventTypeMetadata;
    schedulingType: SchedulingType | null;
  };
};

export type RescheduleEmailAndSmsPayload = EmailAndSmsPayload & {
  rescheduleReason?: string;
  videoMetadata: AdditionalInformation;
  users: (Pick<User, "id" | "name" | "timeZone" | "locale" | "email"> & {
    destinationCalendar: DestinationCalendar | null;
    isFixed?: boolean;
  })[];
  changedOrganizer?: boolean;
  isRescheduledByBooker: boolean;
  originalRescheduledBooking: NonNullable<BookingType>;
  additionalNotes?: string | null;
};

export type ConfirmedEmailAndSmsPayload = EmailAndSmsPayload & {
  workflows: WorkflowType[];
  eventNameObject: EventNameObjectType;
};

export type RequestedEmailAndSmsPayload = EmailAndSmsPayload & {
  attendees?: Person[];
  additionalNotes?: string | null;
};

type RescheduledSideEffectsPayload = {
  action: BookingSideEffectAction.BOOKING_RESCHEDULED;
  data: RescheduleEmailAndSmsPayload;
};

type ConfirmedSideEffectsPayload = {
  action: BookingSideEffectAction.BOOKING_CONFIRMED;
  data: ConfirmedEmailAndSmsPayload;
};

type RequestedSideEffectsPayload = {
  action: BookingSideEffectAction.BOOKING_REQUESTED;
  data: RequestedEmailAndSmsPayload;
};

export type EmailsAndSmsSideEffectsPayload =
  | RescheduledSideEffectsPayload
  | RequestedSideEffectsPayload
  | ConfirmedSideEffectsPayload;

export async function handleSendingEmailsAndSms(payload: EmailsAndSmsSideEffectsPayload) {
  const { action } = payload;

  const log = logger.getSubLogger({ prefix: ["[api] book:user:emails"] });

  switch (action) {
    /**
     * Handles notifications for a RESCHEDULED booking.
     * It includes complex logic for Round Robin scenarios where hosts might change.
     */
    case BookingSideEffectAction.BOOKING_RESCHEDULED: {
      const { data } = payload;

      const {
        evt,
        eventType: { metadata, schedulingType },

        originalRescheduledBooking,
        rescheduleReason,
        additionalNotes,
        changedOrganizer,
        videoMetadata,
        users,
        isRescheduledByBooker,
      } = data;
      const copyEvent = structuredClone(evt);
      const copyEventAdditionalInfo = {
        ...copyEvent,
        additionalInformation: videoMetadata,
        additionalNotes, // Resets back to the additionalNote input and not the override value
        cancellationReason: `$RCH$${rescheduleReason ? rescheduleReason : ""}`, // Removable code prefix to differentiate cancellation from rescheduling for email
      };
      const cancelledRRHostEvt = structuredClone(copyEventAdditionalInfo);
      logger.debug("Emails: Sending rescheduled emails for booking confirmation");

      /*
                handle emails for round robin
                  - if booked rr host is the same, then rescheduling email
                  - if new rr host is booked, then cancellation email to old host and confirmation email to new host
              */
      if (schedulingType === SchedulingType.ROUND_ROBIN) {
        const originalBookingMemberEmails: Person[] = [];

        for (const user of originalRescheduledBooking.attendees) {
          const translate = await getTranslation(user.locale ?? "en", "common");
          originalBookingMemberEmails.push({
            name: user.name,
            email: user.email,
            timeZone: user.timeZone,
            phoneNumber: user.phoneNumber,
            language: { translate, locale: user.locale ?? "en" },
          });
        }
        if (originalRescheduledBooking.user) {
          const translate = await getTranslation(originalRescheduledBooking.user.locale ?? "en", "common");
          const originalOrganizer = originalRescheduledBooking.user;

          originalBookingMemberEmails.push({
            ...originalRescheduledBooking.user,
            username: originalRescheduledBooking.user.username ?? undefined,
            timeFormat: getTimeFormatStringFromUserTimeFormat(originalRescheduledBooking.user.timeFormat),
            name: originalRescheduledBooking.user.name || "",
            language: { translate, locale: originalRescheduledBooking.user.locale ?? "en" },
          });

          if (changedOrganizer) {
            cancelledRRHostEvt.title = originalRescheduledBooking.title;
            cancelledRRHostEvt.startTime =
              dayjs(originalRescheduledBooking?.startTime).utc().format() ||
              copyEventAdditionalInfo.startTime;
            cancelledRRHostEvt.endTime =
              dayjs(originalRescheduledBooking?.endTime).utc().format() || copyEventAdditionalInfo.endTime;
            cancelledRRHostEvt.organizer = {
              email: originalOrganizer.email,
              name: originalOrganizer.name || "",
              timeZone: originalOrganizer.timeZone,
              language: { translate, locale: originalOrganizer.locale || "en" },
            };
          }
        }

        const newBookingMemberEmails: Person[] =
          copyEvent.team?.members
            .map((member) => member)
            .concat(copyEvent.organizer)
            .concat(copyEvent.attendees) || [];

        const matchOriginalMemberWithNewMember = (originalMember: Person, newMember: Person) => {
          return originalMember.email === newMember.email;
        };

        // scheduled Emails
        const newBookedMembers = newBookingMemberEmails.filter(
          (member) =>
            !originalBookingMemberEmails.find((originalMember) =>
              matchOriginalMemberWithNewMember(originalMember, member)
            )
        );
        // cancelled Emails
        const cancelledMembers = originalBookingMemberEmails.filter(
          (member) =>
            !newBookingMemberEmails.find((newMember) => matchOriginalMemberWithNewMember(member, newMember))
        );
        // rescheduled Emails
        const rescheduledMembers = newBookingMemberEmails.filter((member) =>
          originalBookingMemberEmails.find((orignalMember) =>
            matchOriginalMemberWithNewMember(orignalMember, member)
          )
        );

        sendRoundRobinRescheduledEmailsAndSMS(
          { ...copyEventAdditionalInfo, iCalUID: evt.iCalUID },
          rescheduledMembers,
          metadata
        );
        sendRoundRobinScheduledEmailsAndSMS({
          calEvent: copyEventAdditionalInfo,
          members: newBookedMembers,
          eventTypeMetadata: metadata,
        });
        const reassignedTo = users.find(
          (user) => !user.isFixed && newBookedMembers.some((member) => member.email === user.email)
        );
        sendRoundRobinCancelledEmailsAndSMS(
          cancelledRRHostEvt,
          cancelledMembers,
          metadata,
          !!reassignedTo
            ? {
                name: reassignedTo.name,
                email: reassignedTo.email,
                ...(isRescheduledByBooker && { reason: "Booker Rescheduled" }),
              }
            : undefined
        );
      } else {
        // send normal rescheduled emails (non round robin event, where organizers stay the same)
        await sendRescheduledEmailsAndSMS(
          {
            ...copyEvent,
            additionalInformation: videoMetadata,
            additionalNotes, // Resets back to the additionalNote input and not the override value
            cancellationReason: `$RCH$${rescheduleReason ? rescheduleReason : ""}`, // Removable code prefix to differentiate cancellation from rescheduling for email
          },
          metadata
        );
      }
      break;
    }

    /**
     * Handles notifications for a newly CONFIRMED booking.
     */
    case BookingSideEffectAction.BOOKING_CONFIRMED: {
      const { data } = payload;

      const {
        evt,
        eventType: { metadata },
        workflows,
        eventNameObject,
      } = data;

      // Check if standard emails are disabled by workflows or event type settings
      let isHostConfirmationEmailsDisabled = metadata?.disableStandardEmails?.confirmation?.host || false;
      if (isHostConfirmationEmailsDisabled) {
        isHostConfirmationEmailsDisabled = allowDisablingHostConfirmationEmails(workflows);
      }

      let isAttendeeConfirmationEmailDisabled =
        metadata?.disableStandardEmails?.confirmation?.attendee || false;
      if (isAttendeeConfirmationEmailDisabled) {
        isAttendeeConfirmationEmailDisabled = allowDisablingAttendeeConfirmationEmails(workflows);
      }

      await sendScheduledEmailsAndSMS(
        evt,
        eventNameObject,
        isHostConfirmationEmailsDisabled,
        isAttendeeConfirmationEmailDisabled,
        metadata
      );
      break;
    }

    /**
     * Handles notifications when a booking REQUEST is made (requires confirmation).
     */
    case BookingSideEffectAction.BOOKING_REQUESTED: {
      const { data } = payload;

      const {
        evt,
        eventType: { metadata },
        attendees,
        additionalNotes,
      } = data;
      if (!attendees || attendees.length === 0) {
        log.error("Requested action called without attendee details.");
        return;
      }
      log.debug(
        "Action: BOOKING_REQUESTED. Sending request emails.",
        safeStringify({ calEvent: getPiiFreeCalendarEvent(evt) })
      );

      const eventWithNotes = { ...evt, additionalNotes };

      await sendOrganizerRequestEmail(eventWithNotes, metadata);
      await sendAttendeeRequestEmailAndSMS(eventWithNotes, attendees[0], metadata);
      break;
    }

    default:
      log.warn("Unknown email/SMS action requested.", { action });
      break;
  }
}
