import { Booking, BookingStatus, Prisma, SchedulingType, User } from "@prisma/client";
import type { NextApiRequest } from "next";
import { z } from "zod";

import { refund } from "@calcom/app-store/stripepayment/lib/server";
import EventManager from "@calcom/core/EventManager";
import { sendDeclinedEmails, sendScheduledEmails } from "@calcom/emails";
import { scheduleWorkflowReminders } from "@calcom/features/ee/workflows/lib/reminders/reminderScheduler";
import { isPrismaObjOrUndefined, parseRecurringEvent } from "@calcom/lib";
import logger from "@calcom/lib/logger";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";
import prisma from "@calcom/prisma";
import type { AdditionalInformation, CalendarEvent } from "@calcom/types/Calendar";

import { getSession } from "@lib/auth";
import { HttpError } from "@lib/core/http/error";

import { getTranslation } from "@server/lib/i18n";

const authorized = async (
  currentUser: Pick<User, "id">,
  booking: Pick<Booking, "eventTypeId" | "userId">
) => {
  // if the organizer
  if (booking.userId === currentUser.id) {
    return true;
  }
  const eventType = await prisma.eventType.findUnique({
    where: {
      id: booking.eventTypeId || undefined,
    },
    select: {
      schedulingType: true,
      users: true,
    },
  });
  if (
    eventType?.schedulingType === SchedulingType.COLLECTIVE &&
    eventType.users.find((user) => user.id === currentUser.id)
  ) {
    return true;
  }
  return false;
};

const log = logger.getChildLogger({ prefix: ["[api] book:user"] });

const bookingConfirmPatchBodySchema = z.object({
  confirmed: z.boolean(),
  id: z.number(),
  recurringEventId: z.string().optional(),
  reason: z.string().optional(),
});

