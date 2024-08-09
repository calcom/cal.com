import { useUpdateDestinationCalendars } from "../../hooks/calendars/useUpdateDestinationCalendars";
import { useConnectedCalendars } from "../../hooks/useConnectedCalendars";
import { AtomsWrapper } from "../../src/components/atoms-wrapper";
import { DestinationCalendarSettings } from "../DestinationCalendar";

export const DestinationCalendarSettingsPlatformWrapper = () => {
  const calendars = useConnectedCalendars({});
  const { mutate: updateDestinationCalendars, isPending: isUpdatingCalendar } =
    useUpdateDestinationCalendars();

  if (!calendars.data?.connectedCalendars) {
    return null;
  }

  return (
    <AtomsWrapper>
      <DestinationCalendarSettings
        connectedCalendars={calendars.data.connectedCalendars}
        destinationCalendar={calendars.data.destinationCalendar}
        value={calendars.data.destinationCalendar.externalId}
        hidePlaceholder
        hideAdvancedText
        onChange={async ({ externalId, integration }) => {
          await updateDestinationCalendars({ integration, externalId });
        }}
        isPending={isUpdatingCalendar}
      />
    </AtomsWrapper>
  );
};
