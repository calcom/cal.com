import { User, Booking, SchedulingType, BookingStatus } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import { refund } from "@ee/lib/stripe/server";

import { getSession } from "@lib/auth";
import { CalendarEvent } from "@lib/calendarClient";
import EventRejectionMail from "@lib/emails/EventRejectionMail";
import EventManager from "@lib/events/EventManager";
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

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const t = await getTranslation(req.body.language ?? "en", "common");

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
      credentials: true,
      timeZone: true,
      email: true,
      name: true,
    },
  });

  if (!currentUser) {
    return res.status(404).json({ message: "User not found" });
  }

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
        eventTypeId: true,
        location: true,
        userId: true,
        id: true,
        uid: true,
        payment: true,
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

    const evt: CalendarEvent = {
      type: booking.title,
      title: booking.title,
      description: booking.description,
      startTime: booking.startTime.toISOString(),
      endTime: booking.endTime.toISOString(),
      organizer: {
        email: currentUser.email,
        name: currentUser.name || "Unnamed",
        timeZone: currentUser.timeZone,
      },
      attendees: booking.attendees,
      location: booking.location ?? "",
      uid: booking.uid,
      language: t,
    };

    if (reqBody.confirmed) {
      const eventManager = new EventManager(currentUser.credentials);
      const scheduleResult = await eventManager.create(evt);

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

      res.status(204).end();
    } else {
      await refund(booking, evt);

      await prisma.booking.update({
        where: {
          id: bookingId,
        },
        data: {
          rejected: true,
          status: BookingStatus.REJECTED,
        },
      });
      const attendeeMail = new EventRejectionMail(evt);
      await attendeeMail.sendEmail();

      res.status(204).end();
    }
  }
}
