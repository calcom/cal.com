import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { Key } from "react";
import { Controller, useFormContext } from "react-hook-form";
import type { SingleValue } from "react-select";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { IntervalLimit } from "@calcom/types/Calendar";
import { Button, Select, TextField } from "@calcom/ui";
import { FiPlus, FiTrash } from "@calcom/ui/components/icon";

import type { FormValues } from "../../pages/event-types/[type]";

type IntervalLimitsKey = keyof IntervalLimit;

const intervalOrderKeys = ["PER_DAY", "PER_WEEK", "PER_MONTH", "PER_YEAR"] as const;

const INTERVAL_LIMIT_OPTIONS: {
  value: keyof IntervalLimit;
  label: string;
}[] = intervalOrderKeys.map((key) => ({
  value: key as keyof IntervalLimit,
  label: `Per ${key.split("_")[1].toLocaleLowerCase()}`,
}));

type IntervalLimitItemProps = {
  key: Key;
  limitKey: IntervalLimitsKey;
  step: number;
  value: number;
  textFieldSuffix?: string;
  selectOptions: { value: keyof IntervalLimit; label: string }[];
  hasDeleteButton?: boolean;
  onDelete: (intervalLimitsKey: IntervalLimitsKey) => void;
  onLimitChange: (intervalLimitsKey: IntervalLimitsKey, limit: number) => void;
  onIntervalSelect: (interval: SingleValue<{ value: keyof IntervalLimit; label: string }>) => void;
};

const IntervalLimitItem = ({
  limitKey,
  step,
  value,
  textFieldSuffix,
  selectOptions,
  hasDeleteButton,
  onDelete,
  onLimitChange,
  onIntervalSelect,
}: IntervalLimitItemProps) => {
  return (
    <div className="mb-2 flex items-center space-x-2 text-sm rtl:space-x-reverse" key={limitKey}>
      <TextField
        required
        type="number"
        containerClassName={`${textFieldSuffix ? "w-36" : "w-16"} -mb-1`}
        placeholder={`${value}`}
        min={step}
        step={step}
        defaultValue={value}
        addOnSuffix={textFieldSuffix}
        onChange={(e) => onLimitChange(limitKey, parseInt(e.target.value))}
      />
      <Select
        options={selectOptions}
        isSearchable={false}
        defaultValue={INTERVAL_LIMIT_OPTIONS.find((option) => option.value === limitKey)}
        onChange={onIntervalSelect}
      />
      {hasDeleteButton && (
        <Button variant="icon" StartIcon={FiTrash} color="destructive" onClick={() => onDelete(limitKey)} />
      )}
    </div>
  );
};

type IntervalLimitsManagerProps = {
  propertyName: "durationLimits" | "bookingLimits";
  defaultLimit: number;
  step: number;
  textFieldSuffix?: string;
};

export const IntervalLimitsManager = ({
  propertyName,
  defaultLimit,
  step,
  textFieldSuffix,
}: IntervalLimitsManagerProps) => {
  const { watch, setValue, control } = useFormContext<FormValues>();
  const watchIntervalLimits = watch(propertyName);
  const { t } = useLocale();

  const [animateRef] = useAutoAnimate<HTMLUListElement>();

  return (
    <Controller
      name={propertyName}
      control={control}
      render={({ field: { value, onChange } }) => {
        const currentIntervalLimits = value;

        const addLimit = () => {
          if (!currentIntervalLimits || !watchIntervalLimits) return;
          const currentKeys = Object.keys(watchIntervalLimits);

          const rest = Object.values(INTERVAL_LIMIT_OPTIONS).filter(
            (option) => !currentKeys.includes(option.value)
          );
          if (!rest || !currentKeys) return;
          //currentDurationLimits is always defined so can be casted

          setValue(propertyName, {
            ...watchIntervalLimits,
            [rest[0].value]: defaultLimit,
          });
        };

        return (
          <ul ref={animateRef}>
            {currentIntervalLimits &&
              watchIntervalLimits &&
              Object.entries(currentIntervalLimits)
                .sort(([limitKeyA], [limitKeyB]) => {
                  return (
                    intervalOrderKeys.indexOf(limitKeyA as IntervalLimitsKey) -
                    intervalOrderKeys.indexOf(limitKeyB as IntervalLimitsKey)
                  );
                })
                .map(([key, value]) => {
                  const limitKey = key as IntervalLimitsKey;
                  return (
                    <IntervalLimitItem
                      key={key}
                      limitKey={limitKey}
                      step={step}
                      value={value}
                      textFieldSuffix={textFieldSuffix}
                      hasDeleteButton={Object.keys(currentIntervalLimits).length > 1}
                      selectOptions={INTERVAL_LIMIT_OPTIONS.filter(
                        (option) => !Object.keys(currentIntervalLimits).includes(option.value)
                      )}
                      onLimitChange={(intervalLimitKey, val) =>
                        setValue(`${propertyName}.${intervalLimitKey}`, val)
                      }
                      onDelete={(intervalLimitKey) => {
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
            {currentIntervalLimits && Object.keys(currentIntervalLimits).length <= 3 && (
              <Button color="minimal" StartIcon={FiPlus} onClick={addLimit}>
                {t("add_limit")}
              </Button>
            )}
          </ul>
        );
      }}
    />
  );
};
