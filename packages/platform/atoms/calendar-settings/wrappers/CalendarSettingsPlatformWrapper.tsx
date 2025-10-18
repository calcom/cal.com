import type { DestinationCalendarClassNames } from "../../destination-calendar/DestinationCalendar";
import { DestinationCalendarSettingsPlatformWrapper } from "../../destination-calendar/index";
import { SelectedCalendarsSettingsPlatformWrapper } from "../../selected-calendars/index";
import type {
  CalendarRedirectUrls,
  SelectedCalendarsClassNames,
} from "../../selected-calendars/wrappers/SelectedCalendarsSettingsPlatformWrapper";

type CalendarSettingsPlatformWrapperProps = {
  classNames?: {
    calendarSettingsCustomClassnames?: string;
    destinationCalendarSettingsCustomClassnames?: string;
    selectedCalendarSettingsCustomClassnames?: string;
    selectedCalendarSettingsClassNames?: SelectedCalendarsClassNames;
    destinationCalendarSettingsClassNames?: DestinationCalendarClassNames;
  };
  calendarRedirectUrls?: CalendarRedirectUrls;
  allowDelete?: boolean;
  isDryRun?: boolean;
};

export const CalendarSettingsPlatformWrapper = ({
  classNames,
  calendarRedirectUrls,
  allowDelete = true,
  isDryRun,
}: CalendarSettingsPlatformWrapperProps) => {
  return (
    <div className={classNames?.calendarSettingsCustomClassnames}>
      <DestinationCalendarSettingsPlatformWrapper
        statusLoader={<></>}
        classNames={classNames?.destinationCalendarSettingsCustomClassnames}
        classNamesObject={classNames?.destinationCalendarSettingsClassNames}
        isDryRun={isDryRun}
      />
      <SelectedCalendarsSettingsPlatformWrapper
        classNames={classNames?.selectedCalendarSettingsCustomClassnames}
        calendarRedirectUrls={calendarRedirectUrls}
        allowDelete={allowDelete}
        isDryRun={isDryRun}
        classNamesObject={classNames?.selectedCalendarSettingsClassNames}
      />
    </div>
  );
};
