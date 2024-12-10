import { getCalendarCredentials, getConnectedCalendars } from "@calcom/core/CalendarManager";
import logger from "@calcom/lib/logger";
import type { PrismaClient } from "@calcom/prisma";
import prisma from "@calcom/prisma";
import type { DestinationCalendar, SelectedCalendar, User } from "@calcom/prisma/client";
import { AppCategories } from "@calcom/prisma/enums";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";

import { SelectedCalendarRepository } from "./server/repository/selectedCalendar";

const log = logger.getSubLogger({ prefix: ["getConnectedDestinationCalendarsAndEnsureDefaultsInDb"] });

type ReturnTypeGetConnectedCalendars = Awaited<ReturnType<typeof getConnectedCalendars>>;
type ConnectedCalendarsFromGetConnectedCalendars = ReturnTypeGetConnectedCalendars["connectedCalendars"];

export type UserWithCalendars = Pick<User, "id"> & {
  allSelectedCalendars: Pick<SelectedCalendar, "externalId" | "integration" | "eventTypeId">[];
  userLevelSelectedCalendars: Pick<SelectedCalendar, "externalId" | "integration" | "eventTypeId">[];
  destinationCalendar: DestinationCalendar | null;
};

export type ConnectedDestinationCalendars = Awaited<
  ReturnType<typeof getConnectedDestinationCalendarsAndEnsureDefaultsInDb>
>;

async function handleNoConnectedCalendars(user: UserWithCalendars) {
  log.debug(`No connected calendars, deleting destination calendar if it exists for user ${user.id}`);

  if (!user.destinationCalendar) return user;
  await prisma.destinationCalendar.delete({
    where: { userId: user.id },
  });

  return {
    ...user,
    destinationCalendar: null,
  };
}

type ToggledCalendarDetails = {
  externalId: string;
  integration: string;
};

async function handleNoDestinationCalendar({
  user,
  connectedCalendars,
  onboarding,
}: {
  user: UserWithCalendars;
  connectedCalendars: ConnectedCalendarsFromGetConnectedCalendars;
  onboarding: boolean;
}) {
  if (!connectedCalendars.length) {
    throw new Error("No connected calendars");
  }
  const updatedConnectedCalendars = connectedCalendars.map((connectedCalendar) => ({
    ...connectedCalendar,
  }));

  // This is the calendar that we will ensure is enabled for conflict check
  let calendarToEnsureIsEnabledForConflictCheck: ToggledCalendarDetails | null = null;

  log.debug(
    `There are connected calendars, but no destination calendar, so create a default destination calendar in DB for user ${user.id}`
  );
  /*
    So create a default destination calendar with the first primary connected calendar
    */
  const {
    integration = "",
    externalId = "",
    credentialId,
    email: primaryEmail,
  } = updatedConnectedCalendars[0].primary ?? {};

  // Select the first calendar matching the primary by default since that will also be the destination calendar
  if (onboarding && externalId) {
    const calendarIndex = (updatedConnectedCalendars[0].calendars || []).findIndex(
      (item) => item.externalId === externalId && item.integration === integration
    );
    if (calendarIndex >= 0 && updatedConnectedCalendars[0].calendars) {
      updatedConnectedCalendars[0].calendars[calendarIndex].isSelected = true;
      calendarToEnsureIsEnabledForConflictCheck = {
        externalId,
        integration,
      };
    }
  }

  const updatedUser = { ...user };

  updatedUser.destinationCalendar = await prisma.destinationCalendar.create({
    data: {
      userId: user.id,
      integration,
      externalId,
      credentialId,
      primaryEmail,
    },
  });

  return {
    updatedUser,
    updatedConnectedCalendars,
    calendarToEnsureIsEnabledForConflictCheck,
  };
}

async function handleDestinationCalendarNotInConnectedCalendars({
  user,
  connectedCalendars,
  onboarding,
}: {
  user: UserWithCalendars;
  connectedCalendars: ConnectedCalendarsFromGetConnectedCalendars;
  onboarding: boolean;
}) {
  const updatedUser = { ...user };
  const updatedConnectedCalendars = connectedCalendars.map((connectedCalendar) => ({
    ...connectedCalendar,
  }));
  let calendarToEnsureIsEnabledForConflictCheck: ToggledCalendarDetails | null = null;
  log.debug(
    `Destination calendar isn't in connectedCalendars, update it to the first primary connected calendar for user ${user.id}`
  );
  const {
    integration = "",
    externalId = "",
    email: primaryEmail,
  } = updatedConnectedCalendars[0].primary ?? {};
  // Select the first calendar matching the primary by default since that will also be the destination calendar
  if (onboarding && externalId) {
    const calendarIndex = (updatedConnectedCalendars[0].calendars || []).findIndex(
      (item) => item.externalId === externalId && item.integration === integration
    );
    if (calendarIndex >= 0 && updatedConnectedCalendars[0].calendars) {
      updatedConnectedCalendars[0].calendars[calendarIndex].isSelected = true;
      calendarToEnsureIsEnabledForConflictCheck = {
        externalId,
        integration,
      };
    }
  }

  updatedUser.destinationCalendar = await prisma.destinationCalendar.update({
    where: { userId: user.id },
    data: {
      integration,
      externalId,
      primaryEmail,
    },
  });

  return {
    updatedUser,
    updatedConnectedCalendars,
    calendarToEnsureIsEnabledForConflictCheck,
  };
}

