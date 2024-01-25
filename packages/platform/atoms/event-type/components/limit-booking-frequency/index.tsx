import { Controller } from "react-hook-form";

import { classNames } from "@calcom/lib";
import { SettingsToggle } from "@calcom/ui";

import type { LimitsToggleProps } from "../../types";
import { IntervalLimitsManager } from "../interval-limits-manager/index";

type LimitBookingFrequencyProps = {
  formMethods: LimitsToggleProps;
};

export function LimitBookingFrequency({ formMethods }: LimitBookingFrequencyProps) {
  return (
    <Controller
      name="bookingLimits"
      control={formMethods.control}
      render={({ field: { value } }) => {
        const isChecked = Object.keys(value ?? {}).length > 0;
        return (
          <SettingsToggle
            toggleSwitchAtTheEnd={true}
            labelClassName="text-sm"
            title="Limit booking frequency"
            description="Limit how many times this event can be booked"
            checked={isChecked}
            onCheckedChange={(active) => {
              if (active) {
                formMethods.setValue("bookingLimits", {
                  PER_DAY: 1,
                });
              } else {
                formMethods.setValue("bookingLimits", {});
              }
            }}
            switchContainerClassName={classNames(
              "border-subtle mt-6 rounded-lg border py-6 px-4 sm:px-6",
              isChecked && "rounded-b-none"
            )}
            childrenClassName="lg:ml-0">
            <div className="border-subtle rounded-b-lg border border-t-0 p-6">
              <IntervalLimitsManager propertyName="bookingLimits" defaultLimit={1} step={1} />
            </div>
          </SettingsToggle>
        );
      }}
    />
  );
}
