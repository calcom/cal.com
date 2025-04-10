import * as RadioGroup from "@radix-ui/react-radio-group";
import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";

import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { InputField } from "@calcom/ui/components/form";
import { Select } from "@calcom/ui/components/form";
import { SettingsToggle } from "@calcom/ui/components/form";
import { RadioField } from "@calcom/ui/components/radio";

interface IControllerWithTimeSlotProps {
  name: string;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (val: boolean) => void;
  "data-testid": string;
  customClassname?: string;
  toggleSwitchAtTheEnd?: boolean;
  metaDataName: "disableCancellingThreshold" | "disableReschedulingThreshold";
  [key: string]: any;
}

export default function ControllerWithTimeSlot(props: IControllerWithTimeSlotProps) {
  const { t } = useLocale();
  const {
    name,
    title,
    description,
    checked,
    onCheckedChange,
    "data-testid": dataTestId,
    toggleSwitchAtTheEnd = true,
    switchContainerClassName = "border-subtle rounded-lg border py-6 px-4 sm:px-6",
    metaDataName,
    ...rest
  } = props;
  const options = [
    { label: t("minute_timeUnit"), value: "minutes" },
    { label: t("hour_timeUnit"), value: "hours" },
  ];

  const formMethods = useFormContext<FormValues>();
  const metaData = formMethods.getValues("metadata");

  const currentTimeSlotValue = metaData?.[metaDataName];

  const selectedRadioOption = currentTimeSlotValue ? "notice" : "always";

  const defaultUnitValue = options.find((opt) => opt.value === (currentTimeSlotValue?.unit ?? "hours"));

  const [timeAndUnit, setTimeAndUnit] = useState({
    time: currentTimeSlotValue?.time ?? 24,
    unit: defaultUnitValue,
  });

  const handleTimeUnitChange = (key: "time" | "unit", value: number | "hours" | "minutes" | null) => {
    if (!value) return;

    let newState;

    if (key === "unit") {
      const selectedUnit = options.find((opt) => opt.value === value);
      newState = { ...timeAndUnit, unit: selectedUnit };
    } else {
      newState = { ...timeAndUnit, time: value as number };
    }

    setTimeAndUnit(newState);

    formMethods.setValue(
      `metadata.${metaDataName}`,
      {
        time: newState.time,
        unit: newState?.unit?.value,
      },
      { shouldDirty: true }
    );
  };

  return (
    <Controller
      name={name}
      render={({ field: { onChange } }) => (
        <SettingsToggle
          noIndentation
          labelClassName="text-sm"
          toggleSwitchAtTheEnd={toggleSwitchAtTheEnd}
          switchContainerClassName={switchContainerClassName}
          title={title}
          description={description}
          data-testid={dataTestId}
          checked={checked}
          onCheckedChange={(val) => {
            onChange(val);
            onCheckedChange?.(val);

            if (!val) {
              formMethods.setValue(`metadata.${metaDataName}`, undefined, {
                shouldDirty: true,
              });
            }
          }}
          {...rest}>
          <RadioGroup.Root
            className="border-subtle space-y-2 rounded-lg border px-4 py-6 pl-7 sm:px-6"
            defaultValue={selectedRadioOption}
            onValueChange={(value) => {
              formMethods.setValue(
                `metadata.${metaDataName}`,
                value === "always"
                  ? undefined
                  : {
                      time: timeAndUnit.time,
                      unit: timeAndUnit.unit.value,
                    },
                {
                  shouldDirty: true,
                }
              );
            }}>
            <div className="flex items-center space-x-2">
              <RadioField label="Always" id="always" value="always" />
            </div>
            <div className="flex items-center">
              <RadioField label="Within" id="notice" value="notice" className="mr-5" />
              <InputField
                type="number"
                disabled={selectedRadioOption !== "notice"}
                min={1}
                className={classNames(
                  "border-default h-9! !m-0 block w-16 rounded-r-none border-r-0 text-sm [appearance:textfield] focus:z-10 focus:border-r"
                )}
                value={timeAndUnit.time}
                onChange={(e) => handleTimeUnitChange("time", Number(e.target.value))}
              />
              <Select
                options={options}
                value={timeAndUnit.unit}
                isDisabled={selectedRadioOption !== "notice"}
                innerClassNames={{
                  control: "rounded-l-none max-h-4 px-3",
                }}
                onChange={(val) => handleTimeUnitChange("unit", val.value)}
              />
            </div>
          </RadioGroup.Root>
        </SettingsToggle>
      )}
    />
  );
}
