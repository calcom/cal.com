import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/client";
import prisma from "../../../lib/prisma";
import { handleLegacyConfirmationMail, scheduleEvent } from "./[user]";
import { CalendarEvent } from "@lib/calendarClient";
import EventRejectionMail from "@lib/emails/EventRejectionMail";

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const session = await getSession({ req: req });
  if (!session) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const bookingId = req.body.id;
  if (!bookingId) {
    return res.status(400).json({ message: "bookingId missing" });
  }

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
    },
  });

  if (req.method == "PATCH") {
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
      },
      select: {
        title: true,
        description: true,
        startTime: true,
        endTime: true,
        confirmed: true,
        attendees: true,
        userId: true,
        id: true,
        uid: true,
      },
    });

    if (!booking || booking.userId != currentUser.id) {
      return res.status(404).json({ message: "booking not found" });
    }
    if (booking.confirmed) {
      return res.status(400).json({ message: "booking already confirmed" });
    }

    const calendarCredentials = currentUser.credentials.filter((cred) => cred.type.endsWith("_calendar"));
    const videoCredentials = currentUser.credentials.filter((cred) => cred.type.endsWith("_video"));

    const evt: CalendarEvent = {
      type: booking.title,
      title: booking.title,
      description: booking.description,
      startTime: booking.startTime.toISOString(),
      endTime: booking.endTime.toISOString(),
      organizer: { email: currentUser.email, name: currentUser.name, timeZone: currentUser.timeZone },
      attendees: booking.attendees,
    };

    if (req.body.confirmed) {
      const scheduleResult = await scheduleEvent([], calendarCredentials, evt, videoCredentials, []);

      await handleLegacyConfirmationMail(
        scheduleResult.results,
        { requiresConfirmation: false },
        evt,
        booking.uid
      );

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

      res.status(204).json({ message: "ok" });
    } else {
      await prisma.booking.update({
        where: {
          id: bookingId,
        },
        data: {
          rejected: true,
        },
      });
      const attendeeMail = new EventRejectionMail(evt, booking.uid);
      await attendeeMail.sendEmail();
      res.status(204).json({ message: "ok" });
    }
  }
}
