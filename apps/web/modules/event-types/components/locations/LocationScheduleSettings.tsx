import { useFormContext } from "react-hook-form";

import type { LocationFormValues } from "@calcom/features/eventtypes/lib/types";
import { trpc } from "@calcom/trpc/react";
import { Select, SettingsToggle } from "@calcom/ui/components/form";

export const LocationScheduleSettings = ({
  index,
  disabled,
}: {
  index: number;
  disabled?: boolean;
}) => {
  const { getValues, setValue, watch } = useFormContext<LocationFormValues>();
  const scheduleId = watch(`locations.${index}.scheduleId`);

  const { data: schedulesQueryData, isPending } = trpc.viewer.availability.list.useQuery(undefined);

  const isEnabled = !!scheduleId;

  const scheduleOptions =
    schedulesQueryData?.schedules.map((schedule) => ({
      label: schedule.name,
      value: schedule.id,
    })) || [];

  const selectedOption = scheduleOptions.find((opt) => opt.value === scheduleId) || null;

  return (
    <div className="mt-4 w-full">
      <SettingsToggle
        title="Limit availability for this location"
        description="Select a specific schedule when this location is available."
        checked={isEnabled}
        disabled={disabled || isPending}
        onCheckedChange={(checked) => {
          if (checked) {
            const defaultSchedule =
              schedulesQueryData?.schedules.find((s) => s.isDefault) ||
              schedulesQueryData?.schedules[0];
            setValue(`locations.${index}.scheduleId`, defaultSchedule?.id, { shouldDirty: true });
          } else {
            setValue(`locations.${index}.scheduleId`, undefined, { shouldDirty: true });
          }
        }}>
        {isEnabled && (
          <div className="mt-4 w-full">
            <Select
              options={scheduleOptions}
              value={selectedOption}
              onChange={(option) => {
                if (option) {
                  setValue(`locations.${index}.scheduleId`, option.value, { shouldDirty: true });
                }
              }}
              isDisabled={disabled || isPending}
              className="w-full"
            />
          </div>
        )}
      </SettingsToggle>
    </div>
  );
};

export default LocationScheduleSettings;
