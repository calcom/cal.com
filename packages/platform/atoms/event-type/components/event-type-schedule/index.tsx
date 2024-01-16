import EventTypeScheduleDetails from "event-type/components/event-type-schedule/details";
import { SingleValue } from "event-type/components/single-value";
import type { FormValues } from "event-type/types";
import type { AvailabilityOption } from "event-type/types";
import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";

import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import { Select } from "@calcom/ui";

import { SelectSkeletonLoader } from "../../../../../../apps/web/components/availability/SkeletonLoader";

type EventTypeScheduleProps = {
  eventType: any;
};

export function EventTypeSchedule({ eventType }: EventTypeScheduleProps) {
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
        {/* isLoading is gonna come from react query when we fetch the schedules list */}
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
          <p className="!mt-2 ml-1 text-sm text-gray-600">{t("members_default_schedule_description")}</p>
        )
      )}
    </div>
  );
}
