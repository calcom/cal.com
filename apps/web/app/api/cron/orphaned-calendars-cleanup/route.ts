import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getCalendarCredentials, getConnectedCalendars } from "@calcom/lib/CalendarManager";
import { cleanupOrphanedSelectedCalendars } from "@calcom/lib/calendar/cleanupOrphanedSelectedCalendars";
import { enrichUserWithDelegationCredentialsIncludeServiceAccountKey } from "@calcom/lib/delegationCredential/server";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";
import { AppCategories } from "@calcom/prisma/enums";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";

import { defaultResponderForAppDir } from "../../defaultResponderForAppDir";

const BATCH_SIZE = 50;
const log = logger.getSubLogger({ prefix: ["[api]", "[cron]", "[orphaned-calendars-cleanup]"] });

const validateRequest = (req: NextRequest) => {
  const url = new URL(req.url);
  const apiKey = req.headers.get("authorization") || url.searchParams.get("apiKey");
  if (![process.env.CRON_API_KEY, `Bearer ${process.env.CRON_SECRET}`].includes(`${apiKey}`)) {
    throw new HttpError({ statusCode: 401, message: "Unauthorized" });
  }
};

async function processUserForCleanup(user: {
  id: number;
  email: string;
  allSelectedCalendars: any[];
  userLevelSelectedCalendars: any[];
  destinationCalendar: any;
}) {
  try {
    const userCredentials = await prisma.credential.findMany({
      where: {
        userId: user.id,
        app: {
          categories: { has: AppCategories.calendar },
          enabled: true,
        },
      },
      select: credentialForCalendarServiceSelect,
    });

    if (userCredentials.length === 0) {
      log.debug(`No calendar credentials found for user ${user.id}, skipping cleanup`);
      return;
    }

    const { credentials: allCredentials } = await enrichUserWithDelegationCredentialsIncludeServiceAccountKey(
      {
        user: { id: user.id, email: user.email, credentials: userCredentials },
      }
    );

    const calendarCredentials = getCalendarCredentials(allCredentials);

    if (calendarCredentials.length === 0) {
      log.debug(`No calendar credentials found for user ${user.id}, skipping cleanup`);
      return;
    }

    const getConnectedCalendarsResult = await getConnectedCalendars(
      calendarCredentials,
      user.userLevelSelectedCalendars,
      user.destinationCalendar?.externalId
    );

    const connectedCalendars = getConnectedCalendarsResult.connectedCalendars;

    await cleanupOrphanedSelectedCalendars({
      user,
      connectedCalendars,
    });

    log.debug(`Completed cleanup for user ${user.id}`);
  } catch (error) {
    log.error(`Error processing user ${user.id} for cleanup:`, safeStringify(error));
    throw error;
  }
}

export async function handleOrphanedCalendarsCleanup() {
  const usersWithSelectedCalendars = await prisma.user.findMany({
    where: {
      selectedCalendars: {
        some: {},
      },
    },
    include: {
      selectedCalendars: {
        select: {
          externalId: true,
          integration: true,
          eventTypeId: true,
          updatedAt: true,
          googleChannelId: true,
        },
      },
      destinationCalendar: true,
    },
    take: BATCH_SIZE,
  });

  log.info(`Found ${usersWithSelectedCalendars.length} users with selected calendars to process`);

  if (!usersWithSelectedCalendars.length) {
    const message = "No users with selected calendars found";
    log.info(message);
    return {
      message,
      success: 0,
      failures: 0,
    };
  }

  let totalSuccess = 0;
  let totalFailures = 0;

  const results = await Promise.allSettled(
    usersWithSelectedCalendars.map((user) =>
      processUserForCleanup({
        id: user.id,
        email: user.email,
        allSelectedCalendars: user.selectedCalendars,
        userLevelSelectedCalendars: user.selectedCalendars.filter((cal) => cal.eventTypeId === null),
        destinationCalendar: user.destinationCalendar,
      })
    )
  );

  totalSuccess = results.filter((r) => r.status === "fulfilled").length;
  totalFailures = results.filter((r) => r.status === "rejected").length;

  log.info(
    `Completed orphaned calendars cleanup. Total Success: ${totalSuccess}, Total Failures: ${totalFailures}`
  );

  return {
    message: "Orphaned calendars cleanup completed",
    executedAt: new Date().toISOString(),
    success: totalSuccess,
    failures: totalFailures,
  };
}

const handler = async (request: NextRequest) => {
  validateRequest(request);
  return NextResponse.json(await handleOrphanedCalendarsCleanup());
};

export const GET = defaultResponderForAppDir(handler);
