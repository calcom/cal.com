import { Controller } from "react-hook-form";

import { classNames } from "@calcom/lib";
import { SettingsToggle } from "@calcom/ui";

import type { LimitsToggleProps } from "../../types";

type LimitFirstSlotProps = {
  formMethods: LimitsToggleProps;
};

export function LimitFirstSlot({ formMethods }: LimitFirstSlotProps) {
  return (
    <Controller
      name="onlyShowFirstAvailableSlot"
      control={formMethods.control}
      render={({ field: { value } }) => {
        const isChecked = value;
        return (
          <SettingsToggle
            toggleSwitchAtTheEnd={true}
            labelClassName="text-sm"
            title="Limit booking only first slot"
            description="Allow only the first slot of every day to be booked"
            checked={isChecked}
            onCheckedChange={(active) => {
              formMethods.setValue("onlyShowFirstAvailableSlot", active ?? false);
            }}
            switchContainerClassName={classNames(
              "border-subtle mt-6 rounded-lg border py-6 px-4 sm:px-6",
              isChecked && "rounded-b-none"
            )}
          />
        );
      }}
    />
  );
}
