import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import { getCredentialForCalendarCache } from "@calcom/lib/delegationCredential/server";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";
import prisma from "@calcom/prisma";

const log = logger.getSubLogger({ prefix: ["CalendarSyncCleanup"] });

async function postHandler(request: NextRequest) {
  const apiKey = request.headers.get("authorization") || request.nextUrl.searchParams.get("apiKey");

  if (![process.env.CRON_API_KEY, `Bearer ${process.env.CRON_SECRET}`].includes(`${apiKey}`)) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  log.info("Starting calendar sync cleanup");

  let totalOrphanedRemoved = 0;
  let totalUsersProcessed = 0;
  let totalErrors = 0;

  try {
    const credentials = await prisma.credential.findMany({
      where: {
        type: {
          in: ["google_calendar", "office365_calendar", "apple_calendar", "caldav_calendar"],
        },
        invalid: false,
      },
      include: {
        selectedCalendars: true,
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    log.info(`Found ${credentials.length} calendar credentials to process`);

    for (const credential of credentials) {
      if (!credential.selectedCalendars.length) {
        continue;
      }

      totalUsersProcessed++;

      try {
        const credentialForCalendarCache = await getCredentialForCalendarCache({
          credentialId: credential.id,
        });
        const calendarService = await getCalendar(credentialForCalendarCache);

        if (!calendarService?.listCalendars) {
          log.warn(`Calendar service for ${credential.type} does not support listCalendars`);
          continue;
        }

        const providerCalendars = await calendarService.listCalendars();
        const providerCalendarIds = new Set(providerCalendars.map((cal) => cal.externalId));

        const orphanedCalendars = credential.selectedCalendars.filter(
          (selectedCal) => !providerCalendarIds.has(selectedCal.externalId)
        );

        if (orphanedCalendars.length > 0) {
          log.info(
            `Found ${orphanedCalendars.length} orphaned calendars for user ${credential.user?.email}`,
            safeStringify({
              userId: credential.userId,
              credentialId: credential.id,
              integration: credential.type,
              orphanedCalendarIds: orphanedCalendars.map((cal) => cal.externalId),
            })
          );

          for (const orphanedCalendar of orphanedCalendars) {
            await SelectedCalendarRepository.deleteById({
              id: orphanedCalendar.id,
            });
            totalOrphanedRemoved++;
          }
        }
      } catch (error) {
        totalErrors++;
        log.error(
          `Error processing calendar sync cleanup for credential ${credential.id}`,
          safeStringify({
            credentialId: credential.id,
            userId: credential.userId,
            integration: credential.type,
            error: error instanceof Error ? error.message : "Unknown error",
          })
        );
      }
    }

    log.info("Calendar sync cleanup completed", {
      totalUsersProcessed,
      totalOrphanedRemoved,
      totalErrors,
    });

    return NextResponse.json({
      ok: true,
      totalUsersProcessed,
      totalOrphanedRemoved,
      totalErrors,
    });
  } catch (error) {
    log.error("Calendar sync cleanup failed", safeStringify({ error }));
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export const POST = defaultResponderForAppDir(postHandler);
