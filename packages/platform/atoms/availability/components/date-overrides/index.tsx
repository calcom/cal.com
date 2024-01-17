import type { AvailabilityFormValues } from "availability/types";
import { useFieldArray } from "react-hook-form";

import dayjs from "@calcom/dayjs";
import { DateOverrideList, DateOverrideInputDialog } from "@calcom/features/schedules";
import type { WorkingHours } from "@calcom/types/schedule";
import { Tooltip, Button } from "@calcom/ui";
import { Info, Plus } from "@calcom/ui/components/icon";

type DateOverrideProps = {
  workingHours: WorkingHours[];
};

export function DateOverride({ workingHours }: DateOverrideProps) {
  const { remove, append, replace, fields } = useFieldArray<AvailabilityFormValues, "dateOverrides">({
    name: "dateOverrides",
  });
  const excludedDates = fields.map((field) => dayjs(field.ranges[0].start).utc().format("YYYY-MM-DD"));

  return (
    <div className="p-6">
      <h3 className="text-emphasis font-medium leading-6">
        Date overrides{" "}
        <Tooltip content="Date overrides are archived automatically after the date has passed">
          <span className="inline-block align-middle">
            <Info className="h-4 w-4" />
          </span>
        </Tooltip>
      </h3>
      <p className="text-subtle mb-4 text-sm">
        Add dates when your availability changes from your daily hours.
      </p>
      <div className="space-y-2">
        <DateOverrideList
          excludedDates={excludedDates}
          remove={remove}
          replace={replace}
          items={fields}
          workingHours={workingHours}
        />
        <DateOverrideInputDialog
          workingHours={workingHours}
          excludedDates={excludedDates}
          onChange={(ranges) => ranges.forEach((range) => append({ ranges: [range] }))}
          Trigger={
            <Button color="secondary" StartIcon={Plus} data-testid="add-override">
              Add an override
            </Button>
          }
        />
      </div>
    </div>
  );
}
