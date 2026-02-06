import { CalendarToggleContainerComponent } from "@calcom/features/troubleshooter/components/CalendarToggleContainerComponent";
import { useConnectedCalendars } from "../../hooks/useConnectedCalendars";

interface CalendarToggleContainerProps {
  onManageCalendarsClick?: () => void;
  onInstallCalendarClick?: () => void;
}

export function CalendarToggleContainer({
  onManageCalendarsClick,
  onInstallCalendarClick,
}: CalendarToggleContainerProps): JSX.Element {
  const calendars = useConnectedCalendars({});

  return (
    <CalendarToggleContainerComponent
      connectedCalendars={calendars.data?.connectedCalendars ?? []}
      isLoading={calendars.isLoading}
      {...(onManageCalendarsClick
        ? { manageCalendarsAction: { onClick: onManageCalendarsClick } }
        : {})}
      {...(onInstallCalendarClick
        ? { installCalendarAction: { onClick: onInstallCalendarClick } }
        : {})}
    />
  );
}
