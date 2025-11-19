import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import { getAllDelegationCredentialsForUserIncludeServiceAccountKey } from "@calcom/app-store/delegationCredential";
import { getDelegationCredentialOrFindRegularCredential } from "@calcom/app-store/delegationCredential";
import {
  sendCancelledSeatEmailsAndSMS,
  sendCancelledSeatsEmailToHost,
  eventTypeDisableAttendeeEmail,
  eventTypeDisableHostEmail,
} from "@calcom/emails/email-manager";
import {
  SeatCancellationInputSchema,
  SeatCancellationOptionsSchema,
  type SeatCancellationInput,
  type SeatCancellationOptions,
} from "@calcom/features/bookings/lib/dto/SeatCancellation";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { BookingAccessService } from "@calcom/features/bookings/services/BookingAccessService";
import { updateMeeting } from "@calcom/features/conferencing/lib/videoClient";
import { WorkflowRepository } from "@calcom/features/ee/workflows/repositories/WorkflowRepository";
import sendPayload from "@calcom/features/webhooks/lib/sendOrSchedulePayload";
import type { EventPayloadType, EventTypeInfo } from "@calcom/features/webhooks/lib/sendPayload";
import { getRichDescription } from "@calcom/lib/CalEventParser";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getTranslation } from "@calcom/lib/server/i18n";
import prisma from "@calcom/prisma";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { EventTypeMetadata } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";

import type { BookingToDelete } from "../../handleCancelBooking";

