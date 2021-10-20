import _ from "lodash";

import { getErrorFromUnknown } from "@lib/errors";

import getCalendarCredentials from "./getCalendarCredentials";

export default async function getConnectedCalendars(
  calendarCredentials: ReturnType<typeof getCalendarCredentials>,
  selectedCalendars: { externalId: string }[]
) {
  const connectedCalendars = await Promise.all(
    calendarCredentials.map(async (item) => {
      const { adapter, integration, credential } = item;

      const credentialId = credential.id;
      try {
        const cals = await adapter.listCalendars();
        const calendars = _(cals)
          .map((cal) => ({
            ...cal,
            primary: cal.primary || null,
            isSelected: selectedCalendars.some((selected) => selected.externalId === cal.externalId),
          }))
          .sortBy(["primary"])
          .value();
        const primary = calendars.find((item) => item.primary) ?? calendars[0];
        if (!primary) {
          throw new Error("No primary calendar found");
        }
        return {
          integration,
          credentialId,
          primary,
          calendars,
        };
      } catch (_error) {
        const error = getErrorFromUnknown(_error);
        return {
          integration,
          credentialId,
          error: {
            message: error.message,
          },
        };
      }
    })
  );

  return connectedCalendars;
}
