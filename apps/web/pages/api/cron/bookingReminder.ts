import type { NextApiRequest, NextApiResponse } from "next";

import dayjs from "@calcom/dayjs";
import { sendOrganizerRequestReminderEmail } from "@calcom/emails";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { isPrismaObjOrUndefined, parseRecurringEvent } from "@calcom/lib";
import { getTranslation } from "@calcom/lib/server/i18n";
import prisma, { bookingMinimalSelect } from "@calcom/prisma";
import { BookingStatus, ReminderType } from "@calcom/prisma/enums";
import type { CalendarEvent } from "@calcom/types/Calendar";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = req.headers.authorization || req.query.apiKey;
  if (process.env.CRON_API_KEY !== apiKey) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ message: "Invalid method" });
    return;
  }

  const reminderIntervalMinutes = [48 * 60, 24 * 60, 3 * 60];
  let notificationsSent = 0;
  for (const interval of reminderIntervalMinutes) {
    const bookings = await prisma.booking.findMany({
      where: {
        status: BookingStatus.PENDING,
        createdAt: {
          lte: dayjs().add(-interval, "minutes").toDate(),
        },
        // Only send reminders if the event hasn't finished
        endTime: { gte: new Date() },
        OR: [
          // no payment required
          {
            payment: { none: {} },
          },
          // paid but awaiting approval
          {
            payment: { some: {} },
            paid: true,
          },
        ],
      },
      select: {
        ...bookingMinimalSelect,
        location: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            username: true,
            locale: true,
            timeZone: true,
            destinationCalendar: true,
          },
        },
        eventType: {
          select: {
            recurringEvent: true,
            bookingFields: true,
          },
        },
        responses: true,
        uid: true,
        destinationCalendar: true,
      },
    });

    const reminders = await prisma.reminderMail.findMany({
      where: {
        reminderType: ReminderType.PENDING_BOOKING_CONFIRMATION,
        referenceId: {
          in: bookings.map((b) => b.id),
        },
        elapsedMinutes: {
          gte: interval,
        },
      },
    });

    for (const booking of bookings.filter((b) => !reminders.some((r) => r.referenceId == b.id))) {
      const { user } = booking;
      const name = user?.name || user?.username;
      if (!user || !name || !user.timeZone) {
        console.error(`Booking ${booking.id} is missing required properties for booking reminder`, { user });
        continue;
      }

      const tOrganizer = await getTranslation(user.locale ?? "en", "common");

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
      const selectedDestinationCalendar = booking.destinationCalendar || user.destinationCalendar;
      const evt: CalendarEvent = {
        type: booking.title,
        title: booking.title,
        description: booking.description || undefined,
        customInputs: isPrismaObjOrUndefined(booking.customInputs),
        ...getCalEventResponses({
          bookingFields: booking.eventType?.bookingFields ?? null,
          booking,
        }),
        location: booking.location ?? "",
        startTime: booking.startTime.toISOString(),
        endTime: booking.endTime.toISOString(),
        organizer: {
          id: user.id,
          email: user.email,
          name,
          timeZone: user.timeZone,
          language: { translate: tOrganizer, locale: user.locale ?? "en" },
        },
        attendees: attendeesList,
        uid: booking.uid,
        recurringEvent: parseRecurringEvent(booking.eventType?.recurringEvent),
        destinationCalendar: selectedDestinationCalendar ? [selectedDestinationCalendar] : [],
      };

      await sendOrganizerRequestReminderEmail(evt);

      await prisma.reminderMail.create({
        data: {
          referenceId: booking.id,
          reminderType: ReminderType.PENDING_BOOKING_CONFIRMATION,
          elapsedMinutes: interval,
        },
      });
      notificationsSent++;
    }
  }
  res.status(200).json({ notificationsSent });
}
