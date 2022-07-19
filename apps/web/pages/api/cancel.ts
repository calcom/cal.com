import {
  BookingStatus,
  Credential,
  WebhookTriggerEvents,
  Prisma,
  PrismaPromise,
  WorkflowMethods,
} from "@prisma/client";
import async from "async";
import { NextApiRequest, NextApiResponse } from "next";

import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import { FAKE_DAILY_CREDENTIAL } from "@calcom/app-store/dailyvideo/lib/VideoApiAdapter";
import { deleteMeeting } from "@calcom/core/videoClient";
import dayjs from "@calcom/dayjs";
import { sendCancelledEmails } from "@calcom/emails";
import { isPrismaObjOrUndefined, parseRecurringEvent } from "@calcom/lib";
import prisma, { bookingMinimalSelect } from "@calcom/prisma";
import type { CalendarEvent } from "@calcom/types/Calendar";
import { refund } from "@ee/lib/stripe/server";
import { deleteScheduledEmailReminder } from "@ee/lib/workflows/reminders/emailReminderManager";
import { sendCancelledReminders } from "@ee/lib/workflows/reminders/reminderScheduler";
import { deleteScheduledSMSReminder } from "@ee/lib/workflows/reminders/smsReminderManager";

import { asStringOrNull } from "@lib/asStringOrNull";
import { getSession } from "@lib/auth";
import sendPayload from "@lib/webhooks/sendPayload";
import getWebhooks from "@lib/webhooks/subscriptions";

