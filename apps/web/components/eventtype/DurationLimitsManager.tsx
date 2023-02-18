import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { ChangeEvent, Key } from "react";
import { Controller, useFormContext } from "react-hook-form";
import type { SingleValue } from "react-select";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { IntervalLimit } from "@calcom/types/Calendar";
import { Button, Select, TextField } from "@calcom/ui";
import { FiPlus, FiTrash } from "@calcom/ui/components/icon";

import type { IntervalLimitsKey } from "@lib/types/intervalLimitsKey";
import { INTERVAL_LIMIT_OPTIONS, intervalOrderKeys } from "@lib/types/intervalLimitsKey";

import type { FormValues } from "../../pages/event-types/[type]";

type DurationLimitItemProps = {
  key: Key;
  intervalLimitKey: IntervalLimitsKey;
  intervalSelectOptions: { value: keyof IntervalLimit; label: string }[];
  durationAmount: number;
  hasDeleteButton?: boolean;
  onDelete: (intervalLimitsKey: IntervalLimitsKey) => void;
  onLimitChange: (intervalLimitsKey: IntervalLimitsKey, durationAmount: number) => void;
  onIntervalSelect: (interval: SingleValue<{ value: keyof IntervalLimit; label: string }>) => void;
};

const DurationLimitItem = ({
  intervalLimitKey,
  intervalSelectOptions,
  durationAmount,
  hasDeleteButton,
  onDelete,
  onLimitChange,
  onIntervalSelect,
}: DurationLimitItemProps) => {
  const { t } = useLocale();

  const handleDelete = () => {
    onDelete(intervalLimitKey);
  };

  const handleDurationChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onLimitChange(intervalLimitKey, parseInt(val));
  };

  return (
    <div className="mb-2 flex items-center space-x-2 text-sm rtl:space-x-reverse" key={intervalLimitKey}>
      <TextField
        required
        type="number"
        containerClassName="-mb-1 w-36"
        placeholder="60"
        min={15}
        step={15}
        defaultValue={durationAmount}
        addOnSuffix={<>{t("minutes")}</>}
        onChange={handleDurationChange}
      />
      <Select
        options={intervalSelectOptions}
        isSearchable={false}
        defaultValue={INTERVAL_LIMIT_OPTIONS.find((option) => option.value === intervalLimitKey)}
        onChange={onIntervalSelect}
      />
      {hasDeleteButton && (
        <Button variant="icon" StartIcon={FiTrash} color="destructive" onClick={handleDelete} />
      )}
    </div>
  );
};

export const DurationLimitsManager = () => {
  const { watch, setValue, control } = useFormContext<FormValues>();
  const watchDurationLimits = watch("durationLimits");
  const { t } = useLocale();

  const [animateRef] = useAutoAnimate<HTMLUListElement>();

  return (
    <Controller
      name="durationLimits"
      control={control}
      render={({ field: { value, onChange } }) => {
        const currentDurationLimits = value;

        const addLimit = () => {
          if (!currentDurationLimits || !watchDurationLimits) return;
          const currentKeys = Object.keys(watchDurationLimits);

          const rest = Object.values(INTERVAL_LIMIT_OPTIONS).filter(
            (option) => !currentKeys.includes(option.value)
          );
          if (!rest || !currentKeys) return;
          //currentDurationLimits is always defined so can be casted

          setValue("durationLimits", {
            ...watchDurationLimits,
            [rest[0].value]: 60,
          });
        };

        return (
          <ul ref={animateRef}>
            {currentDurationLimits &&
              watchDurationLimits &&
              Object.entries(currentDurationLimits)
                .sort(([limitKeyA], [limitKeyB]) => {
                  return (
                    intervalOrderKeys.indexOf(limitKeyA as IntervalLimitsKey) -
                    intervalOrderKeys.indexOf(limitKeyB as IntervalLimitsKey)
                  );
                })
                .map(([key, durationAmount]) => {
                  const intervalLimitKey = key as IntervalLimitsKey;
                  return (
                    <DurationLimitItem
                      key={key}
                      durationAmount={durationAmount}
                      hasDeleteButton={Object.keys(currentDurationLimits).length > 1}
                      intervalLimitKey={intervalLimitKey}
                      intervalSelectOptions={INTERVAL_LIMIT_OPTIONS.filter(
                        (option) => !Object.keys(currentDurationLimits).includes(option.value)
                      )}
                      onLimitChange={(intervalLimitKey, val) =>
                        setValue(`durationLimits.${intervalLimitKey}`, val)
                      }
                      onDelete={(intervalLimitKey) => {
                        const current = currentDurationLimits;
                        delete current[intervalLimitKey];
                        onChange(current);
                      }}
                      onIntervalSelect={(interval) => {
                        const current = currentDurationLimits;
                        const currentValue = watchDurationLimits[intervalLimitKey];

                        // Removes limit from previous selected value (eg when changed from per_week to per_month, we unset per_week here)
                        delete current[intervalLimitKey];
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
            {currentDurationLimits && Object.keys(currentDurationLimits).length <= 3 && (
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
