import type { NextApiRequest, NextApiResponse } from "next";
import type { TFunction } from "next-i18next";

import dayjs from "@calcom/dayjs";
import { sendOrganizerDailyDigestEmail } from "@calcom/emails";
import { getTranslation } from "@calcom/lib/server";
import prisma, { bookingMinimalSelect } from "@calcom/prisma";
import { BookingStatus, type User } from "@calcom/prisma/client";
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

  const users = await getUsersDueDigests();

  let notificationsSent = 0;
  for (const user of users) {
    const tOrganizer = await getTranslation(user.locale ?? "en", "common");
    const calEventListPromises = user.bookings.map((booking) =>
      createCalendarEventFromBooking(user, booking, tOrganizer)
    );
    const calEventList = await Promise.all(calEventListPromises);

    await sendOrganizerDailyDigestEmail(user, tOrganizer, calEventList);

    notificationsSent++;
  }
  res.status(200).json({ notificationsSent });
}

export async function getUsersDueDigests() {
  /*
   * Find users who are due daily digests bookings within 5 minutes of now
   *
   * dailyDigestTime is stored local to the user, so we have to go through a few layers of postgres magic to:
   *   1. Interpret dailyDigestTime in the context of the user's timezone
   *   2. Turn it into UTC so we can reliably compare it against current server time
   *   3. Remove the 'date' component so a BETWEEN check reliably works even if the timezone correction increments/decrements the date
   *
   * We can't do this through Prisma so we'll have a small query to fetch relevant user IDs, and feed that into Prisma
   * to reintroduce type safety and all that.
   *
   * We return more columns than we need, but the extra ones are useful for diagnostics and debugging purposes
   */
  const rawUserIdsList = await prisma.$queryRaw`
    SELECT
      "id",
      "timeZone",
      "dailyDigestTime",
      ((current_date + "dailyDigestTime") AT TIME ZONE "timeZone" AT TIME ZONE 'UTC') as "utcDailyDigestTime",
      (NOW() - INTERVAL '5 minutes')::time as "minTime",
      (NOW() + INTERVAL '5 minutes')::time as "maxTime"
    FROM users
    WHERE "dailyDigestEnabled" = true
    AND
      ((current_date + "dailyDigestTime") AT TIME ZONE "timeZone" AT TIME ZONE 'UTC')::time
        BETWEEN (NOW() - INTERVAL '5 minutes')::time
        AND (NOW() + INTERVAL '5 minutes')::time;
  `;

  if (!isRawUserIdsList(rawUserIdsList)) {
    console.error(`DailyDigest: Database query results do not match RawUserIdsList type`);
    return [];
  }

  if (rawUserIdsList.length === 0) {
    return [];
  }

  const userIds = rawUserIdsList.map(({ id }) => id);
  const within24hrs = {
    lte: dayjs().add(1, "day").toDate(),
    gte: dayjs().toDate(),
  };

  const users = await prisma.user.findMany({
    where: {
      id: { in: userIds },
      bookings: {
        some: {
          startTime: within24hrs,
        },
      },
    },
    include: {
      bookings: {
        select: {
          ...bookingMinimalSelect,
          uid: true,
          location: true,
          eventType: {
            select: {
              title: true,
            },
          },
        },
        where: {
          startTime: within24hrs,
          status: BookingStatus.ACCEPTED,
        },
        orderBy: {
          startTime: "asc",
        },
      },
    },
  });

  return users;
}

type RawUserIdsRow = {
  id: number;
  timeZone: string;
  dailyDigestTime: Date;
  utcDailyDigestTime: Date;
  minTime: Date;
  maxTime: Date;
};

const isRawUserIdsRow = (data: unknown): data is RawUserIdsRow => {
  const assertions = {
    id: typeof (data as RawUserIdsRow)?.id === "number",
    timeZone: typeof (data as RawUserIdsRow)?.timeZone === "string",
    dailyDigestTime: (data as RawUserIdsRow)?.dailyDigestTime instanceof Date,
    utcDailyDigestTime: (data as RawUserIdsRow)?.utcDailyDigestTime instanceof Date,
    minTime: (data as RawUserIdsRow)?.minTime instanceof Date,
    maxTime: (data as RawUserIdsRow)?.maxTime instanceof Date,
  };

  if (Object.values(assertions).some((passed) => passed === false)) {
    console.error(`DailyDigest: Database query results do not match RawUserIdsRow type`, assertions);
    return false;
  }

  return true;
};

type RawUserIdsList = RawUserIdsRow[];

const isRawUserIdsList = (data: unknown): data is RawUserIdsList => {
  // TODO: Can zod replace this?
  return Array.isArray(data) && data.every(isRawUserIdsRow);
};

export const createCalendarEventFromBooking = async (
  organizer: User,
  booking: Awaited<ReturnType<typeof getUsersDueDigests>>[number]["bookings"][number],
  t: TFunction
): Promise<CalendarEvent> => {
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

  return {
    title: booking.title,
    type: booking.eventType?.title ?? booking.title,
    description: booking.description,
    startTime: booking.startTime.toISOString(),
    endTime: booking.endTime.toISOString(),
    organizer: {
      email: organizer.email,
      name: organizer.name ?? "Nameless",
      timeZone: organizer.timeZone,
      language: { translate: t, locale: organizer.locale ?? "en" },
    },
    location: booking.location ?? "",
    attendees: attendeesList,
    uid: booking.uid,
  };
};
