import { useState } from "react";

import { classNames } from "@calcom/lib";
import { SettingsToggle, TextField } from "@calcom/ui";

import type { LimitsToggleProps } from "../../types";

type OffsetStartTimesProps = {
  formMethods: LimitsToggleProps;
  offsetStartValue: number;
  originalTime: string;
  adjustedTime: string;
};

export function OffsetStartTimes({
  formMethods,
  offsetStartValue,
  originalTime,
  adjustedTime,
}: OffsetStartTimesProps) {
  const [offsetToggle, setOffsetToggle] = useState(() => offsetStartValue > 0);

  return (
    <SettingsToggle
      labelClassName="text-sm"
      toggleSwitchAtTheEnd={true}
      switchContainerClassName={classNames(
        "border-subtle mt-6 rounded-lg border py-6 px-4 sm:px-6",
        offsetToggle && "rounded-b-none"
      )}
      childrenClassName="lg:ml-0"
      title="Offset start times"
      description="Offset timeslots shown to bookers by a specified number of minutes"
      checked={offsetToggle}
      onCheckedChange={(active) => {
        setOffsetToggle(active);
        if (!active) {
          formMethods.setValue("offsetStart", 0);
        }
      }}>
      <div className="border-subtle rounded-b-lg border border-t-0 p-6">
        <TextField
          required
          type="number"
          containerClassName="max-w-80"
          label="Offset by"
          {...formMethods.register("offsetStart")}
          addOnSuffix={<>Minutes</>}
          hint={`e.g. this will show time slots to your bookers at ${adjustedTime} instead of ${originalTime}`}
        />
      </div>
    </SettingsToggle>
  );
}
