import type { DestinationCalendar } from "@prisma/client";

import { getCalendarCredentials, getConnectedCalendars } from "@calcom/core/CalendarManager";
import { prisma } from "@calcom/prisma";
import { AppCategories } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TConnectedCalendarsInputSchema } from "./connectedCalendars.schema";

type ConnectedCalendarsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TConnectedCalendarsInputSchema;
};

export const connectedCalendarsHandler = async ({ ctx, input }: ConnectedCalendarsOptions) => {
  const { user } = ctx;
  const onboarding = input?.onboarding || false;

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
  let toggledCalendarDetails:
    | {
        externalId: string;
        integration: string;
      }
    | undefined;

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
    // Select the first calendar matching the primary by default since that will also be the destination calendar
    if (onboarding && externalId) {
      const calendarIndex = (connectedCalendars[0].calendars || []).findIndex(
        (item) => item.externalId === externalId && item.integration === integration
      );
      if (calendarIndex >= 0 && connectedCalendars[0].calendars) {
        connectedCalendars[0].calendars[calendarIndex].isSelected = true;
        toggledCalendarDetails = {
          externalId,
          integration,
        };
      }
    }
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
      // Select the first calendar matching the primary by default since that will also be the destination calendar
      if (onboarding && externalId) {
        const calendarIndex = (connectedCalendars[0].calendars || []).findIndex(
          (item) => item.externalId === externalId && item.integration === integration
        );
        if (calendarIndex >= 0 && connectedCalendars[0].calendars) {
          connectedCalendars[0].calendars[calendarIndex].isSelected = true;
          toggledCalendarDetails = {
            externalId,
            integration,
          };
        }
      }
      user.destinationCalendar = await prisma.destinationCalendar.update({
        where: { userId: user.id },
        data: {
          integration,
          externalId,
        },
      });
    } else if (onboarding && !destinationCal.isSelected) {
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
          toggledCalendarDetails = {
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
  if (toggledCalendarDetails) {
    await prisma.selectedCalendar.upsert({
      where: {
        userId_integration_externalId: {
          userId: user.id,
          integration: toggledCalendarDetails.integration,
          externalId: toggledCalendarDetails.externalId,
        },
      },
      create: {
        userId: user.id,
        integration: toggledCalendarDetails.integration,
        externalId: toggledCalendarDetails.externalId,
      },
      // already exists
      update: {},
    });
  }

  return {
    connectedCalendars,
    destinationCalendar: {
      ...(user.destinationCalendar as DestinationCalendar),
      ...destinationCalendar,
    },
  };
};
