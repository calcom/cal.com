import { UseCommonScheduleSettingsToggle } from "event-type/components/common-schedule-settings-toggle";
import { EventTypeSchedule } from "event-type/components/event-type-schedule";

import { SchedulingType } from "@calcom/prisma/enums";

type AvailabilityProps = {
  eventType: any;
  isTeamEvent: boolean;
};

export function Availability({ eventType, isTeamEvent }: AvailabilityProps) {
  if (isTeamEvent && eventType.schedulingType !== SchedulingType.MANAGED) {
    return <UseCommonScheduleSettingsToggle eventType={eventType} />;
  }

  return <EventTypeSchedule eventType={eventType} />;
}
