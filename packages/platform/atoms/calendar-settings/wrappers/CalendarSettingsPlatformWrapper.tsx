import { DestinationCalendarSettingsPlatformWrapper } from "../../destination-calendar/index";
import { SelectedCalendarSettingsPlatformWrapper } from "../../selected-calendar/index";

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
      <SelectedCalendarSettingsPlatformWrapper
        classNames={classNames?.selectedCalendarSettingsCustomClassnames}
      />
    </div>
  );
};
