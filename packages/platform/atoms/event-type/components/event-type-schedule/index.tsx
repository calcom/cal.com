import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";

import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import { Select } from "@calcom/ui";

import { SelectSkeletonLoader } from "../../../../../../apps/web/components/availability/SkeletonLoader";
import type { FormValues, AvailabilityOption } from "../../types";
import EventTypeScheduleDetails from "../event-type-schedule/details/index";
import { Option } from "../option/index";
import { SingleValue } from "../single-value/index";

type EventTypeScheduleProps = {
  eventType: any;
  isLoading: boolean;
};

export function EventTypeSchedule({ eventType, isLoading }: EventTypeScheduleProps) {
  const { shouldLockIndicator, isManagedEventType, isChildrenManagedEventType } = useLockedFieldsManager(
    eventType,
    "Members will not be able to edit this",
    "This option was locked by the team admi"
  );
  const { watch, setValue, getValues } = useFormContext<FormValues>();
  const [options, setOptions] = useState<AvailabilityOption[]>([]);

  const watchSchedule = watch("schedule");
  const availabilityValue = watch("availability");

  return (
    <div>
      <div className="border-subtle rounded-t-md border p-6">
        <label htmlFor="availability" className="text-default mb-2 block text-sm font-medium leading-none">
          Availability
          {shouldLockIndicator("availability")}
        </label>
        {isLoading && <SelectSkeletonLoader />}
        {!isLoading && (
          <Controller
            name="schedule"
            render={({ field }) => {
              return (
                <Select
                  placeholder="Select..."
                  options={options}
                  isSearchable={false}
                  onChange={(selected) => {
                    field.onChange(selected?.value || null);
                    if (selected?.value) setValue("availability", selected);
                  }}
                  className="block w-full min-w-0 flex-1 rounded-sm text-sm"
                  value={availabilityValue}
                  components={{ Option, SingleValue }}
                  isMulti={false}
                />
              );
            }}
          />
        )}
      </div>
      {availabilityValue?.value !== 0 ? (
        <EventTypeScheduleDetails
          selectedScheduleValue={availabilityValue}
          isManagedEventType={isManagedEventType || isChildrenManagedEventType}
        />
      ) : (
        isManagedEventType && (
          <p className="!mt-2 ml-1 text-sm text-gray-600">
            We will use each members default availability schedule. They will be able to edit or change it.
          </p>
        )
      )}
    </div>
  );
}
