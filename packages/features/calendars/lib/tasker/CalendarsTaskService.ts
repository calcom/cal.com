import type { ITaskerDependencies } from "@calcom/lib/tasker/types";
import type { PrismaClient } from "@calcom/prisma";

import type { CalendarsTasks } from "./types";

export interface ICalendarsTaskServiceDependencies {
  prisma: PrismaClient;
}

export class CalendarsTaskService implements CalendarsTasks {
  constructor(
    public readonly dependencies: { logger: ITaskerDependencies["logger"] } & ICalendarsTaskServiceDependencies
  ) {}

  async ensureDefaultCalendars(
    payload: Parameters<CalendarsTasks["ensureDefaultCalendars"]>[0]
  ): Promise<void> {
    const { userId } = payload;
    const { prisma, logger } = this.dependencies;

    try {
      const userWithCalendars = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          username: true,
          timeZone: true,
          selectedCalendars: true,
          destinationCalendar: true,
          credentials: {
            select: {
              id: true,
              type: true,
              key: true,
              userId: true,
              teamId: true,
              appId: true,
              invalid: true,
              user: {
                select: {
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!userWithCalendars) {
        logger.error(`User not found for ensureDefaultCalendars`, { userId });
        return;
      }

      const { getConnectedDestinationCalendarsAndEnsureDefaultsInDb } = await import(
        "@calcom/platform-libraries"
      );

      await getConnectedDestinationCalendarsAndEnsureDefaultsInDb({
        user: {
          ...userWithCalendars,
          allSelectedCalendars: userWithCalendars.selectedCalendars,
          userLevelSelectedCalendars: userWithCalendars.selectedCalendars.filter(
            (calendar) => !calendar.eventTypeId
          ),
        },
        onboarding: false,
        eventTypeId: null,
        prisma,
      });

      logger.info("Successfully ensured default calendars for user", { userId });
    } catch (err) {
      logger.error(`Failed to ensure default calendars for user`, {
        userId,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }
}
