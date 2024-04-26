import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import { updateMeeting } from "@calcom/core/videoClient";
import { sendCancelledSeatEmails } from "@calcom/emails";
import { deleteScheduledEmailReminder } from "@calcom/features/ee/workflows/lib/reminders/emailReminderManager";
import { deleteScheduledSMSReminder } from "@calcom/features/ee/workflows/lib/reminders/smsReminderManager";
import { deleteScheduledWhatsappReminder } from "@calcom/features/ee/workflows/lib/reminders/whatsappReminderManager";
import sendPayload from "@calcom/features/webhooks/lib/sendOrSchedulePayload";
import type { EventTypeInfo } from "@calcom/features/webhooks/lib/sendPayload";
import { HttpError } from "@calcom/lib/http-error";
import { getTranslation } from "@calcom/lib/server/i18n";
import prisma from "@calcom/prisma";
import { WebhookTriggerEvents, WorkflowMethods } from "@calcom/prisma/enums";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import { schemaBookingCancelParams } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";

import type { CustomRequest } from "../../handleCancelBooking";

async function cancelAttendeeSeat(
  req: CustomRequest,
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
  }
) {
  const { seatReferenceUid } = schemaBookingCancelParams.parse(req.body);
  const { webhooks, evt, eventTypeInfo } = dataForWebhooks;
  if (!seatReferenceUid) return;
  const bookingToDelete = req.bookingToDelete;
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
  req.statusCode = 200;

  const attendee = bookingToDelete?.attendees.find((attendee) => attendee.id === seatReference.attendeeId);

  if (attendee) {
    /* If there are references then we should update them as well */

    const integrationsToUpdate = [];

    for (const reference of bookingToDelete.references) {
      if (reference.credentialId) {
        const credential = await prisma.credential.findUnique({
          where: {
            id: reference.credentialId,
          },
          select: credentialForCalendarServiceSelect,
        });

        if (credential) {
          const updatedEvt = {
            ...evt,
            attendees: evt.attendees.filter((evtAttendee) => attendee.email !== evtAttendee.email),
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

    await sendCancelledSeatEmails(evt, {
      ...attendee,
      language: { translate: tAttendees, locale: attendee.locale ?? "en" },
    });
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

  const promises = webhooks.map((webhook) =>
    sendPayload(webhook.secret, WebhookTriggerEvents.BOOKING_CANCELLED, new Date().toISOString(), webhook, {
      ...evt,
      ...eventTypeInfo,
      status: "CANCELLED",
      smsReminderNumber: bookingToDelete.smsReminderNumber || undefined,
    }).catch((e) => {
      console.error(
        `Error executing webhook for event: ${WebhookTriggerEvents.BOOKING_CANCELLED}, URL: ${webhook.subscriberUrl}`,
        e
      );
    })
  );
  await Promise.all(promises);

  const workflowRemindersForAttendee = bookingToDelete?.workflowReminders.filter(
    (reminder) => reminder.seatReferenceId === seatReferenceUid
  );

  if (workflowRemindersForAttendee && workflowRemindersForAttendee.length !== 0) {
    const deletionPromises = workflowRemindersForAttendee.map((reminder) => {
      if (reminder.method === WorkflowMethods.EMAIL) {
        return deleteScheduledEmailReminder(reminder.id, reminder.referenceId);
      } else if (reminder.method === WorkflowMethods.SMS) {
        return deleteScheduledSMSReminder(reminder.id, reminder.referenceId);
      } else if (reminder.method === WorkflowMethods.WHATSAPP) {
        return deleteScheduledWhatsappReminder(reminder.id, reminder.referenceId);
      }
    });

    await Promise.allSettled(deletionPromises);
  }

  return { success: true };
}

export default cancelAttendeeSeat;
