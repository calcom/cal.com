import { Controller, useFormContext } from "react-hook-form";
import type { GroupBase, OptionsOrGroups } from "react-select";

import { Label, Select } from "@calcom/ui";

import type { FormValues } from "../../types";

type EventIntervalSchedulerProps = {
  classnames: string;
  labelTitle: string;
  labelFor: string;
  controllerName: string;
  defaultValue?: number;
  selectDefaultValue: unknown;
  variant: "event interval" | "time slot interval";
  selectOptions?:
    | OptionsOrGroups<
        {
          label: string;
          value: number;
        },
        GroupBase<{
          label: string;
          value: number;
        }>
      >
    | undefined;
};

export function EventIntervalScheduler({
  classnames,
  labelFor,
  labelTitle,
  controllerName,
  defaultValue,
  selectDefaultValue,
  selectOptions,
  variant,
}: EventIntervalSchedulerProps) {
  const formMethods = useFormContext<FormValues>();

  return (
    <div className={classnames}>
      <Label htmlFor={labelFor}>{labelTitle}</Label>
      <Controller
        name={controllerName}
        control={formMethods.control}
        defaultValue={defaultValue}
        render={({ field: { onChange, value } }) => {
          return (
            <Select
              isSearchable={false}
              onChange={(val: any) => {
                if (variant === "event interval") {
                  if (val) onChange(val.value);
                }

                if (variant === "time slot interval") {
                  formMethods.setValue("slotInterval", val && (val.value || 0) > 0 ? val.value : null);
                }
              }}
              defaultValue={selectDefaultValue}
              options={selectOptions}
            />
          );
        }}
      />
    </div>
  );
}