import { getTranslation } from "@server/lib/i18n";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // just bail if it not a DELETE
  if (req.method !== "DELETE" && req.method !== "POST") {
    return res.status(405).end();
  }

  const uid = asStringOrNull(req.body.uid) || "";
  const allRemainingBookings = asStringOrNull(req.body.allRemainingBookings) || "";
  const cancellationReason = asStringOrNull(req.body.reason) || "";
  const session = await getSession({ req: req });

  const bookingToDelete = await prisma.booking.findUnique({
    where: {
      uid,
    },
    select: {
      ...bookingMinimalSelect,
      recurringEventId: true,
      userId: true,
      user: {
        select: {
          id: true,
          credentials: true,
          email: true,
          timeZone: true,
          name: true,
          destinationCalendar: true,
        },
      },
      location: true,
      references: {
        select: {
          uid: true,
          type: true,
          externalCalendarId: true,
          credentialId: true,
        },
      },
      payment: true,
      paid: true,
      eventType: {
        select: {
          recurringEvent: true,
          title: true,
          workflows: {
            include: {
              workflow: {
                include: {
                  steps: true,
                },
              },
            },
          },
        },
      },
      uid: true,
      eventTypeId: true,
      destinationCalendar: true,
      smsReminderNumber: true,
      workflowReminders: true,
    },
  });

  if (!bookingToDelete || !bookingToDelete.user) {
    return res.status(404).end();
  }

  if ((!session || session.user?.id !== bookingToDelete.user?.id) && bookingToDelete.startTime < new Date()) {
    return res.status(403).json({ message: "Cannot cancel past events" });
  }

  if (!bookingToDelete.userId) {
    return res.status(404).json({ message: "User not found" });
  }

  const organizer = await prisma.user.findFirst({
    where: {
      id: bookingToDelete.userId,
    },
    select: {
      name: true,
      email: true,
      timeZone: true,
      locale: true,
    },
    rejectOnNotFound: true,
  });

  const attendeesListPromises = bookingToDelete.attendees.map(async (attendee) => {
    return {
      name: attendee.name,
      email: attendee.email,
      timeZone: attendee.timeZone,
      language: {
        translate: await getTranslation(attendee.locale ?? "en", "common"),
        locale: attendee.locale ?? "en",
      },
    };
  });

  const attendeesList = await Promise.all(attendeesListPromises);
  const tOrganizer = await getTranslation(organizer.locale ?? "en", "common");

  const evt: CalendarEvent = {
    title: bookingToDelete?.title,
    type: (bookingToDelete?.eventType?.title as string) || bookingToDelete?.title,
    description: bookingToDelete?.description || "",
    customInputs: isPrismaObjOrUndefined(bookingToDelete.customInputs),
    startTime: bookingToDelete?.startTime ? dayjs(bookingToDelete.startTime).format() : "",
    endTime: bookingToDelete?.endTime ? dayjs(bookingToDelete.endTime).format() : "",
    organizer: {
      email: organizer.email,
      name: organizer.name ?? "Nameless",
      timeZone: organizer.timeZone,
      language: { translate: tOrganizer, locale: organizer.locale ?? "en" },
    },
    attendees: attendeesList,
    uid: bookingToDelete?.uid,
    /* Include recurringEvent information only when cancelling all bookings */
    recurringEvent:
      allRemainingBookings === "true"
        ? parseRecurringEvent(bookingToDelete.eventType?.recurringEvent)
        : undefined,
    location: bookingToDelete?.location,
    destinationCalendar: bookingToDelete?.destinationCalendar || bookingToDelete?.user.destinationCalendar,
    cancellationReason: cancellationReason,
  };
  // Hook up the webhook logic here
  const eventTrigger: WebhookTriggerEvents = "BOOKING_CANCELLED";
  // Send Webhook call if hooked to BOOKING.CANCELLED
  const subscriberOptions = {
    userId: bookingToDelete.userId,
    eventTypeId: (bookingToDelete.eventTypeId as number) || 0,
    triggerEvent: eventTrigger,
  };
  const webhooks = await getWebhooks(subscriberOptions);
  const promises = webhooks.map((webhook) =>
    sendPayload(webhook.secret, eventTrigger, new Date().toISOString(), webhook, evt).catch((e) => {
      console.error(`Error executing webhook for event: ${eventTrigger}, URL: ${webhook.subscriberUrl}`, e);
    })
  );
  await Promise.all(promises);

  // by cancelling first, and blocking whilst doing so; we can ensure a cancel
  // action always succeeds even if subsequent integrations fail cancellation.
  if (bookingToDelete.eventType?.recurringEvent && allRemainingBookings === "true") {
    const recurringEventId = bookingToDelete.recurringEventId;
    const where = recurringEventId === null ? { uid } : { recurringEventId };
    // Proceed to mark as cancelled all remaining recurring events instances (greater than or equal to right now)
    await prisma.booking.updateMany({
      where: {
        ...where,
        startTime: {
          gte: new Date(),
        },
      },
      data: {
        status: BookingStatus.CANCELLED,
        cancellationReason: cancellationReason,
      },
    });
  } else {
    await prisma.booking.update({
      where: {
        uid,
      },
      data: {
        status: BookingStatus.CANCELLED,
        cancellationReason: cancellationReason,
      },
    });
  }

  /** TODO: Remove this without breaking functionality */
  if (bookingToDelete.location === "integrations:daily") {
    bookingToDelete.user.credentials.push(FAKE_DAILY_CREDENTIAL);
  }

  const apiDeletes = [];

  const bookingCalendarReference = bookingToDelete.references.find((reference) =>
    reference.type.includes("_calendar")
  );

  if (bookingCalendarReference) {
    const { credentialId, uid, externalCalendarId } = bookingCalendarReference;
    // If the booking calendar reference contains a credentialId
    if (credentialId) {
      // Find the correct calendar credential under user credentials
      const calendarCredential = bookingToDelete.user.credentials.find(
        (credential) => credential.id === credentialId
      );
      if (calendarCredential) {
        const calendar = getCalendar(calendarCredential);
        apiDeletes.push(calendar?.deleteEvent(uid, evt, externalCalendarId));
      }
      // For bookings made before the refactor we go through the old behaviour of running through each calendar credential
    } else {
      bookingToDelete.user.credentials
        .filter((credential) => credential.type.endsWith("_calendar"))
        .forEach((credential) => {
          const calendar = getCalendar(credential);
          apiDeletes.push(calendar?.deleteEvent(uid, evt, externalCalendarId));
        });
    }
  }

  const bookingVideoReference = bookingToDelete.references.find((reference) =>
    reference.type.includes("_video")
  );

  // If the video reference has a credentialId find the specific credential
  if (bookingVideoReference && bookingVideoReference.credentialId) {
    const { credentialId, uid } = bookingVideoReference;
    if (credentialId) {
      const videoCredential = bookingToDelete.user.credentials.find(
        (credential) => credential.id === credentialId
      );

      if (videoCredential) {
        apiDeletes.push(deleteMeeting(videoCredential, uid));
      }
    }
    // For bookings made before this refactor we go through the old behaviour of running through each video credential
  } else {
    bookingToDelete.user.credentials
      .filter((credential) => credential.type.endsWith("_video"))
      .forEach((credential) => {
        apiDeletes.push(deleteMeeting(credential, uid));
      });
  }

  // Avoiding taking care of recurrence for now as Payments are not supported with Recurring Events at the moment
  if (bookingToDelete && bookingToDelete.paid) {
    const evt: CalendarEvent = {
      type: bookingToDelete?.eventType?.title as string,
      title: bookingToDelete.title,
      description: bookingToDelete.description ?? "",
      customInputs: isPrismaObjOrUndefined(bookingToDelete.customInputs),
      startTime: bookingToDelete.startTime.toISOString(),
      endTime: bookingToDelete.endTime.toISOString(),
      organizer: {
        email: bookingToDelete.user?.email ?? "dev@calendso.com",
        name: bookingToDelete.user?.name ?? "no user",
        timeZone: bookingToDelete.user?.timeZone ?? "",
        language: { translate: tOrganizer, locale: organizer.locale ?? "en" },
      },
      attendees: attendeesList,
      location: bookingToDelete.location ?? "",
      uid: bookingToDelete.uid ?? "",
      destinationCalendar: bookingToDelete?.destinationCalendar || bookingToDelete?.user.destinationCalendar,
    };
    await refund(bookingToDelete, evt);
    await prisma.booking.update({
      where: {
        id: bookingToDelete.id,
      },
      data: {
        status: BookingStatus.REJECTED,
      },
    });

    // We skip the deletion of the event, because that would also delete the payment reference, which we should keep
    await apiDeletes;
    return res.status(200).json({ message: "Booking successfully deleted." });
  }

  const attendeeDeletes = prisma.attendee.deleteMany({
    where: {
      bookingId: bookingToDelete.id,
    },
  });

  const bookingReferenceDeletes = prisma.bookingReference.deleteMany({
    where: {
      bookingId: bookingToDelete.id,
    },
  });

  //Workflows - delete all reminders for that booking
  const remindersToDelete: PrismaPromise<Prisma.BatchPayload>[] = [];
  bookingToDelete.workflowReminders.forEach((reminder) => {
    if (reminder.scheduled && reminder.referenceId) {
      if (reminder.method === WorkflowMethods.EMAIL) {
        deleteScheduledEmailReminder(reminder.referenceId);
      } else if (reminder.method === WorkflowMethods.SMS) {
        deleteScheduledSMSReminder(reminder.referenceId);
      }
    }
    const reminderToDelete = prisma.workflowReminder.deleteMany({
      where: {
        id: reminder.id,
      },
    });
    remindersToDelete.push(reminderToDelete);
  });

  await Promise.all([apiDeletes, attendeeDeletes, bookingReferenceDeletes].concat(remindersToDelete));

  await sendCancelledEmails(evt);

  //Workflows - schedule reminders
  if (bookingToDelete.eventType?.workflows) {
    await sendCancelledReminders(
      bookingToDelete.eventType?.workflows,
      bookingToDelete.smsReminderNumber,
      evt
    );
  }

  res.status(204).end();
}
