import type { DestinationCalendar } from "@prisma/client";
import { AppCategories } from "@prisma/client";

import { getCalendarCredentials, getConnectedCalendars } from "@calcom/core/CalendarManager";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

type ConnectedCalendarsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const connectedCalendarsHandler = async ({ ctx }: ConnectedCalendarsOptions) => {
  const { user } = ctx;

  const userCredentials = await prisma.credential.findMany({
    where: {
      userId: ctx.user.id,
      app: {
        categories: { has: AppCategories.calendar },
        enabled: true,
      },
    },
  });

  // get user's credentials + their connected integrations
  const calendarCredentials = getCalendarCredentials(userCredentials);

  // get all the connected integrations' calendars (from third party)
  const { connectedCalendars, destinationCalendar } = await getConnectedCalendars(
    calendarCredentials,
    user.selectedCalendars,
    user.destinationCalendar?.externalId
  );

  if (connectedCalendars.length === 0) {
    /* As there are no connected calendars, delete the destination calendar if it exists */
    if (user.destinationCalendar) {
      await prisma.destinationCalendar.delete({
        where: { userId: user.id },
      });
      user.destinationCalendar = null;
    }
  } else if (!user.destinationCalendar) {
    /*
      There are connected calendars, but no destination calendar
      So create a default destination calendar with the first primary connected calendar
      */
    const { integration = "", externalId = "", credentialId } = connectedCalendars[0].primary ?? {};
    user.destinationCalendar = await prisma.destinationCalendar.create({
      data: {
        userId: user.id,
        integration,
        externalId,
        credentialId,
      },
    });
  } else {
    /* There are connected calendars and a destination calendar */

    // Check if destinationCalendar exists in connectedCalendars
    const allCals = connectedCalendars.map((cal) => cal.calendars ?? []).flat();
    const destinationCal = allCals.find(
      (cal) =>
        cal.externalId === user.destinationCalendar?.externalId &&
        cal.integration === user.destinationCalendar?.integration
    );

    if (!destinationCal) {
      // If destinationCalendar is out of date, update it with the first primary connected calendar
      const { integration = "", externalId = "" } = connectedCalendars[0].primary ?? {};
      user.destinationCalendar = await prisma.destinationCalendar.update({
        where: { userId: user.id },
        data: {
          integration,
          externalId,
        },
      });
    }
  }

  return {
    connectedCalendars,
    destinationCalendar: {
      ...(user.destinationCalendar as DestinationCalendar),
      ...destinationCalendar,
    },
  };
};