async function cancelAttendeeSeat(
  data: {
    seatReferenceUids: string[];
    bookingToDelete: BookingToDelete;
    userId?: number;
  },
  dataForWebhooks: {
    webhooks: {
      id: string;
      subscriberUrl: string;
      payloadTemplate: string | null;
      appId: string | null;
      secret: string | null;
    }[];
    evt: CalendarEvent;
    eventTypeInfo: EventTypeInfo;
  },
  eventTypeMetadata: EventTypeMetadata,
  options?: { isCancelledByHost?: boolean }
) {
  const { webhooks, evt, eventTypeInfo } = dataForWebhooks;
  const bookingToDelete = data.bookingToDelete;

  const INVALID_SEAT_REFERENCE_ALL = "all";
  const DEFAULT_LOCALE = "en";

  const filteredSeatReferenceUids = data.seatReferenceUids.filter(
    (uid) => uid && uid !== INVALID_SEAT_REFERENCE_ALL && typeof uid === "string"
  );

  if (filteredSeatReferenceUids.length === 0) {
    if (!bookingToDelete?.attendees.length || bookingToDelete.attendees.length < 2) {
      return;
    }
    return;
  }

  const inputDto: SeatCancellationInput = {
    seatReferenceUids: filteredSeatReferenceUids,
    userId: data.userId,
    bookingUid: bookingToDelete.uid,
  };

  const validatedInput = SeatCancellationInputSchema.safeParse(inputDto);
  if (!validatedInput.success) {
    throw new HttpError({
      statusCode: 400,
      message: validatedInput.error.errors[0]?.message || "Invalid seat cancellation input",
    });
  }

  const { seatReferenceUids } = validatedInput.data;
  const { userId } = validatedInput.data;

  const validatedOptions: SeatCancellationOptions = SeatCancellationOptionsSchema.parse(
    options || { isCancelledByHost: false }
  );

  const hasNoAttendees = !bookingToDelete?.attendees.length;
  if (hasNoAttendees) {
    throw new HttpError({ statusCode: 400, message: "No attendees found in this booking" });
  }

  const isBookingUserMissing = !bookingToDelete.userId;
  if (isBookingUserMissing) {
    throw new HttpError({ statusCode: 400, message: "User not found" });
  }

  const seatReferences = bookingToDelete.seatsReferences.filter((reference) =>
    seatReferenceUids.includes(reference.referenceUid)
  );

  const areSomeSeatsNotFound = seatReferences.length !== seatReferenceUids.length;
  if (areSomeSeatsNotFound) {
    throw new HttpError({ statusCode: 400, message: "One or more seats not found in this booking" });
  }

  const bookingRepository = new BookingRepository(prisma);

  if (userId) {
    const bookingAccessService = new BookingAccessService(prisma);
    const hasFullAccess = await bookingAccessService.doesUserIdHaveAccessToBooking({
      userId,
      bookingUid: bookingToDelete.uid,
    });

    if (!hasFullAccess) {
      const userEmail = await bookingRepository.getUserEmailById(userId);

      const userSeats = seatReferences.filter((ref) => {
        const attendee = bookingToDelete.attendees.find((a) => a.id === ref.attendeeId);
        return attendee?.email === userEmail;
      });

      const areNotAllUserSeats = userSeats.length !== seatReferences.length;
      if (areNotAllUserSeats) {
        throw new HttpError({
          statusCode: 403,
          message: "You can only cancel your own seats",
        });
      }
    }
  }

  const attendeeIds = seatReferences.map((ref) => ref.attendeeId);
  await Promise.all([
    bookingRepository.deleteBookingSeatsByReferenceUids(seatReferenceUids),
    bookingRepository.deleteAttendeesByIds(attendeeIds),
  ]);

  const attendees = bookingToDelete.attendees.filter((attendee) =>
    seatReferences.some((ref) => ref.attendeeId === attendee.id)
  );
  const bookingToDeleteUser = bookingToDelete.user ?? null;
  const delegationCredentials = bookingToDeleteUser
    ? await getAllDelegationCredentialsForUserIncludeServiceAccountKey({
        user: { email: bookingToDeleteUser.email, id: bookingToDeleteUser.id },
      })
    : [];

  const hasAttendeesToNotify = attendees.length > 0;
  if (hasAttendeesToNotify) {
    const integrationsToUpdate = [];

    const updatedEvt = {
      ...evt,
      attendees: evt.attendees.filter((evtAttendee) => !attendees.some((a) => a.email === evtAttendee.email)),
      calendarDescription: getRichDescription(evt),
    };

    for (const reference of bookingToDelete.references) {
      const hasCredential = reference.credentialId || reference.delegationCredentialId;
      if (hasCredential) {
        const credential = await getDelegationCredentialOrFindRegularCredential({
          id: {
            credentialId: reference.credentialId,
            delegationCredentialId: reference.delegationCredentialId,
          },
          delegationCredentials,
        });

        if (credential) {
          const isVideoReference = reference.type.includes("_video");
          if (isVideoReference) {
            integrationsToUpdate.push(updateMeeting(credential, updatedEvt, reference));
          }
          const isCalendarReference = reference.type.includes("_calendar");
          if (isCalendarReference) {
            const calendar = await getCalendar(credential);
            if (calendar) {
              integrationsToUpdate.push(
                calendar.updateEvent(reference.uid, updatedEvt, reference.externalCalendarId)
              );
            }
          }
        }
      }
    }

    try {
      await Promise.all(integrationsToUpdate);
    } catch (error) {
      logger.error("Failed to update some calendar integrations", error);
    }

    // Send emails to each canceled attendee with their own locale
    const shouldSendAttendeeEmails = !eventTypeDisableAttendeeEmail(eventTypeMetadata);
    if (shouldSendAttendeeEmails) {
      for (const attendee of attendees) {
        const attendeeLocale = attendee.locale ?? DEFAULT_LOCALE;
        const tAttendee = await getTranslation(attendeeLocale, "common");
        await sendCancelledSeatEmailsAndSMS(
          evt,
          {
            ...attendee,
            language: { translate: tAttendee, locale: attendeeLocale },
          },
          eventTypeMetadata,
          { isCancelledByHost: validatedOptions.isCancelledByHost, sendToHost: false }
        );
      }
    }

    // Send ONE email to host with info about ALL cancelled/removed attendees
    const shouldSendHostEmail = !eventTypeDisableHostEmail(eventTypeMetadata);
    if (shouldSendHostEmail) {
      const hostLocale = evt.organizer.language.locale ?? DEFAULT_LOCALE;
      const tHost = await getTranslation(hostLocale, "common");

      const attendeesWithLanguage = await Promise.all(
        attendees.map(async (attendee) => ({
          ...attendee,
          language: { translate: tHost, locale: hostLocale },
        }))
      );

      await sendCancelledSeatsEmailToHost(
        { ...evt, attendees: attendeesWithLanguage },
        attendeesWithLanguage,
        eventTypeMetadata,
        { isCancelledByHost: validatedOptions.isCancelledByHost }
      );
    }
  }

  evt.attendees = await Promise.all(
    attendees.map(async (attendee) => {
      const attendeeLocale = attendee.locale ?? DEFAULT_LOCALE;
      return {
        ...attendee,
        language: {
          translate: await getTranslation(attendeeLocale, "common"),
          locale: attendeeLocale,
        },
      };
    })
  );

  const payload: EventPayloadType = {
    ...evt,
    ...eventTypeInfo,
    status: "CANCELLED",
    smsReminderNumber: bookingToDelete.smsReminderNumber || undefined,
  };

  const promises = webhooks.map((webhook) =>
    sendPayload(
      webhook.secret,
      WebhookTriggerEvents.BOOKING_CANCELLED,
      new Date().toISOString(),
      webhook,
      payload
    ).catch((e) => {
      logger.error(
        `Error executing webhook for event: ${WebhookTriggerEvents.BOOKING_CANCELLED}, URL: ${webhook.subscriberUrl}, bookingId: ${evt.bookingId}, bookingUid: ${evt.uid}`,
        safeStringify(e)
      );
    })
  );
  await Promise.all(promises);

  const workflowRemindersToDelete = bookingToDelete.workflowReminders.filter((reminder) =>
    seatReferenceUids.includes(reminder.seatReferenceId || "")
  );

  await WorkflowRepository.deleteAllWorkflowReminders(workflowRemindersToDelete);

  const allAttendeesRemoved = attendees.length === bookingToDelete.attendees.length;
  if (allAttendeesRemoved) {
    return;
  }

  return { success: true };
}

export default cancelAttendeeSeat;
