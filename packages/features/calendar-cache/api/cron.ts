import type { NextRequest } from "next/server";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server/defaultResponder.appDir";
import prisma from "@calcom/prisma";

import { CalendarCache } from "../calendar-cache";

const validateRequest = (req: NextRequest) => {
  const searchParams = req.nextUrl.searchParams;
  const apiKey = searchParams.get("apiKey") || req.headers.get("authorization");
  if (!apiKey || ![process.env.CRON_API_KEY, `Bearer ${process.env.CRON_SECRET}`].includes(apiKey)) {
    throw new HttpError({ statusCode: 401, message: "Unauthorized" });
  }
};

const handleCalendarsToUnwatch = async (req: NextRequest) => {
  const calendarsToUnwatch = await prisma.selectedCalendar.findMany({
    take: 100,
    where: {
      user: {
        teams: {
          every: {
            team: {
              features: {
                none: {
                  featureId: "calendar-cache",
                },
              },
            },
          },
        },
      },
      // RN we only support google calendar subscriptions for now
      integration: "google_calendar",
      googleChannelExpiration: { not: null },
    },
  });

  const result = await Promise.allSettled(
    calendarsToUnwatch.map(async (sc) => {
      if (!sc.credentialId) return;
      const cc = await CalendarCache.initFromCredentialId(sc.credentialId);
      await cc.unwatchCalendar({ calendarId: sc.externalId });
    })
  );

  return result;
};
const handleCalendarsToWatch = async (req: NextRequest) => {
  // Get all selected calendars from users that belong to a team that has calendar cache enabled
  const oneDayInMS = 24 * 60 * 60 * 1000;
  const tomorrowTimestamp = String(new Date().getTime() + oneDayInMS);
  const calendarsToWatch = await prisma.selectedCalendar.findMany({
    take: 100,
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
          OR: [
            // Either is a calendar pending to be watched
            { googleChannelExpiration: null },
            // Or is a calendar that is about to expire
            { googleChannelExpiration: { lt: tomorrowTimestamp } },
          ],
        },
      ],
    },
  });

  const result = await Promise.allSettled(
    calendarsToWatch.map(async (sc) => {
      if (!sc.credentialId) return;
      const cc = await CalendarCache.initFromCredentialId(sc.credentialId);
      await cc.watchCalendar({ calendarId: sc.externalId });
    })
  );

  return result;
};

// This cron is used to activate and renew calendar subcriptions
export const GET = defaultResponder(async (request: NextRequest) => {
  validateRequest(request);
  const [watchedResult, unwatchedResult] = await Promise.all([
    handleCalendarsToWatch(request),
    handleCalendarsToUnwatch(request),
  ]);

  // TODO: Credentials can be installed on a whole team, check for selected calendars on the team
  return {
    succeededAt: new Date().toISOString(),
    watched: {
      successful: watchedResult.filter((x) => x.status === "fulfilled").length,
      failed: watchedResult.filter((x) => x.status === "rejected").length,
    },
    unwatched: {
      successful: unwatchedResult.filter((x) => x.status === "fulfilled").length,
      failed: unwatchedResult.filter((x) => x.status === "rejected").length,
    },
  };
});
