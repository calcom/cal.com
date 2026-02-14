import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Skeleton } from "@calcom/ui/components/skeleton";
import { CalendarToggleContainer } from "./CalendarToggleContainer";
import { EventScheduleItem } from "./EventScheduleItem";
import { EventTypeSelect } from "./EventTypeSelect";

const SidebarHeading = ({ name }: { name: string }): JSX.Element => {
  return (
    <Skeleton
      title={name}
      as="p"
      className="max-w-36 min-h-4 truncate font-semibold"
      loadingClassName="ms-3"
    >
      {name}
    </Skeleton>
  );
};

interface TroubleshooterSidebarProps {
  onManageCalendarsClick?: () => void;
  onInstallCalendarClick?: () => void;
}

export const TroubleshooterSidebar = ({
  onManageCalendarsClick,
  onInstallCalendarClick,
}: TroubleshooterSidebarProps): JSX.Element => {
  const { t } = useLocale();

  return (
    <div className="relative z-10 hidden h-screen w-full flex-col gap-6 overflow-y-auto py-6 pl-4 pr-6 sm:flex md:pl-0">
      <SidebarHeading name={t("troubleshooter")} />
      <EventTypeSelect />
      <EventScheduleItem />
      <CalendarToggleContainer
        onManageCalendarsClick={onManageCalendarsClick}
        onInstallCalendarClick={onInstallCalendarClick}
      />
    </div>
  );
};
