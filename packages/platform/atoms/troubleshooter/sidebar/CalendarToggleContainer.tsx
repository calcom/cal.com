import { CalendarToggleContainerComponent } from "@calcom/features/troubleshooter/components/CalendarToggleContainerComponent";
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
