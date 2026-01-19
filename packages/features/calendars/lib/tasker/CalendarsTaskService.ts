import type { ITaskerDependencies } from "@calcom/lib/tasker/types";
import type { PrismaClient } from "@calcom/prisma";

import { UserRepository } from "../../../users/repositories/UserRepository";
import type { CalendarsTasks } from "./types";

export interface ICalendarsTaskServiceDependencies {
  prisma: PrismaClient;
}

export class CalendarsTaskService implements CalendarsTasks {
  constructor(
    public readonly dependencies: {
      logger: ITaskerDependencies["logger"];
    } & ICalendarsTaskServiceDependencies
  ) {}

  async ensureDefaultCalendars(
    payload: Parameters<CalendarsTasks["ensureDefaultCalendars"]>[0]
  ): Promise<void> {
    const { userId } = payload;
    const { prisma, logger } = this.dependencies;

    try {
      const userRepository = new UserRepository(prisma);
      const userWithCalendars = await userRepository.findByIdWithSelectedCalendars({ userId });

      if (!userWithCalendars) {
        logger.error(`User not found for ensureDefaultCalendars`, { userId });
        return;
      }

      const { getConnectedDestinationCalendarsAndEnsureDefaultsInDb } = await import(
        "@calcom/features/calendars/lib/getConnectedDestinationCalendars"
      );

      await getConnectedDestinationCalendarsAndEnsureDefaultsInDb({
        user: {
          ...userWithCalendars,
          allSelectedCalendars: userWithCalendars.selectedCalendars,
          userLevelSelectedCalendars: userWithCalendars.selectedCalendars.filter(
            (calendar) => !calendar.eventTypeId
          ),
        },
        onboarding: true,
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
