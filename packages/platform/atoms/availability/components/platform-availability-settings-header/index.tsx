import type { Schedule } from "availability/settings/AvailabilitySettings";
import { Controller } from "react-hook-form";
import { type UseFormReturn } from "react-hook-form";

import { availabilityAsString } from "../../lib/availabilityAsString";
import type { AvailabilityFormValues } from "../../types";
import { EditableHeading } from "../editable-heading/index";

type PlatformAvailabilitySettingsHeaderProps = {
  form: UseFormReturn<AvailabilityFormValues, any>;
  schedule: Schedule[] | [];
  timeFormat: number | null;
  isHeadingReady: boolean;
};

export function PlatformAvailabilitySettingsHeader({
  form,
  schedule,
  timeFormat,
  isHeadingReady,
}: PlatformAvailabilitySettingsHeaderProps) {
  return (
    <div>
      <div>
        <Controller
          control={form.control}
          name="name"
          render={({ field }) => (
            <EditableHeading
              contentEditable={true}
              isReady={isHeadingReady}
              {...field}
              data-testid="availablity-title"
            />
          )}
        />
      </div>
      <div>
        {schedule ? (
          schedule
            .filter((availability) => !!availability.days.length)
            .map((availability) => (
              <span key={availability.id}>
                {availabilityAsString(availability, { locale: "en", hour12: timeFormat === 12 })}
              </span>
            ))
        ) : (
          <>Loading...</>
        )}
      </div>
    </div>
  );
}
