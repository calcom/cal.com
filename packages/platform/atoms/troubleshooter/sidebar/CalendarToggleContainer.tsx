import { CalendarToggleContainerComponent } from "@calcom/web/modules/troubleshooter/components/CalendarToggleContainer";
import { useConnectedCalendars } from "../../hooks/useConnectedCalendars";

export function CalendarToggleContainer(): JSX.Element {
  const calendars = useConnectedCalendars({});

  return (
    <CalendarToggleContainerComponent
      connectedCalendars={calendars.data?.connectedCalendars ?? []}
      isLoading={calendars.isLoading}
      showManageCalendarsButton={false}
    />
  );
}