function findMatchingCalendar({
  connectedCalendars,
  calendar,
}: {
  connectedCalendars: ConnectedCalendarsFromGetConnectedCalendars;
  calendar: DestinationCalendar;
}) {
  // Check if destinationCalendar exists in connectedCalendars
  const allCals = connectedCalendars.map((cal) => cal.calendars ?? []).flat();
  const matchingCalendar = allCals.find(
    (cal) => cal.externalId === calendar.externalId && cal.integration === calendar.integration
  );
  return matchingCalendar;
}

async function ensureSelectedCalendarIsInDb({
  user,
  selectedCalendar,
  eventTypeId,
}: {
  user: UserWithCalendars;
  selectedCalendar: {
    integration: string;
    externalId: string;
  };
  eventTypeId: number | null;
}) {
  console.log(
    `Upsert the selectedCalendar record to the DB for user ${user.id} with details ${JSON.stringify(
      selectedCalendar
    )}`
  );

  await SelectedCalendarRepository.createIfNotExists({
    userId: user.id,
    integration: selectedCalendar.integration,
    externalId: selectedCalendar.externalId,
    eventTypeId,
  });
}

/**
 * Fetches the calendars for the authenticated user or the event-type if provided
 * It also takes care of updating the destination calendar in some edge cases
 */
export async function getConnectedDestinationCalendarsAndEnsureDefaultsInDb({
  user,
  onboarding,
  eventTypeId,
  prisma,
}: {
  user: UserWithCalendars;
  onboarding: boolean;
  eventTypeId?: number | null;
  prisma: PrismaClient;
}) {
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

  const eventTypeSelectedCalendars = user.allSelectedCalendars.filter(
    (selectedCalendar) => selectedCalendar.eventTypeId === eventTypeId
  );

  const userSelectedCalendars = user.userLevelSelectedCalendars;

  const selectedCalendars = eventTypeId ? eventTypeSelectedCalendars : userSelectedCalendars;

  // get user's credentials + their connected integrations
  const calendarCredentials = getCalendarCredentials(userCredentials);

  // get all the connected integrations' calendars (from third party)
  const { connectedCalendars, destinationCalendar } = await getConnectedCalendars(
    calendarCredentials,
    selectedCalendars,
    user.destinationCalendar?.externalId
  );

  let calendarToEnsureIsEnabledForConflictCheck: ToggledCalendarDetails | null = null;

  let updatedUser: UserWithCalendars = user;
  let updatedConnectedCalendars: ConnectedCalendarsFromGetConnectedCalendars = connectedCalendars;
  if (updatedConnectedCalendars.length === 0) {
    updatedUser = await handleNoConnectedCalendars(user);
  } else if (!user.destinationCalendar) {
    ({ updatedUser, calendarToEnsureIsEnabledForConflictCheck, updatedConnectedCalendars } =
      await handleNoDestinationCalendar({
        user,
        connectedCalendars,
        onboarding,
      }));
  } else {
    /* There are connected calendars and a destination calendar */
    log.debug(
      `There are connected calendars and a destination calendar, so check if destinationCalendar exists in connectedCalendars for user ${user.id}`
    );

    const destinationCal = findMatchingCalendar({ connectedCalendars, calendar: user.destinationCalendar });
    if (!destinationCal) {
      ({ updatedUser, calendarToEnsureIsEnabledForConflictCheck, updatedConnectedCalendars } =
        await handleDestinationCalendarNotInConnectedCalendars({
          user,
          connectedCalendars,
          onboarding,
        }));
    } else if (onboarding && !destinationCal.isSelected) {
      log.debug(
        `Onboarding:Destination calendar is not selected, but in connectedCalendars, so mark it as selected in the calendar list for user ${user.id}`
      );
      // Mark the destination calendar as selected in the calendar list
      // We use every so that we can exit early once we find the matching calendar
      connectedCalendars.every((cal) => {
        const index = (cal.calendars || []).findIndex(
          (calendar) =>
            calendar.externalId === destinationCal.externalId &&
            calendar.integration === destinationCal.integration
        );
        if (index >= 0 && cal.calendars) {
          cal.calendars[index].isSelected = true;
          calendarToEnsureIsEnabledForConflictCheck = {
            externalId: destinationCal.externalId,
            integration: destinationCal.integration || "",
          };
          return false;
        }

        return true;
      });
    }
  }

  // Insert the newly toggled record to the DB
  if (calendarToEnsureIsEnabledForConflictCheck) {
    await ensureSelectedCalendarIsInDb({
      user,
      selectedCalendar: calendarToEnsureIsEnabledForConflictCheck,
      eventTypeId: eventTypeId ?? null,
    });
  }

  return {
    connectedCalendars,
    destinationCalendar: {
      ...(updatedUser.destinationCalendar as DestinationCalendar),
      ...destinationCalendar,
    },
  };
}

// Legacy export for @calcom/platform-libraries
export const getConnectedDestinationCalendars = getConnectedDestinationCalendarsAndEnsureDefaultsInDb;
