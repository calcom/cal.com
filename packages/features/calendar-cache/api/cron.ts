import type { NextRequest } from "next/server";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server/defaultResponder.appDir";
import prisma from "@calcom/prisma";

const validateRequest = (req: NextRequest) => {
  const searchParams = req.nextUrl.searchParams;
  const apiKey = searchParams.get("apiKey") || req.headers.get("authorization");
  if (!apiKey || ![process.env.CRON_API_KEY, `Bearer ${process.env.CRON_SECRET}`].includes(apiKey)) {
    throw new HttpError({ statusCode: 401, message: "Unauthorized" });
  }
};

// This cron is used to activate and renew calendar subcriptions
export const GET = defaultResponder(async (request: NextRequest) => {
  validateRequest(request);
  // const calendarCache = await CalendarCache.init();
  // calendarCache.re();
  // Get all selected calendars from users that belong to a team that has calendar cache enabled
  const oneDayInMS = 24 * 60 * 60 * 1000;
  const expiresInADay = String(new Date().getTime() + oneDayInMS);
  const selectedCalendars = await prisma.selectedCalendar.findMany({
    where: {
      user: {
        teams: {
          some: {
            team: {
              features: {
                some: {
                  featureId: "calendar-cache",
                },
              },
            },
          },
        },
      },
      // RN we only support google calendar subscriptions for now
      integration: "google_calendar",
      AND: [
        {
          OR: [{ googleChannelExpiration: null }, { googleChannelExpiration: { gt: expiresInADay } }],
        },
      ],
    },
    // select: {
    //   credentialId: true,
    //   externalId: true,
    // },
  });

  console.log({
    expiresInADay,
    selectedCalendars,
    expired: selectedCalendars.map((sc) => {
      if (!sc.googleChannelExpiration) return null;
      console.log({
        humanReadableExpireDate: new Date(parseInt(sc.googleChannelExpiration, 10)).toLocaleString(),
        humanReadableCurrentDate: new Date(parseInt(expiresInADay, 10)).toLocaleString(),
      });
      return sc.googleChannelExpiration < expiresInADay;
    }),
  });
  // TODO: Credentials can be installed on a whole team, check for selected calendars on the team
  return { success: true };
});
