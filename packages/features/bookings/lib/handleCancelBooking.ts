import {
  BookingStatus,
  Prisma,
  PrismaPromise,
  WebhookTriggerEvents,
  WorkflowMethods,
  WorkflowReminder,
} from "@prisma/client";
import { NextApiRequest } from "next";

import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import { FAKE_DAILY_CREDENTIAL } from "@calcom/app-store/dailyvideo/lib/VideoApiAdapter";
import { DailyLocationType } from "@calcom/app-store/locations";
import { refund } from "@calcom/app-store/stripepayment/lib/server";
import { cancelScheduledJobs } from "@calcom/app-store/zapier/lib/nodeScheduler";
import { deleteMeeting } from "@calcom/core/videoClient";
import dayjs from "@calcom/dayjs";
import { sendCancelledEmails } from "@calcom/emails";
import { deleteScheduledEmailReminder } from "@calcom/features/ee/workflows/lib/reminders/emailReminderManager";
import { sendCancelledReminders } from "@calcom/features/ee/workflows/lib/reminders/reminderScheduler";
import { deleteScheduledSMSReminder } from "@calcom/features/ee/workflows/lib/reminders/smsReminderManager";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import sendPayload, { EventTypeInfo } from "@calcom/features/webhooks/lib/sendPayload";
import { isPrismaObjOrUndefined, parseRecurringEvent } from "@calcom/lib";
import { HttpError } from "@calcom/lib/http-error";
import { getTranslation } from "@calcom/lib/server/i18n";
import prisma, { bookingMinimalSelect } from "@calcom/prisma";
import { schemaBookingCancelParams } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";

