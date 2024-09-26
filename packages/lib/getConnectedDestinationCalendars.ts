import { getCalendarCredentials, getConnectedCalendars } from "@calcom/core/CalendarManager";
import type { PrismaClient } from "@calcom/prisma";
import type { DestinationCalendar, SelectedCalendar, User } from "@calcom/prisma/client";
import { AppCategories } from "@calcom/prisma/enums";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";

export type UserWithCalendars = Pick<User, "id"> & {
  selectedCalendars: Pick<SelectedCalendar, "externalId" | "integration">[];
  destinationCalendar: DestinationCalendar | null;
};

export type ConnectedDestinationCalendars = Awaited<ReturnType<typeof getConnectedDestinationCalendars>>;

export async function getConnectedDestinationCalendars(
  user: UserWithCalendars,
  onboarding: boolean,
  prisma: PrismaClient
) {
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
    const {
      integration = "",
      externalId = "",
      credentialId,
      email: primaryEmail,
    } = connectedCalendars[0].primary ?? {};
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
        primaryEmail,
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
      const { integration = "", externalId = "", email: primaryEmail } = connectedCalendars[0].primary ?? {};
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
          primaryEmail,
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
}
