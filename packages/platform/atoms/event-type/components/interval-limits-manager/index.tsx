import { Controller } from "react-hook-form";
import { useFormContext } from "react-hook-form";

import { Button } from "@calcom/ui";
import { Plus } from "@calcom/ui/components/icon";

import { ascendingLimitKeys, INTERVAL_LIMIT_OPTIONS } from "../../lib/limitsUtils";
import type { FormValues, IntervalLimitsKey } from "../../types";
import { IntervalLimitItem } from "../interval-limit-item/index";

type IntervalLimitsManagerProps<K extends "durationLimits" | "bookingLimits"> = {
  propertyName: K;
  defaultLimit: number;
  step: number;
  textFieldSuffix?: string;
  disabled?: boolean;
};

export function IntervalLimitsManager({
  propertyName,
  defaultLimit,
  step,
  textFieldSuffix,
  disabled,
}: IntervalLimitsManagerProps<K>) {
  const { watch, setValue, control } = useFormContext<FormValues>();
  const watchIntervalLimits = watch(propertyName);

  return (
    <Controller
      name={propertyName}
      control={control}
      render={({ field: { value, onChange } }) => {
        const currentIntervalLimits = value;
        const sortedCurrentIntervalLimits = Object.entries(currentIntervalLimits).sort(
          ([limitKeyA], [limitKeyB]) => {
            return (
              ascendingLimitKeys.indexOf(limitKeyA as IntervalLimitsKey) -
              ascendingLimitKeys.indexOf(limitKeyB as IntervalLimitsKey)
            );
          }
        );

        const addLimit = () => {
          if (!currentIntervalLimits || !watchIntervalLimits) return;
          const currentKeys = Object.keys(watchIntervalLimits);

          const [rest] = Object.values(INTERVAL_LIMIT_OPTIONS).filter(
            (option) => !currentKeys.includes(option.value)
          );
          if (!rest || !currentKeys.length) return;

          setValue(propertyName, {
            ...watchIntervalLimits,
            [rest.value]: defaultLimit,
          });
        };

        return (
          <ul ref={animateRef}>
            {currentIntervalLimits &&
              watchIntervalLimits &&
              sortedCurrentIntervalLimits.map(([key, value]) => {
                const limitKey = key as IntervalLimitsKey;
                return (
                  <IntervalLimitItem
                    key={key}
                    limitKey={limitKey}
                    step={step}
                    value={value}
                    disabled={disabled}
                    textFieldSuffix={textFieldSuffix}
                    hasDeleteButton={Object.keys(currentIntervalLimits).length > 1}
                    selectOptions={INTERVAL_LIMIT_OPTIONS.filter(
                      (option) => !Object.keys(currentIntervalLimits).includes(option.value)
                    )}
                    onLimitChange={(intervalLimitKey, val) =>
                      // @ts-expect-error FIXME Fix these typings
                      setValue(`${propertyName}.${intervalLimitKey}`, val)
                    }
                    onDelete={(intervalLimitKey: any) => {
                      const current = currentIntervalLimits;
                      delete current[intervalLimitKey];
                      onChange(current);
                    }}
                    onIntervalSelect={(interval) => {
                      const current = currentIntervalLimits;
                      const currentValue = watchIntervalLimits[limitKey];

                      // Removes limit from previous selected value (eg when changed from per_week to per_month, we unset per_week here)
                      delete current[limitKey];
                      const newData = {
                        ...current,
                        // Set limit to new selected value (in the example above this means we set the limit to per_week here).
                        [interval?.value as IntervalLimitsKey]: currentValue,
                      };
                      onChange(newData);
                    }}
                  />
                );
              })}
            {currentIntervalLimits && Object.keys(currentIntervalLimits).length <= 3 && !disabled && (
              <Button color="minimal" StartIcon={Plus} onClick={addLimit}>
                Add Limit
              </Button>
            )}
          </ul>
        );
      }}
    />
  );
}
