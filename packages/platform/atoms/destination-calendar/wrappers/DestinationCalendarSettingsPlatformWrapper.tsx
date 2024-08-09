import { useUpdateDestinationCalendar } from "../../hooks/calendars/useUpdateDestinationCalendar";
import { useConnectedCalendars } from "../../hooks/useConnectedCalendars";
import { AtomsWrapper } from "../../src/components/atoms-wrapper";
import { DestinationCalendarSettings } from "../DestinationCalendar";

export const DestinationCalendarSettingsPlatformWrapper = () => {
  const calendars = useConnectedCalendars({});
  const { mutate: updateDestinationCalendar, isPending: isUpdatingCalendar } = useUpdateDestinationCalendar();

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
          console.log("changing values now", externalId, "external id", integration, "integration");
          await updateDestinationCalendar({ integration, externalId });
        }}
        isPending={isUpdatingCalendar}
      />
    </AtomsWrapper>
  );
};