async function patchHandler(req: NextApiRequest) {
  const session = await getSession({ req });
  if (!session?.user?.id) {
    throw new HttpError({ statusCode: 401, message: "Not authenticated" });
  }

  const {
    id: bookingId,
    recurringEventId,
    reason: rejectionReason,
    confirmed,
  } = bookingConfirmPatchBodySchema.parse(req.body);

  const currentUser = await prisma.user.findFirst({
    rejectOnNotFound() {
      throw new HttpError({ statusCode: 404, message: "User not found" });
    },
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      credentials: {
        orderBy: { id: "desc" as Prisma.SortOrder },
      },
      timeZone: true,
      email: true,
      name: true,
      username: true,
      destinationCalendar: true,
      locale: true,
    },
  });

  const tOrganizer = await getTranslation(currentUser.locale ?? "en", "common");

  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
    },
    rejectOnNotFound() {
      throw new HttpError({ statusCode: 404, message: "Booking not found" });
    },
    select: {
      title: true,
      description: true,
      customInputs: true,
      startTime: true,
      endTime: true,
      attendees: true,
      eventTypeId: true,
      eventType: {
        select: {
          id: true,
          recurringEvent: true,
          requiresConfirmation: true,
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
      location: true,
      userId: true,
      id: true,
      uid: true,
      payment: true,
      destinationCalendar: true,
      paid: true,
      recurringEventId: true,
      status: true,
      smsReminderNumber: true,
    },
  });

  if (!(await authorized(currentUser, booking))) {
    throw new HttpError({ statusCode: 401, message: "UNAUTHORIZED" });
  }

  const isConfirmed = booking.status === BookingStatus.ACCEPTED;
  if (isConfirmed) {
    throw new HttpError({ statusCode: 400, message: "booking already confirmed" });
  }

  /** When a booking that requires payment its being confirmed but doesn't have any payment,
   * we shouldn’t save it on DestinationCalendars
   */
  if (booking.payment.length > 0 && !booking.paid) {
    await prisma.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        status: BookingStatus.ACCEPTED,
      },
    });

    req.statusCode = 204;
    return { message: "Booking confirmed" };
  }

  const attendeesListPromises = booking.attendees.map(async (attendee) => {
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

  const evt: CalendarEvent = {
    type: booking.title,
    title: booking.title,
    description: booking.description,
    customInputs: isPrismaObjOrUndefined(booking.customInputs),
    startTime: booking.startTime.toISOString(),
    endTime: booking.endTime.toISOString(),
    organizer: {
      email: currentUser.email,
      name: currentUser.name || "Unnamed",
      timeZone: currentUser.timeZone,
      language: { translate: tOrganizer, locale: currentUser.locale ?? "en" },
    },
    attendees: attendeesList,
    location: booking.location ?? "",
    uid: booking.uid,
    destinationCalendar: booking?.destinationCalendar || currentUser.destinationCalendar,
    requiresConfirmation: booking?.eventType?.requiresConfirmation ?? false,
    eventTypeId: booking.eventType?.id,
  };

  const recurringEvent = parseRecurringEvent(booking.eventType?.recurringEvent);
  if (recurringEventId && recurringEvent) {
    const groupedRecurringBookings = await prisma.booking.groupBy({
      where: {
        recurringEventId: booking.recurringEventId,
      },
      by: [Prisma.BookingScalarFieldEnum.recurringEventId],
      _count: true,
    });
    // Overriding the recurring event configuration count to be the actual number of events booked for
    // the recurring event (equal or less than recurring event configuration count)
    recurringEvent.count = groupedRecurringBookings[0]._count;
    // count changed, parsing again to get the new value in
    evt.recurringEvent = parseRecurringEvent(recurringEvent);
  }

  if (confirmed) {
    const eventManager = new EventManager(currentUser);
    const scheduleResult = await eventManager.create(evt);

    const results = scheduleResult.results;

    if (results.length > 0 && results.every((res) => !res.success)) {
      const error = {
        errorCode: "BookingCreatingMeetingFailed",
        message: "Booking failed",
      };

      log.error(`Booking ${currentUser.username} failed`, error, results);
    } else {
      const metadata: AdditionalInformation = {};

      if (results.length) {
        // TODO: Handle created event metadata more elegantly
        metadata.hangoutLink = results[0].createdEvent?.hangoutLink;
        metadata.conferenceData = results[0].createdEvent?.conferenceData;
        metadata.entryPoints = results[0].createdEvent?.entryPoints;
      }
      try {
        await sendScheduledEmails({ ...evt, additionalInformation: metadata });
      } catch (error) {
        log.error(error);
      }
    }

    if (recurringEventId) {
      // The booking to confirm is a recurring event and comes from /booking/recurring, proceeding to mark all related
      // bookings as confirmed. Prisma updateMany does not support relations, so doing this in two steps for now.
      const unconfirmedRecurringBookings = await prisma.booking.findMany({
        where: {
          recurringEventId,
          status: BookingStatus.PENDING,
        },
      });
      unconfirmedRecurringBookings.map(async (recurringBooking) => {
        await prisma.booking.update({
          where: {
            id: recurringBooking.id,
          },
          data: {
            status: BookingStatus.ACCEPTED,
            references: {
              create: scheduleResult.referencesToCreate,
            },
          },
        });
      });
    } else {
      // @NOTE: be careful with this as if any error occurs before this booking doesn't get confirmed
      // Should perform update on booking (confirm) -> then trigger the rest handlers
      await prisma.booking.update({
        where: {
          id: bookingId,
        },
        data: {
          status: BookingStatus.ACCEPTED,
          references: {
            create: scheduleResult.referencesToCreate,
          },
        },
      });
    }

    //Workflows - set reminders for confirmed events
    if (booking.eventType?.workflows) {
      await scheduleWorkflowReminders(booking.eventType.workflows, booking.smsReminderNumber, evt, false);
    }
  } else {
    evt.rejectionReason = rejectionReason;
    if (recurringEventId) {
      // The booking to reject is a recurring event and comes from /booking/upcoming, proceeding to mark all related
      // bookings as rejected.
      await prisma.booking.updateMany({
        where: {
          recurringEventId,
          status: BookingStatus.PENDING,
        },
        data: {
          status: BookingStatus.REJECTED,
          rejectionReason,
        },
      });
    } else {
      await refund(booking, evt); // No payment integration for recurring events for v1
      await prisma.booking.update({
        where: {
          id: bookingId,
        },
        data: {
          status: BookingStatus.REJECTED,
          rejectionReason,
        },
      });
    }

    await sendDeclinedEmails(evt);
  }

  req.statusCode = 204;
  return { message: "Booking " + confirmed ? "confirmed" : "rejected" };
}

export type BookConfirmPatchResponse = Awaited<ReturnType<typeof patchHandler>>;

export default defaultHandler({
  // To prevent too much git diff until moved to another file
  PATCH: Promise.resolve({ default: defaultResponder(patchHandler) }),
});
