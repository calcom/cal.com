import { PlatformAdditionalCalendarSelector } from "../../selected-calendars/wrappers/SelectedCalendarsSettingsPlatformWrapper";
import type { CalendarRedirectUrls } from "../../selected-calendars/wrappers/SelectedCalendarsSettingsPlatformWrapper";
import { AtomsWrapper } from "../../src/components/atoms-wrapper";

export const MultipleCalendarSelector = ({
  align = "center",
  side,
  labels,
  calendarRedirectUrls,
}: {
  align?: "center" | "end" | "start";
  side?: "top" | "bottom" | "left" | "right";
  labels?: {
    addLabel?: string;
    gcalLabel?: string;
    outlookLabel?: string;
    appleLabel?: string;
  };
  calendarRedirectUrls?: CalendarRedirectUrls;
}) => {
  return (
    <AtomsWrapper>
      <PlatformAdditionalCalendarSelector
        align={align}
        side={side}
        labels={labels}
        calendarRedirectUrls={calendarRedirectUrls}
      />
    </AtomsWrapper>
  );
};
