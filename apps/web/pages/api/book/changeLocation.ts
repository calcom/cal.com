import dayjs from "dayjs";
import { NextApiRequest, NextApiResponse } from "next";

import EventManager from "@calcom/core/EventManager";
import { getTranslation } from "@calcom/lib/server/i18n";
import { Prisma } from "@calcom/prisma/client";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { AdditionInformation } from "@calcom/types/Calendar";

import { getSession } from "@lib/auth";
import { sendLocationChangeEmails } from "@lib/emails/email-manager";
import prisma from "@lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = parseInt(req.body.id);
  const location = req.body.newLocation || "";
  console.log("location new: " + location);

  const session = await getSession({ req: req });

  if (!session?.user?.id) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
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
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (location) {
      await prisma.booking.updateMany({
        where: {
          id,
        },
        data: {
          location,
        },
      });
    }

    const booking = await prisma.booking.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
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
        attendees: true,
        location: true,
        references: {
          select: {
            uid: true,
            type: true,
          },
        },
        payment: true,
        paid: true,
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
        eventTypeId: true,
        destinationCalendar: true,
      },
    });

    const organizer = await prisma.user.findFirst({
      where: {
        id: booking?.userId || 0,
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

    const attendeesListPromises = booking!.attendees.map(async (attendee) => {
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
      title: booking?.title || "",
      type: (booking?.eventType?.title as string) || booking?.title || "",
      description: booking?.description || "",
      startTime: booking?.startTime ? dayjs(booking.startTime).format() : "",
      endTime: booking?.endTime ? dayjs(booking.endTime).format() : "",
      organizer: {
        email: organizer.email,
        name: organizer.name ?? "Nameless",
        timeZone: organizer.timeZone,
        language: { translate: tOrganizer, locale: organizer.locale ?? "en" },
      },
      attendees: attendeesList,
      uid: booking?.uid,
      location: booking?.location,
      destinationCalendar: booking?.destinationCalendar || booking?.user?.destinationCalendar,
    };

    const eventManager = new EventManager(currentUser);
    const scheduleResult = await eventManager.create(evt);

    const results = scheduleResult.results;
    if (results.length > 0 && results.every((res) => !res.success)) {
      console.log("failed");
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
  } catch {
    res.status(500).json({ message: "Updating Location failed" });
  }
  res.status(204).end();
}
