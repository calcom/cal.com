import { PlatformAdditionalCalendarSelector } from "../../selected-calendars/wrappers/SelectedCalendarsSettingsPlatformWrapper";
import { AtomsWrapper } from "../../src/components/atoms-wrapper";

export const MultipleCalendarSelector = ({
  align = "center",
  side,
}: {
  align?: "center" | "end" | "start";
  side?: "top" | "bottom" | "left" | "right";
}) => {
  return (
    <AtomsWrapper>
      <PlatformAdditionalCalendarSelector align={align} side={side} />
    </AtomsWrapper>
  );
};
