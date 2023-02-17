import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Controller, useFormContext } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { DurationLimit } from "@calcom/types/Calendar";
import { Button, Select, TextField } from "@calcom/ui";
import { FiPlus, FiTrash } from "@calcom/ui/components/icon";

import { FormValues } from "../../pages/event-types/[type]";

const validationOrderKeys = ["PER_DAY", "PER_WEEK", "PER_MONTH", "PER_YEAR"];
type DurationLimitsKey = keyof DurationLimit;

export const DurationLimitsManager = () => {
  const { watch, setValue, control } = useFormContext<FormValues>();
  const watchDurationLimits = watch("durationLimits");
  const { t } = useLocale();

  const [animateRef] = useAutoAnimate<HTMLUListElement>();

  const DURATION_LIMIT_OPTIONS: {
    value: keyof DurationLimit;
    label: string;
  }[] = [
    {
      value: "PER_DAY",
      label: "Per Day",
    },
    {
      value: "PER_WEEK",
      label: "Per Week",
    },
    {
      value: "PER_MONTH",
      label: "Per Month",
    },
    {
      value: "PER_YEAR",
      label: "Per Year",
    },
  ];

  return (
    <Controller
      name="durationLimits"
      control={control}
      render={({ field: { value, onChange } }) => {
        const currentDurationLimits = value;
        return (
          <ul ref={animateRef}>
            {currentDurationLimits &&
              watchDurationLimits &&
              Object.entries(currentDurationLimits)
                .sort(([limitkeyA], [limitKeyB]) => {
                  return (
                    validationOrderKeys.indexOf(limitkeyA as DurationLimitsKey) -
                    validationOrderKeys.indexOf(limitKeyB as DurationLimitsKey)
                  );
                })
                .map(([key, durationAmount]) => {
                  const durationLimitKey = key as DurationLimitsKey;
                  return (
                    <div
                      className="mb-2 flex items-center space-x-2 text-sm rtl:space-x-reverse"
                      key={durationLimitKey}>
                      <TextField
                        required
                        type="number"
                        containerClassName="-mb-1 w-36"
                        placeholder="60"
                        min={15}
                        step={15}
                        defaultValue={durationAmount}
                        addOnSuffix={<>{t("minutes")}</>}
                        onChange={(e) => {
                          const val = e.target.value;
                          setValue(`durationLimits.${durationLimitKey}`, parseInt(val));
                        }}
                      />
                      <Select
                        options={DURATION_LIMIT_OPTIONS.filter(
                          (option) => !Object.keys(currentDurationLimits).includes(option.value)
                        )}
                        isSearchable={false}
                        defaultValue={DURATION_LIMIT_OPTIONS.find((option) => option.value === key)}
                        onChange={(val) => {
                          const current = currentDurationLimits;
                          const currentValue = watchDurationLimits[durationLimitKey];

                          // Removes limit from previous selected value (eg when changed from per_week to per_month, we unset per_week here)
                          delete current[durationLimitKey];
                          const newData = {
                            ...current,
                            // Set limit to new selected value (in the example above this means we set the limit to per_week here).
                            [val?.value as DurationLimitsKey]: currentValue,
                          };
                          onChange(newData);
                        }}
                      />
                      <Button
                        variant="icon"
                        StartIcon={FiTrash}
                        color="destructive"
                        onClick={() => {
                          const current = currentDurationLimits;
                          delete current[durationLimitKey];
                          onChange(current);
                        }}
                      />
                    </div>
                  );
                })}
            {currentDurationLimits && Object.keys(currentDurationLimits).length <= 3 && (
              <Button
                color="minimal"
                StartIcon={FiPlus}
                onClick={() => {
                  if (!currentDurationLimits || !watchDurationLimits) return;
                  const currentKeys = Object.keys(watchDurationLimits);

                  const rest = Object.values(DURATION_LIMIT_OPTIONS).filter(
                    (option) => !currentKeys.includes(option.value)
                  );
                  if (!rest || !currentKeys) return;
                  //currentDurationLimits is always defined so can be casted

                  setValue("durationLimits", {
                    ...watchDurationLimits,
                    [rest[0].value]: 60,
                  });
                }}>
                {t("add_limit")}
              </Button>
            )}
          </ul>
        );
      }}
    />
  );
};
