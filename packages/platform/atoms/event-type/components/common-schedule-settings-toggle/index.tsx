import { EventTypeSchedule } from "event-type/components/event-type-schedule";
import type { FormValues } from "event-type/types";
import { Controller, useFormContext } from "react-hook-form";

import { SettingsToggle } from "@calcom/ui";

type UseCommonScheduleSettingsToggleProps = {
  eventType: any;
};

export function UseCommonScheduleSettingsToggle({ eventType }: UseCommonScheduleSettingsToggleProps) {
  const { setValue } = useFormContext<FormValues>();

  return (
    <Controller
      name="metadata.config.useHostSchedulesForTeamEvent"
      render={({ field: { value, onChange } }) => (
        <SettingsToggle
          checked={!value}
          onCheckedChange={(checked) => {
            onChange(!checked);
            if (!checked) {
              setValue("schedule", null);
            }
          }}
          title="Choose a common schedule"
          description="Enable this if you want to use a common schedule between hosts. When disabled, each host will be booked based on their default schedule.">
          <EventTypeSchedule eventType={eventType} />
        </SettingsToggle>
      )}
    />
  );
}
