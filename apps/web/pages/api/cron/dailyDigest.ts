import type { NextApiRequest, NextApiResponse } from "next";

import { sendOrganizerDailyDigestEmail } from "@calcom/emails";
import { getTranslation } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

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

  // TODO: For each user, find bookings beginning in the next 24hrs and email as a daily digest
  const users = await getUsersDueDigests();

  let notificationsSent = 0;
  for (const user of users) {
    const tOrganizer = await getTranslation(user.locale ?? "en", "common");
    await sendOrganizerDailyDigestEmail(user, tOrganizer, []);

    notificationsSent++;
  }
  res.status(200).json({ notificationsSent });
}

async function getUsersDueDigests() {
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
  const users = await prisma.user.findMany({
    where: {
      id: { in: userIds },
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
  return Array.isArray(data) && data.every(isRawUserIdsRow);
};
