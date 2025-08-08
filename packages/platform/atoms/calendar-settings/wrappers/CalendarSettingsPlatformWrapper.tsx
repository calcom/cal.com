import type { DestinationHeaderClassnames } from "destination-calendar/DestinationCalendar";

import { DestinationCalendarSettingsPlatformWrapper } from "../../destination-calendar/index";
import { SelectedCalendarsSettingsPlatformWrapper } from "../../selected-calendars/index";
import type {
  CalendarRedirectUrls,
  SelectedCalendarsHeaderClassnames,
} from "../../selected-calendars/wrappers/SelectedCalendarsSettingsPlatformWrapper";

type CalendarSettingsPlatformWrapperProps = {
  classNames?: {
    calendarSettingsCustomClassnames?: string;
    destinationCalendarSettingsCustomClassnames?: string;
    selectedCalendarSettingsCustomClassnames?: string;
    selectedCalendarSettingsHeaderClassNames?: SelectedCalendarsHeaderClassnames;
    destinationCalendarSettingsHeaderClassNames?: DestinationHeaderClassnames;
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
        headerClassNames={classNames?.destinationCalendarSettingsHeaderClassNames}
        isDryRun={isDryRun}
      />
      <SelectedCalendarsSettingsPlatformWrapper
        classNames={classNames?.selectedCalendarSettingsCustomClassnames}
        calendarRedirectUrls={calendarRedirectUrls}
        allowDelete={allowDelete}
        isDryRun={isDryRun}
        headerClassNames={classNames?.selectedCalendarSettingsHeaderClassNames}
      />
    </div>
  );
};
