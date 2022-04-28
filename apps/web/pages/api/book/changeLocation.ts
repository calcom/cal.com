import dayjs from "dayjs";
import { NextApiRequest, NextApiResponse } from "next";

import { getTranslation } from "@calcom/lib/server/i18n";
import type { CalendarEvent } from "@calcom/types/Calendar";

import { sendLocationChangeEmails } from "@lib/emails/email-manager";
import prisma from "@lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = parseInt(req.body.id);
  const location = req.body.location || "";

  try {
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
    await sendLocationChangeEmails(evt);
  } catch {
    res.status(500).json({ message: "Updating Location failed" });
  }
  res.status(204).end();
}
