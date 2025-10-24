import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import { getAllDelegationCredentialsForUserIncludeServiceAccountKey } from "@calcom/app-store/delegationCredential";
import { getDelegationCredentialOrFindRegularCredential } from "@calcom/app-store/delegationCredential";
import { sendCancelledSeatEmailsAndSMS } from "@calcom/emails";
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
import { bookingCancelAttendeeSeatSchema } from "@calcom/prisma/zod-utils";
import type { EventTypeMetadata } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";

import type { BookingToDelete } from "../../handleCancelBooking";

async function cancelAttendeeSeat(
  data: {
    seatReferenceUid?: string;
    bookingToDelete: BookingToDelete;
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
  eventTypeMetadata: EventTypeMetadata
) {
  const input = bookingCancelAttendeeSeatSchema.safeParse({
    seatReferenceUid: data.seatReferenceUid,
  });
  const { webhooks, evt, eventTypeInfo } = dataForWebhooks;
  if (!input.success) return;
  const { seatReferenceUid } = input.data;
  const bookingToDelete = data.bookingToDelete;
  if (!bookingToDelete?.attendees.length || bookingToDelete.attendees.length < 2) return;

  if (!bookingToDelete.userId) {
    throw new HttpError({ statusCode: 400, message: "User not found" });
  }

  const seatReference = bookingToDelete.seatsReferences.find(
    (reference) => reference.referenceUid === seatReferenceUid
  );

  if (!seatReference) throw new HttpError({ statusCode: 400, message: "User not a part of this booking" });

  await Promise.all([
    prisma.bookingSeat.delete({
      where: {
        referenceUid: seatReferenceUid,
      },
    }),
    prisma.attendee.delete({
      where: {
        id: seatReference.attendeeId,
      },
    }),
  ]);

  const attendee = bookingToDelete?.attendees.find((attendee) => attendee.id === seatReference.attendeeId);
  const bookingToDeleteUser = bookingToDelete.user ?? null;
  const delegationCredentials = bookingToDeleteUser
    ? // We fetch delegation credentials with ServiceAccount key as CalendarService instance created later in the flow needs it
      await getAllDelegationCredentialsForUserIncludeServiceAccountKey({
        user: { email: bookingToDeleteUser.email, id: bookingToDeleteUser.id },
      })
    : [];

  if (attendee) {
    /* If there are references then we should update them as well */

    const integrationsToUpdate = [];

    for (const reference of bookingToDelete.references) {
      if (reference.credentialId || reference.delegationCredentialId) {
        const credential = await getDelegationCredentialOrFindRegularCredential({
          id: {
            credentialId: reference.credentialId,
            delegationCredentialId: reference.delegationCredentialId,
          },
          delegationCredentials,
        });

        if (credential) {
          const updatedEvt = {
            ...evt,
            attendees: evt.attendees.filter((evtAttendee) => attendee.email !== evtAttendee.email),
            calendarDescription: getRichDescription(evt),
          };
          if (reference.type.includes("_video")) {
            integrationsToUpdate.push(updateMeeting(credential, updatedEvt, reference));
          }
          if (reference.type.includes("_calendar")) {
            const calendar = await getCalendar(credential);
            if (calendar) {
              integrationsToUpdate.push(
                calendar?.updateEvent(reference.uid, updatedEvt, reference.externalCalendarId)
              );
            }
          }
        }
      }
    }

    try {
      await Promise.all(integrationsToUpdate);
    } catch (error) {
      // Shouldn't stop code execution if integrations fail
      // as integrations was already updated
    }

    const tAttendees = await getTranslation(attendee.locale ?? "en", "common");

    await sendCancelledSeatEmailsAndSMS(
      evt,
      {
        ...attendee,
        language: { translate: tAttendees, locale: attendee.locale ?? "en" },
      },
      eventTypeMetadata
    );
  }

  evt.attendees = attendee
    ? [
        {
          ...attendee,
          language: {
            translate: await getTranslation(attendee.locale ?? "en", "common"),
            locale: attendee.locale ?? "en",
          },
        },
      ]
    : [];

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

  const workflowRemindersForAttendee =
    bookingToDelete?.workflowReminders.filter((reminder) => reminder.seatReferenceId === seatReferenceUid) ??
    null;

  await WorkflowRepository.deleteAllWorkflowReminders(workflowRemindersForAttendee);

  return { success: true };
}

export default cancelAttendeeSeat;
