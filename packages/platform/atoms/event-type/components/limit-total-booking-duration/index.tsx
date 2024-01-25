import { Controller } from "react-hook-form";

import { classNames } from "@calcom/lib";
import { SettingsToggle } from "@calcom/ui";

import type { LimitsToggleProps } from "../../types";
import { IntervalLimitsManager } from "../interval-limits-manager/index";

type LimitTotalBookingDurationProps = {
  formMethods: LimitsToggleProps;
};

export function LimitTotalBookingDuration({ formMethods }: LimitTotalBookingDurationProps) {
  return (
    <Controller
      name="durationLimits"
      control={formMethods.control}
      render={({ field: { value } }) => {
        const isChecked = Object.keys(value ?? {}).length > 0;
        return (
          <SettingsToggle
            labelClassName="text-sm"
            toggleSwitchAtTheEnd={true}
            switchContainerClassName={classNames(
              "border-subtle mt-6 rounded-lg border py-6 px-4 sm:px-6",
              isChecked && "rounded-b-none"
            )}
            childrenClassName="lg:ml-0"
            title="Limit total booking duration"
            description="Limit total amount of time that this event can be booked"
            checked={isChecked}
            onCheckedChange={(active) => {
              if (active) {
                formMethods.setValue("durationLimits", {
                  PER_DAY: 60,
                });
              } else {
                formMethods.setValue("durationLimits", {});
              }
            }}>
            <div className="border-subtle rounded-b-lg border border-t-0 p-6">
              <IntervalLimitsManager
                propertyName="durationLimits"
                defaultLimit={60}
                step={15}
                textFieldSuffix='"Minutes'
              />
            </div>
          </SettingsToggle>
        );
      }}
    />
  );
}
