import { Booking, SchedulingType, User } from "@prisma/client";
import dayjs from "dayjs";
import { NextApiRequest, NextApiResponse } from "next";

import EventManager from "@calcom/core/EventManager";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { AdditionInformation } from "@calcom/types/Calendar";

import { getSession } from "@lib/auth";
import { sendLocationChangeEmails } from "@lib/emails/email-manager";
import prisma from "@lib/prisma";

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { bookingId, newLocation: location } = req.body;

  const session = await getSession({ req: req });

  if (!session?.user?.id) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  try {
    const currentUser = await prisma.user.findFirst({
      where: {
        id: session.user.id,
      },
      select: {
        id: true,
        credentials: true,
        timeZone: true,
        email: true,
        name: true,
        username: true,
        destinationCalendar: true,
        locale: true,
      },
    });

    if (!currentUser) {
      return res.status(401).json({ message: "User not found" });
    }

    const booking = await prisma.booking.findUnique({
      where: {
        id: bookingId,
      },
      select: {
        id: true,
        userId: true,
        user: {
          select: {
            destinationCalendar: true,
          },
        },
        eventTypeId: true,
        attendees: true,
        location: true,
        title: true,
        eventType: {
          select: {
            title: true,
          },
        },
        description: true,
        startTime: true,
        endTime: true,
        uid: true,
        destinationCalendar: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ message: "booking not found" });
    }

    if (!(await authorized(currentUser, booking))) {
      return res.status(401).end();
    }

    await prisma.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        location,
      },
    });

    if (booking) {
      const organizer = await prisma.user.findFirst({
        where: {
          id: booking.userId || 0,
        },
        select: {
          name: true,
          email: true,
          timeZone: true,
          locale: true,
        },
        rejectOnNotFound: true,
      });

      const tOrganizer = await getTranslation(organizer.locale ?? "en", "common");

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
        title: booking.title || "",
        type: (booking.eventType?.title as string) || booking?.title || "",
        description: booking.description || "",
        startTime: booking.startTime ? dayjs(booking.startTime).format() : "",
        endTime: booking.endTime ? dayjs(booking.endTime).format() : "",
        organizer: {
          email: organizer.email,
          name: organizer.name ?? "Nameless",
          timeZone: organizer.timeZone,
          language: { translate: tOrganizer, locale: organizer.locale ?? "en" },
        },
        attendees: attendeesList,
        uid: booking.uid,
        location: location,
        destinationCalendar: booking?.destinationCalendar || booking?.user?.destinationCalendar,
      };

      const eventManager = new EventManager(currentUser);
      const scheduleResult = await eventManager.create(evt);

      const results = scheduleResult.results;
      if (results.length > 0 && results.every((res) => !res.success)) {
        const error = {
          errorCode: "BookingUpdateLocationFailed",
          message: "Updating location failed",
        };
        logger.error(`Booking ${currentUser.username} failed`, error, results);
      } else {
        const metadata: AdditionInformation = {};
        if (results.length) {
          metadata.hangoutLink = results[0].createdEvent?.hangoutLink;
          metadata.conferenceData = results[0].createdEvent?.conferenceData;
          metadata.entryPoints = results[0].createdEvent?.entryPoints;
        }
        try {
          await sendLocationChangeEmails({ ...evt, additionInformation: metadata });
        } catch (error) {
          console.log("error");
        }
      }
    } else {
      res.status(500).json({ message: "No booking found" });
    }
  } catch {
    res.status(500).json({ message: "Updating Location failed" });
  }
  return res.status(200).json({ message: "Location updated" });
}
