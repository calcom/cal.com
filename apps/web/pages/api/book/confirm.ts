import { Booking, BookingStatus, Prisma, SchedulingType, User } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import EventManager from "@calcom/core/EventManager";
import { isPrismaObjOrUndefined } from "@calcom/lib";
import logger from "@calcom/lib/logger";
import type { AdditionInformation, CalendarEvent, RecurringEvent } from "@calcom/types/Calendar";
import { refund } from "@ee/lib/stripe/server";

import { asStringOrNull } from "@lib/asStringOrNull";
import { getSession } from "@lib/auth";
import { sendDeclinedEmails, sendScheduledEmails } from "@lib/emails/email-manager";
import prisma from "@lib/prisma";
import { BookingConfirmBody } from "@lib/types/booking";

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req: req });
  if (!session?.user?.id) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const reqBody = req.body as BookingConfirmBody;
  const bookingId = reqBody.id;

  if (!bookingId) {
    return res.status(400).json({ message: "bookingId missing" });
  }

  const currentUser = await prisma.user.findFirst({
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

  if (!currentUser) {
    return res.status(404).json({ message: "User not found" });
  }

  const tOrganizer = await getTranslation(currentUser.locale ?? "en", "common");

  if (req.method === "PATCH") {
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
      },
      select: {
        title: true,
        description: true,
        customInputs: true,
        startTime: true,
        endTime: true,
        confirmed: true,
        attendees: true,
        eventTypeId: true,
        eventType: {
          select: {
            recurringEvent: true,
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
      },
    });

    if (!booking) {
      return res.status(404).json({ message: "booking not found" });
    }

    if (!(await authorized(currentUser, booking))) {
      return res.status(401).end();
    }

    if (booking.confirmed) {
      return res.status(400).json({ message: "booking already confirmed" });
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
          confirmed: true,
        },
      });

      return res.status(204).end();
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
    };

    const recurringEvent = booking.eventType?.recurringEvent as RecurringEvent;

    if (req.body.recurringEventId && recurringEvent) {
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
    }

    if (reqBody.confirmed) {
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
        const metadata: AdditionInformation = {};

        if (results.length) {
          // TODO: Handle created event metadata more elegantly
          metadata.hangoutLink = results[0].createdEvent?.hangoutLink;
          metadata.conferenceData = results[0].createdEvent?.conferenceData;
          metadata.entryPoints = results[0].createdEvent?.entryPoints;
        }
        try {
          await sendScheduledEmails(
            { ...evt, additionInformation: metadata },
            req.body.recurringEventId ? recurringEvent : {} // Send email with recurring event info only on recurring event context
          );
        } catch (error) {
          log.error(error);
        }
      }

      if (req.body.recurringEventId) {
        // The booking to confirm is a recurring event and comes from /booking/upcoming, proceeding to mark all related
        // bookings as confirmed. Prisma updateMany does not support relations, so doing this in two steps for now.
        const unconfirmedRecurringBookings = await prisma.booking.findMany({
          where: {
            recurringEventId: req.body.recurringEventId,
            confirmed: false,
          },
        });
        unconfirmedRecurringBookings.map(async (recurringBooking) => {
          await prisma.booking.update({
            where: {
              id: recurringBooking.id,
            },
            data: {
              confirmed: true,
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
            confirmed: true,
            references: {
              create: scheduleResult.referencesToCreate,
            },
          },
        });
      }

      res.status(204).end();
    } else {
      const rejectionReason = asStringOrNull(req.body.reason) || "";
      evt.rejectionReason = rejectionReason;
      if (req.body.recurringEventId) {
        // The booking to reject is a recurring event and comes from /booking/upcoming, proceeding to mark all related
        // bookings as rejected. Prisma updateMany does not support relations, so doing this in two steps for now.
        const unconfirmedRecurringBookings = await prisma.booking.findMany({
          where: {
            recurringEventId: req.body.recurringEventId,
            confirmed: false,
          },
        });
        unconfirmedRecurringBookings.map(async (recurringBooking) => {
          await prisma.booking.update({
            where: {
              id: recurringBooking.id,
            },
            data: {
              rejected: true,
              status: BookingStatus.REJECTED,
              rejectionReason: rejectionReason,
            },
          });
        });
      } else {
        await refund(booking, evt); // No payment integration for recurring events for v1
        await prisma.booking.update({
          where: {
            id: bookingId,
          },
          data: {
            rejected: true,
            status: BookingStatus.REJECTED,
            rejectionReason: rejectionReason,
          },
        });
      }

      await sendDeclinedEmails(evt, req.body.recurringEventId ? recurringEvent : {}); // Send email with recurring event info only on recurring event context

      res.status(204).end();
    }
  }
}
