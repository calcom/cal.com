import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import {
  getAllDelegationCredentialsForUserIncludeServiceAccountKey,
  getDelegationCredentialOrFindRegularCredential,
} from "@calcom/app-store/delegationCredential";
import { sendCancelledSeatEmailsAndSMS } from "@calcom/emails/email-manager";
import { updateMeeting } from "@calcom/features/conferencing/lib/videoClient";
import { getKV } from "@calcom/features/di/containers/KV";
import { getWebhookProducer } from "@calcom/features/di/webhooks/containers/webhook";
import { WorkflowRepository } from "@calcom/features/ee/workflows/repositories/workflow-repository";
import { getTranslation } from "@calcom/i18n/server";
import { getRichDescription } from "@calcom/lib/CalEventParser";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";
import type { EventTypeMetadata } from "@calcom/prisma/zod-utils";
import { bookingCancelAttendeeSeatSchema } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { BookingToDelete } from "../../handleCancelBooking";

export type SeatCancelWebhookContext = {
  teamId?: number | null;
  userId?: number | null;
  orgId?: number | null;
  oAuthClientId?: string | null;
  platformClientId?: string | null;
  platformRescheduleUrl?: string;
  platformCancelUrl?: string;
  platformBookingUrl?: string;
  skipNotifications?: boolean;
};

async function cancelAttendeeSeat(
  data: {
    seatReferenceUid?: string;
    bookingToDelete: BookingToDelete;
  },
  evt: CalendarEvent,
  eventTypeMetadata: EventTypeMetadata,
  webhookContext?: SeatCancelWebhookContext
) {
  const input = bookingCancelAttendeeSeatSchema.safeParse({
    seatReferenceUid: data.seatReferenceUid,
  });
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

  const attendee = bookingToDelete?.attendees.find((a) => a.id === seatReference.attendeeId);

  // Stash the cancelled attendee's PII in short-lived KV before deleting, so the
  // async webhook consumer can reconstruct it without PII in the queue or booking metadata.
  const KV_TTL_SECONDS = 30 * 60; // 30 min — covers all 3 trigger.dev retry attempts (max backoff 10 min each)
  if (attendee && !webhookContext?.skipNotifications) {
    try {
      await getKV().put(
        `webhook:cancelled-seat:${seatReferenceUid}`,
        JSON.stringify({
          email: attendee.email,
          name: attendee.name,
          timeZone: attendee.timeZone,
          locale: attendee.locale,
          phoneNumber: attendee.phoneNumber ?? null,
          cancellationReason: evt.cancellationReason ?? null,
        }),
        KV_TTL_SECONDS
      );
    } catch (err) {
      logger.warn("Failed to stash cancelled seat attendee in KV — webhook may lack attendee data", {
        seatReferenceUid,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

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
          const videoCallReference = bookingToDelete.references.find((reference) =>
            reference.type.includes("_video")
          );

          if (videoCallReference) {
            evt.videoCallData = {
              type: videoCallReference.type,
              id: videoCallReference.meetingId,
              password: videoCallReference?.meetingPassword,
              url: videoCallReference.meetingUrl,
            };
          }
          const updatedEvt = {
            ...evt,
            attendees: evt.attendees.filter((evtAttendee) => attendee.email !== evtAttendee.email),
            calendarDescription: getRichDescription(evt),
          };
          if (reference.type.includes("_video") && reference.type !== "google_meet_video") {
            integrationsToUpdate.push(updateMeeting(credential, updatedEvt, reference));
          }
          if (reference.type.includes("_calendar")) {
            const calendar = await getCalendar({ credential, mode: "booking" });
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
    } catch {
      // Shouldn't stop code execution if integrations fail
      // as integrations was already updated
    }

    if (!webhookContext?.skipNotifications) {
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

  if (!webhookContext?.skipNotifications) {
    try {
      const webhookProducer = getWebhookProducer();
      await webhookProducer.queueBookingCancelledWebhook({
        bookingUid: bookingToDelete.uid,
        eventTypeId: bookingToDelete.eventTypeId ?? undefined,
        teamId: webhookContext?.teamId ?? undefined,
        userId: webhookContext?.userId ?? undefined,
        orgId: webhookContext?.orgId ?? undefined,
        oAuthClientId: webhookContext?.oAuthClientId ?? undefined,
        platformClientId: webhookContext?.platformClientId ?? undefined,
        platformRescheduleUrl: webhookContext?.platformRescheduleUrl,
        platformCancelUrl: webhookContext?.platformCancelUrl,
        platformBookingUrl: webhookContext?.platformBookingUrl,
        attendeeSeatId: seatReferenceUid,
      });
    } catch (e) {
      logger.error(
        `Error queueing BOOKING_CANCELLED webhook for seat cancellation, bookingUid: ${bookingToDelete.uid}`,
        safeStringify(e)
      );
    }
  }

  const workflowRemindersForAttendee =
    bookingToDelete?.workflowReminders.filter((reminder) => reminder.seatReferenceId === seatReferenceUid) ??
    null;

  await WorkflowRepository.deleteAllWorkflowReminders(workflowRemindersForAttendee);

  return { success: true };
}

export default cancelAttendeeSeat;
