import { DestinationCalendarSettingsPlatformWrapper } from "../../destination-calendar/index";
import { SelectedCalendarsSettingsPlatformWrapper } from "../../selected-calendars/index";

type CalendarSettingsPlatformWrapperProps = {
  classNames?: {
    calendarSettingsCustomClassnames?: string;
    destinationCalendarSettingsCustomClassnames?: string;
    selectedCalendarSettingsCustomClassnames?: string;
  };
};

export const CalendarSettingsPlatformWrapper = ({ classNames }: CalendarSettingsPlatformWrapperProps) => {
  return (
    <div className={classNames?.calendarSettingsCustomClassnames}>
      <DestinationCalendarSettingsPlatformWrapper
        statusLoader={<></>}
        classNames={classNames?.destinationCalendarSettingsCustomClassnames}
      />
      <SelectedCalendarsSettingsPlatformWrapper
        classNames={classNames?.selectedCalendarSettingsCustomClassnames}
      />
    </div>
  );
};
