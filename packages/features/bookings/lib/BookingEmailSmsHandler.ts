import { default as cloneDeep } from "lodash/cloneDeep";
import type { Logger } from "tslog";

import dayjs from "@calcom/dayjs";
import {
  allowDisablingHostConfirmationEmails,
  allowDisablingAttendeeConfirmationEmails,
} from "@calcom/ee/workflows/lib/allowDisablingStandardEmails";
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
import { getPiiFreeCalendarEvent } from "@calcom/lib/piiFreeData";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getTranslation } from "@calcom/lib/server/i18n";
import { getTimeFormatStringFromUserTimeFormat } from "@calcom/lib/timeFormat";
import type { DestinationCalendar, User } from "@calcom/prisma/client";
import { SchedulingType } from "@calcom/prisma/enums";
import type { EventTypeMetadata } from "@calcom/prisma/zod-utils";
import type { AdditionalInformation, CalendarEvent, Person } from "@calcom/types/Calendar";

export enum BookingState {
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
  action: BookingState.BOOKING_RESCHEDULED;
  data: RescheduleEmailAndSmsPayload;
};

type ConfirmedSideEffectsPayload = {
  action: BookingState.BOOKING_CONFIRMED;
  data: ConfirmedEmailAndSmsPayload;
};

type RequestedSideEffectsPayload = {
  action: BookingState.BOOKING_REQUESTED;
  data: RequestedEmailAndSmsPayload;
};

export type EmailsAndSmsSideEffectsPayload =
  | RescheduledSideEffectsPayload
  | RequestedSideEffectsPayload
  | ConfirmedSideEffectsPayload;

export interface IBookingEmailSmsHandler {
  logger: Logger<unknown>;
}

export class BookingEmailSmsHandler {
  private readonly log: Logger<unknown>;

  constructor(dependencies: IBookingEmailSmsHandler) {
    this.log = dependencies.logger.getSubLogger({ prefix: ["[api] book:user:emails"] });
  }

  /**
   * Handles notifications for a RESCHEDULED booking.
   */
  private async _handleRescheduled(data: RescheduleEmailAndSmsPayload) {
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
    const copyEvent = cloneDeep(evt);
    const copyEventAdditionalInfo = {
      ...copyEvent,
      additionalInformation: videoMetadata,
      additionalNotes,
      cancellationReason: `$RCH$${rescheduleReason || ""}`,
    };
    const cancelledRRHostEvt = cloneDeep(copyEventAdditionalInfo);
    this.log.debug("Emails: Sending rescheduled emails for booking confirmation");

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
            dayjs(originalRescheduledBooking?.startTime).utc().format() || copyEventAdditionalInfo.startTime;
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

      const newBookingMemberEmails: Person[] = [
        ...(copyEvent.team?.members || []),
        copyEvent.organizer,
        ...copyEvent.attendees,
      ];

      const matchOriginalMemberWithNewMember = (originalMember: Person, newMember: Person) =>
        originalMember.email === newMember.email;

      const newBookedMembers = newBookingMemberEmails.filter(
        (member) => !originalBookingMemberEmails.some((om) => matchOriginalMemberWithNewMember(om, member))
      );
      const cancelledMembers = originalBookingMemberEmails.filter(
        (member) => !newBookingMemberEmails.some((nm) => matchOriginalMemberWithNewMember(member, nm))
      );
      const rescheduledMembers = newBookingMemberEmails.filter((member) =>
        originalBookingMemberEmails.some((om) => matchOriginalMemberWithNewMember(om, member))
      );

      try {
        await sendRoundRobinRescheduledEmailsAndSMS(
          { ...copyEventAdditionalInfo, iCalUID: evt.iCalUID },
          rescheduledMembers,
          metadata
        );
        await sendRoundRobinScheduledEmailsAndSMS({
          calEvent: copyEventAdditionalInfo,
          members: newBookedMembers,
          eventTypeMetadata: metadata,
        });
        const reassignedTo = users.find(
          (user) => !user.isFixed && newBookedMembers.some((member) => member.email === user.email)
        );
        await sendRoundRobinCancelledEmailsAndSMS(
          cancelledRRHostEvt,
          cancelledMembers,
          metadata,
          reassignedTo
            ? {
                name: reassignedTo.name,
                email: reassignedTo.email,
                ...(isRescheduledByBooker && { reason: "Booker Rescheduled" }),
              }
            : undefined
        );
      } catch (err) {
        this.log.error("Failed to send rescheduled round robin event related emails", err);
      }
    } else {
      await sendRescheduledEmailsAndSMS(
        {
          ...copyEvent,
          additionalInformation: videoMetadata,
          additionalNotes,
          cancellationReason: `$RCH$${rescheduleReason || ""}`,
        },
        metadata
      );
    }
  }

  /**
   * Handles notifications for a newly CONFIRMED booking.
   */
  private async _handleConfirmed(data: ConfirmedEmailAndSmsPayload) {
    const {
      evt,
      eventType: { metadata },
      workflows,
      eventNameObject,
    } = data;

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
  }

  /**
   * Handles notifications when a booking REQUEST is made (requires confirmation).
   */
  private async _handleRequested(data: RequestedEmailAndSmsPayload) {
    const {
      evt,
      eventType: { metadata },
      attendees,
      additionalNotes,
    } = data;
    if (!attendees || attendees.length === 0) {
      this.log.error("Requested action called without attendee details.");
      return;
    }
    this.log.debug(
      "Action: BOOKING_REQUESTED. Sending request emails.",
      safeStringify({ calEvent: getPiiFreeCalendarEvent(evt) })
    );

    const eventWithNotes = { ...evt, additionalNotes };

    await sendOrganizerRequestEmail(eventWithNotes, metadata);
    await sendAttendeeRequestEmailAndSMS(eventWithNotes, attendees[0], metadata);
  }

  public async send(payload: EmailsAndSmsSideEffectsPayload) {
    const { action, data } = payload;

    switch (action) {
      case BookingState.BOOKING_RESCHEDULED:
        await this._handleRescheduled(data);
        break;

      case BookingState.BOOKING_CONFIRMED:
        await this._handleConfirmed(data);
        break;

      case BookingState.BOOKING_REQUESTED:
        await this._handleRequested(data);
        break;

      default:
        this.log.warn("Unknown email/SMS action requested.", { action });
        break;
    }
  }
}
