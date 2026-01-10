import { trpc } from "@calcom/trpc/react";

import { AtomsWrapper } from "../../src/components/atoms-wrapper";
import { DestinationCalendarSettings } from "../DestinationCalendar";

export const DestinationCalendarSettingsWebWrapper = () => {
  const calendars = trpc.viewer.calendars.connectedCalendars.useQuery();
  const utils = trpc.useUtils();
  const mutation = trpc.viewer.calendars.setDestinationCalendar.useMutation({
    onSuccess: () => {
      utils.viewer.calendars.connectedCalendars.invalidate();
    },
  });

  if (!calendars.data?.connectedCalendars || calendars.data.connectedCalendars.length < 1) {
    return null;
  }

  return (
    <AtomsWrapper>
      <DestinationCalendarSettings
        connectedCalendars={calendars.data.connectedCalendars}
        isPending={mutation.isPending}
        destinationCalendar={calendars.data.destinationCalendar}
        value={calendars.data.destinationCalendar.externalId}
        hidePlaceholder
        onChange={mutation.mutate}
      />
    </AtomsWrapper>
  );
};
