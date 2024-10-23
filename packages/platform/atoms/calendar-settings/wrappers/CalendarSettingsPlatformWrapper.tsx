import { DestinationCalendarSettingsPlatformWrapper } from "../../destination-calendar/index";
import { SelectedCalendarsSettingsPlatformWrapper } from "../../selected-calendars/index";
import type { CalendarRedirectUrls } from "../../selected-calendars/wrappers/SelectedCalendarsSettingsPlatformWrapper";

type CalendarSettingsPlatformWrapperProps = {
  classNames?: {
    calendarSettingsCustomClassnames?: string;
    destinationCalendarSettingsCustomClassnames?: string;
    selectedCalendarSettingsCustomClassnames?: string;
  };
  calendarRedirectUrls?: CalendarRedirectUrls;
};

export const CalendarSettingsPlatformWrapper = ({
  classNames,
  calendarRedirectUrls,
}: CalendarSettingsPlatformWrapperProps) => {
  return (
    <div className={classNames?.calendarSettingsCustomClassnames}>
      <DestinationCalendarSettingsPlatformWrapper
        statusLoader={<></>}
        classNames={classNames?.destinationCalendarSettingsCustomClassnames}
      />
      <SelectedCalendarsSettingsPlatformWrapper
        classNames={classNames?.selectedCalendarSettingsCustomClassnames}
        calendarRedirectUrls={calendarRedirectUrls}
      />
    </div>
  );
};
