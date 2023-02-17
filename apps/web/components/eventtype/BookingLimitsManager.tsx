import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { ChangeEvent, Key } from "react";
import { Controller, useFormContext } from "react-hook-form";
import type { SingleValue } from "react-select";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { IntervalLimit } from "@calcom/types/Calendar";
import { Button, Select, Input } from "@calcom/ui";
import { FiPlus, FiTrash } from "@calcom/ui/components/icon";

import type { IntervalLimitsKey } from "@lib/types/intervalLimitsKey";
import { INTERVAL_LIMIT_OPTIONS, intervalOrderKeys } from "@lib/types/intervalLimitsKey";

import type { FormValues } from "../../pages/event-types/[type]";

type BookingLimitItemProps = {
  key: Key;
  intervalLimitKey: IntervalLimitsKey;
  intervalSelectOptions: { value: keyof IntervalLimit; label: string }[];
  bookingAmount: number;
  onDelete: (intervalLimitsKey: IntervalLimitsKey) => void;
  onLimitChange: (intervalLimitsKey: IntervalLimitsKey, durationAmount: number) => void;
  onIntervalSelect: (interval: SingleValue<{ value: keyof IntervalLimit; label: string }>) => void;
};

const BookingLimitItem = ({
  intervalLimitKey,
  intervalSelectOptions,
  bookingAmount,
  onDelete,
  onLimitChange,
  onIntervalSelect,
}: BookingLimitItemProps) => {
  const handleDelete = () => {
    onDelete(intervalLimitKey);
  };

  const handleDurationChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onLimitChange(intervalLimitKey, parseInt(val));
  };

  return (
    <div className="mb-2 flex items-center space-x-2 text-sm rtl:space-x-reverse" key={intervalLimitKey}>
      <Input
        id={`${intervalLimitKey}-limit`}
        type="number"
        className="mb-0 block w-16 rounded-md border-gray-300 text-sm  [appearance:textfield]"
        placeholder="1"
        min={1}
        defaultValue={bookingAmount}
        onChange={handleDurationChange}
      />
      <Select
        options={intervalSelectOptions}
        isSearchable={false}
        defaultValue={INTERVAL_LIMIT_OPTIONS.find((option) => option.value === intervalLimitKey)}
        onChange={onIntervalSelect}
      />
      <Button variant="icon" StartIcon={FiTrash} color="destructive" onClick={handleDelete} />
    </div>
  );
};

export const BookingLimitsManager = () => {
  const { watch, setValue, control } = useFormContext<FormValues>();
  const watchBookingLimits = watch("bookingLimits");
  const { t } = useLocale();

  const [animateRef] = useAutoAnimate<HTMLUListElement>();

  return (
    <Controller
      name="bookingLimits"
      control={control}
      render={({ field: { value, onChange } }) => {
        const currentBookingLimits = value;

        const addLimit = () => {
          if (!currentBookingLimits || !watchBookingLimits) return;
          const currentKeys = Object.keys(watchBookingLimits);

          const rest = Object.values(INTERVAL_LIMIT_OPTIONS).filter(
            (option) => !currentKeys.includes(option.value)
          );
          if (!rest || !currentKeys) return;
          //currentBookingLimits is always defined so can be casted

          setValue("bookingLimits", {
            ...watchBookingLimits,
            [rest[0].value]: 1,
          });
        };

        return (
          <ul ref={animateRef}>
            {currentBookingLimits &&
              watchBookingLimits &&
              Object.entries(currentBookingLimits)
                .sort(([limitKeyA], [limitKeyB]) => {
                  return (
                    intervalOrderKeys.indexOf(limitKeyA as IntervalLimitsKey) -
                    intervalOrderKeys.indexOf(limitKeyB as IntervalLimitsKey)
                  );
                })
                .map(([key, bookingAmount]) => {
                  const intervalLimitKey = key as IntervalLimitsKey;
                  return (
                    <BookingLimitItem
                      key={key}
                      bookingAmount={bookingAmount}
                      intervalLimitKey={intervalLimitKey}
                      intervalSelectOptions={INTERVAL_LIMIT_OPTIONS.filter(
                        (option) => !Object.keys(currentBookingLimits).includes(option.value)
                      )}
                      onLimitChange={(intervalLimitKey, val) =>
                        setValue(`bookingLimits.${intervalLimitKey}`, val)
                      }
                      onDelete={(intervalLimitKey) => {
                        const current = currentBookingLimits;
                        delete current[intervalLimitKey];
                        onChange(current);
                      }}
                      onIntervalSelect={(interval) => {
                        const current = currentBookingLimits;
                        const currentValue = watchBookingLimits[intervalLimitKey];

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
            {currentBookingLimits && Object.keys(currentBookingLimits).length <= 3 && (
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
