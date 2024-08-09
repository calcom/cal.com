import { trpc } from "@calcom/trpc/react";

import { AtomsWrapper } from "../../src/components/atoms-wrapper";
import { DestinationCalendarSettings } from "../DestinationCalendar";

export const DestinationCalendarSettingsWebWrapper = () => {
  const calendars = trpc.viewer.connectedCalendars.useQuery();
  const utils = trpc.useUtils();
  const mutation = trpc.viewer.setDestinationCalendar.useMutation({
    onSuccess: () => {
      utils.viewer.connectedCalendars.invalidate();
    },
  });

  if (!calendars.data?.connectedCalendars) {
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
        hideAdvancedText
        onChange={mutation.mutate}
      />
    </AtomsWrapper>
  );
};