async function handler(req: NextApiRequest & { userId?: number }) {
  const { userId } = req;

  const { id, uid, allRemainingBookings, cancellationReason } = schemaBookingCancelParams.parse(req.body);

  const bookingToDelete = await prisma.booking.findUnique({
    where: {
      id,
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
          description: true,
          requiresConfirmation: true,
          price: true,
          currency: true,
          length: true,
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
      scheduledJobs: true,
    },
  });

  if (!bookingToDelete || !bookingToDelete.user) {
    throw new HttpError({ statusCode: 400, message: "Booking not found" });
  }

  if (userId !== bookingToDelete.user?.id && bookingToDelete.startTime < new Date()) {
    throw new HttpError({ statusCode: 400, message: "Cannot cancel past events" });
  }

  if (!bookingToDelete.userId) {
    throw new HttpError({ statusCode: 400, message: "User not found" });
  }

  const organizer = await prisma.user.findFirstOrThrow({
    where: {
      id: bookingToDelete.userId,
    },
    select: {
      name: true,
      email: true,
      timeZone: true,
      locale: true,
    },
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
    recurringEvent: allRemainingBookings
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

  const eventTypeInfo: EventTypeInfo = {
    eventTitle: bookingToDelete?.eventType?.title || null,
    eventDescription: bookingToDelete?.eventType?.description || null,
    requiresConfirmation: bookingToDelete?.eventType?.requiresConfirmation || null,
    price: bookingToDelete?.eventType?.price || null,
    currency: bookingToDelete?.eventType?.currency || null,
    length: bookingToDelete?.eventType?.length || null,
  };

  const webhooks = await getWebhooks(subscriberOptions);
  const promises = webhooks.map((webhook) =>
    sendPayload(webhook.secret, eventTrigger, new Date().toISOString(), webhook, {
      ...evt,
      ...eventTypeInfo,
      status: "CANCELLED",
      smsReminderNumber: bookingToDelete.smsReminderNumber || undefined,
    }).catch((e) => {
      console.error(`Error executing webhook for event: ${eventTrigger}, URL: ${webhook.subscriberUrl}`, e);
    })
  );
  await Promise.all(promises);

  //Workflows - schedule reminders
  if (bookingToDelete.eventType?.workflows) {
    await sendCancelledReminders(
      bookingToDelete.eventType?.workflows,
      bookingToDelete.smsReminderNumber,
      evt
    );
  }

  let updatedBookings: {
    uid: string;
    workflowReminders: WorkflowReminder[];
    scheduledJobs: string[];
    references: {
      type: string;
      credentialId: number | null;
      uid: string;
      externalCalendarId: string | null;
    }[];
    startTime: Date;
    endTime: Date;
  }[] = [];

  // by cancelling first, and blocking whilst doing so; we can ensure a cancel
  // action always succeeds even if subsequent integrations fail cancellation.
  if (bookingToDelete.eventType?.recurringEvent && bookingToDelete.recurringEventId && allRemainingBookings) {
    const recurringEventId = bookingToDelete.recurringEventId;
    // Proceed to mark as cancelled all remaining recurring events instances (greater than or equal to right now)
    await prisma.booking.updateMany({
      where: {
        recurringEventId,
        startTime: {
          gte: new Date(),
        },
      },
      data: {
        status: BookingStatus.CANCELLED,
        cancellationReason: cancellationReason,
      },
    });
    const allUpdatedBookings = await prisma.booking.findMany({
      where: {
        recurringEventId: bookingToDelete.recurringEventId,
        startTime: {
          gte: new Date(),
        },
      },
      select: {
        startTime: true,
        endTime: true,
        references: {
          select: {
            uid: true,
            type: true,
            externalCalendarId: true,
            credentialId: true,
          },
        },
        workflowReminders: true,
        uid: true,
        scheduledJobs: true,
      },
    });
    updatedBookings = updatedBookings.concat(allUpdatedBookings);
  } else {
    const updatedBooking = await prisma.booking.update({
      where: {
        id,
        uid,
      },
      data: {
        status: BookingStatus.CANCELLED,
        cancellationReason: cancellationReason,
      },
      select: {
        startTime: true,
        endTime: true,
        references: {
          select: {
            uid: true,
            type: true,
            externalCalendarId: true,
            credentialId: true,
          },
        },
        workflowReminders: true,
        uid: true,
        scheduledJobs: true,
      },
    });
    updatedBookings.push(updatedBooking);
  }

  /** TODO: Remove this without breaking functionality */
  if (bookingToDelete.location === DailyLocationType) {
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
        if (
          bookingToDelete.eventType?.recurringEvent &&
          bookingToDelete.recurringEventId &&
          allRemainingBookings
        ) {
          bookingToDelete.user.credentials
            .filter((credential) => credential.type.endsWith("_calendar"))
            .forEach(async (credential) => {
              const calendar = getCalendar(credential);
              for (const updBooking of updatedBookings) {
                const bookingRef = updBooking.references.find((ref) => ref.type.includes("_calendar"));
                if (bookingRef) {
                  const { uid, externalCalendarId } = bookingRef;
                  const deletedEvent = await calendar?.deleteEvent(uid, evt, externalCalendarId);
                  apiDeletes.push(deletedEvent);
                }
              }
            });
        } else {
          apiDeletes.push(calendar?.deleteEvent(uid, evt, externalCalendarId) as Promise<unknown>);
        }
      }
    } else {
      // For bookings made before the refactor we go through the old behaviour of running through each calendar credential
      bookingToDelete.user.credentials
        .filter((credential) => credential.type.endsWith("_calendar"))
        .forEach((credential) => {
          const calendar = getCalendar(credential);
          apiDeletes.push(calendar?.deleteEvent(uid, evt, externalCalendarId) as Promise<unknown>);
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
        apiDeletes.push(deleteMeeting(credential, bookingToDelete.uid));
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
    req.statusCode = 200;
    return { message: "Booking successfully cancelled." };
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

  // delete scheduled jobs of cancelled bookings
  updatedBookings.forEach((booking) => {
    cancelScheduledJobs(booking);
  });

  //Workflows - delete all reminders for bookings
  const remindersToDelete: PrismaPromise<Prisma.BatchPayload>[] = [];
  updatedBookings.forEach((booking) => {
    booking.workflowReminders.forEach((reminder) => {
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
  });

  const prismaPromises: Promise<unknown>[] = [attendeeDeletes, bookingReferenceDeletes].concat(
    remindersToDelete
  );

  await Promise.all(prismaPromises.concat(apiDeletes));

  await sendCancelledEmails(evt);

  req.statusCode = 200;
  return { message: "Booking successfully cancelled." };
}

export default handler;
