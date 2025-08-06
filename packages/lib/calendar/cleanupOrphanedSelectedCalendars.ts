import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";

type ConnectedCalendar = {
  integration: { slug: string };
  calendars?: Array<{
    externalId: string;
    integration?: string;
    name?: string;
    primary?: boolean | null;
    readOnly?: boolean;
    isSelected?: boolean;
    credentialId?: number;
    delegationCredentialId?: string | null;
    email?: string;
    primaryEmail?: string;
    integrationTitle?: string;
    [key: string]: any;
  }>;
};

const log = logger.getSubLogger({ prefix: ["cleanupOrphanedSelectedCalendars"] });

export interface UserWithCalendars {
  id: number;
  email: string;
  allSelectedCalendars: {
    externalId: string;
    integration: string;
    eventTypeId: number | null;
    updatedAt: Date | null;
    googleChannelId?: string | null;
  }[];
  userLevelSelectedCalendars: {
    externalId: string;
    integration: string;
    eventTypeId: number | null;
    updatedAt: Date | null;
    googleChannelId?: string | null;
  }[];
  destinationCalendar: {
    id: number;
    integration: string;
    externalId: string;
    primaryEmail: string | null;
    userId: number | null;
    eventTypeId: number | null;
    credentialId: number | null;
    createdAt: Date | null;
    updatedAt: Date | null;
    delegationCredentialId: string | null;
    domainWideDelegationCredentialId: string | null;
  } | null;
}

export async function cleanupOrphanedSelectedCalendars({
  user,
  connectedCalendars,
}: {
  user: UserWithCalendars;
  connectedCalendars: ConnectedCalendar[];
}) {
  try {
    if (!connectedCalendars.length) {
      log.debug(`No connected calendars for user ${user.id}, skipping cleanup`);
      return;
    }

    const userSelectedCalendars = await prisma.selectedCalendar.findMany({
      where: {
        userId: user.id,
      },
      select: {
        id: true,
        externalId: true,
      },
    });

    const orphanedCalendars = userSelectedCalendars.filter((selectedCalendar) => {
      return !connectedCalendars.some((connectedCalendar) =>
        connectedCalendar.calendars?.some(
          (calendar: any) => calendar.externalId === selectedCalendar.externalId
        )
      );
    });

    if (orphanedCalendars.length > 0) {
      log.info(`Cleaning up ${orphanedCalendars.length} orphaned calendars for user ${user.id}`);
      await prisma.selectedCalendar.deleteMany({
        where: {
          id: {
            in: orphanedCalendars.map((calendar) => calendar.id),
          },
        },
      });
    } else {
      log.debug(`No orphaned calendars found for user ${user.id}`);
    }
  } catch (error) {
    log.error(`Error cleaning up orphaned calendars for user ${user.id}:`, error);
  }
}
