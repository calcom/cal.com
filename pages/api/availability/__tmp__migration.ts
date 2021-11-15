import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@lib/prisma";

dayjs.extend(utc);
dayjs.extend(timezone);

export async function tmpMigration() {
  await prisma.$queryRaw(`
    insert into "Availability" ("userId", "startTime", "endTime", "days")
    select
      id as "userId", 
      CAST(CONCAT(CAST(("startTime" / 60) AS text), ':00') AS time) AT TIME ZONE "timeZone" AT TIME ZONE 'UTC',
      CAST(CONCAT(CAST(("endTime" / 60) AS text), ':00') AS time) AT TIME ZONE "timeZone" AT TIME ZONE 'UTC',
      ARRAY [0,1,2,3,4,5,6]
    from 
      (
        select 
          users.id, 
          users."startTime", 
          users."endTime", 
          users."timeZone",
          count("Availability".id) as availability_count
        from users 
        left join "Availability" on "Availability"."userId" = users.id
        group by users.id
      ) usersWithAvailabilityNumber
    where availability_count < 1
  `);

  return NaN;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = req.headers.authorization || req.query.apiKey;
  if (process.env.CRON_API_KEY !== apiKey) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }
  await tmpMigration();

  res.send("Maybe worked?");
}
