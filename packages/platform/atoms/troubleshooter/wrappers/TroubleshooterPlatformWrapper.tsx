import { useInitalizeTroubleshooterStore } from "@calcom/features/troubleshooter/store";
import useMediaQuery from "@calcom/lib/hooks/useMediaQuery";
import classNames from "@calcom/ui/classNames";
import { AtomsWrapper } from "../../src/components/atoms-wrapper";
import { TroubleshooterSidebar } from "../sidebar/TroubleshooterSidebar";
import { LargeCalendar } from "../large-calendar/LargeCalendar";
import { BookerStoreProvider } from "@calcom/features/bookings/Booker/BookerStoreProvider";

interface TroubleshooterComponentProps {
  month?: string | null;
  onManageCalendarsClick?: () => void;
  onInstallCalendarClick?: () => void;
}

export const TroubleshooterComponent = ({
  month = null,
  onManageCalendarsClick,
  onInstallCalendarClick,
}: TroubleshooterComponentProps): JSX.Element => {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isTablet = useMediaQuery("(max-width: 1024px)");

  useInitalizeTroubleshooterStore({
    month: month,
    isPlatform: true,
  });

  return (
    <AtomsWrapper>
      <>
        <div
          className={classNames(
            "text-default flex min-h-full w-full flex-col items-center overflow-clip",
            isMobile
              ? "[--troubleshooter-meta-width:0px]"
              : "[--troubleshooter-meta-width:250px] lg:[--troubleshooter-meta-width:430px]"
          )}
        >
          <div
            style={{
              display: "grid",
              width: "100%",
              height: "auto",
              gridTemplateAreas: `"meta main"`,
              gridTemplateColumns: "var(--troubleshooter-meta-width) 1fr",
              gridTemplateRows: "auto",
            }}
            className={classNames(
              "bg-default dark:bg-cal-muted text-default min-h-full w-full sm:transition-[width] sm:duration-300"
            )}
          >
            <div className="sticky top-0 z-10 self-start ps-6 [grid-area:meta]">
              <TroubleshooterSidebar
                onManageCalendarsClick={onManageCalendarsClick}
                onInstallCalendarClick={onInstallCalendarClick}
              />
            </div>

            <div className="ml-[-1px] border-subtle [grid-area:main]">
              <LargeCalendar />
            </div>
          </div>
        </div>
      </>
    </AtomsWrapper>
  );
};

interface TroubleshooterPlatformWrapperProps {
  month?: string | null;
  onManageCalendarsClick?: () => void;
  onInstallCalendarClick?: () => void;
}

export const TroubleshooterPlatformWrapper = ({
  month,
  onManageCalendarsClick,
  onInstallCalendarClick,
}: TroubleshooterPlatformWrapperProps): JSX.Element => {
  return (
    <BookerStoreProvider>
      <TroubleshooterComponent
        month={month}
        onManageCalendarsClick={onManageCalendarsClick}
        onInstallCalendarClick={onInstallCalendarClick}
      />
    </BookerStoreProvider>
  );
};
