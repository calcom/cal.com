import { useUpdateDestinationCalendars } from "../../hooks/calendars/useUpdateDestinationCalendars";
import { useConnectedCalendars } from "../../hooks/useConnectedCalendars";
import { AtomsWrapper } from "../../src/components/atoms-wrapper";
import { DestinationCalendarSettings } from "../DestinationCalendar";

export const DestinationCalendarSettingsPlatformWrapper = ({
  statusLoader,
  classNames = "mx-5",
  isDryRun = false,
}: {
  statusLoader?: JSX.Element;
  classNames?: string;
  isDryRun?: boolean;
}) => {
  const calendars = useConnectedCalendars({});
  const { mutate: updateDestinationCalendars, isPending: isUpdatingCalendar } =
    useUpdateDestinationCalendars();

  if (calendars.isLoading) {
    return (
      <AtomsWrapper>
        <>
          {statusLoader}
          {!statusLoader && <h1 className="m-5 text-xl font-semibold">Loading...</h1>}
        </>
      </AtomsWrapper>
    );
  }

  if (!calendars.data?.connectedCalendars || calendars.data.connectedCalendars.length < 1) {
    return null;
  }

  return (
    <AtomsWrapper>
      <DestinationCalendarSettings
        classNames={classNames}
        connectedCalendars={calendars.data.connectedCalendars}
        destinationCalendar={calendars.data.destinationCalendar}
        value={calendars.data.destinationCalendar.externalId}
        hidePlaceholder
        hideAdvancedText
        onChange={async ({ externalId, integration, delegationCredentialId }) => {
          if (!isDryRun) {
            await updateDestinationCalendars({
              integration,
              externalId,
              delegationCredentialId,
            });
          }
        }}
        isPending={isUpdatingCalendar}
      />
    </AtomsWrapper>
  );
};
