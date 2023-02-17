import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Controller, useFormContext } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { BookingLimit } from "@calcom/types/Calendar";
import { Button, Select, Input } from "@calcom/ui";
import { FiPlus, FiTrash } from "@calcom/ui/components/icon";

import type { FormValues } from "../../pages/event-types/[type]";

const validationOrderKeys = ["PER_DAY", "PER_WEEK", "PER_MONTH", "PER_YEAR"];
type BookingLimitsKey = keyof BookingLimit;

export const BookingLimitsManager = () => {
  const { watch, setValue, control } = useFormContext<FormValues>();
  const watchBookingLimits = watch("bookingLimits");
  const { t } = useLocale();

  const [animateRef] = useAutoAnimate<HTMLUListElement>();

  const BOOKING_LIMIT_OPTIONS: {
    value: keyof BookingLimit;
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
      name="bookingLimits"
      control={control}
      render={({ field: { value, onChange } }) => {
        const currentBookingLimits = value;
        return (
          <ul ref={animateRef}>
            {currentBookingLimits &&
              watchBookingLimits &&
              Object.entries(currentBookingLimits)
                .sort(([limitkeyA], [limitKeyB]) => {
                  return (
                    validationOrderKeys.indexOf(limitkeyA as BookingLimitsKey) -
                    validationOrderKeys.indexOf(limitKeyB as BookingLimitsKey)
                  );
                })
                .map(([key, bookingAmount]) => {
                  const bookingLimitKey = key as BookingLimitsKey;
                  return (
                    <div
                      className="mb-2 flex items-center space-x-2 text-sm rtl:space-x-reverse"
                      key={bookingLimitKey}>
                      <Input
                        id={`${bookingLimitKey}-limit`}
                        type="number"
                        className="mb-0 block w-16 rounded-md border-gray-300 text-sm  [appearance:textfield]"
                        placeholder="1"
                        min={1}
                        defaultValue={bookingAmount}
                        onChange={(e) => {
                          const val = e.target.value;
                          setValue(`bookingLimits.${bookingLimitKey}`, parseInt(val));
                        }}
                      />
                      <Select
                        options={BOOKING_LIMIT_OPTIONS.filter(
                          (option) => !Object.keys(currentBookingLimits).includes(option.value)
                        )}
                        isSearchable={false}
                        defaultValue={BOOKING_LIMIT_OPTIONS.find((option) => option.value === key)}
                        onChange={(val) => {
                          const current = currentBookingLimits;
                          const currentValue = watchBookingLimits[bookingLimitKey];

                          // Removes limit from previous selected value (eg when changed from per_week to per_month, we unset per_week here)
                          delete current[bookingLimitKey];
                          const newData = {
                            ...current,
                            // Set limit to new selected value (in the example above this means we set the limit to per_week here).
                            [val?.value as BookingLimitsKey]: currentValue,
                          };
                          onChange(newData);
                        }}
                      />
                      <Button
                        variant="icon"
                        StartIcon={FiTrash}
                        color="destructive"
                        onClick={() => {
                          const current = currentBookingLimits;
                          delete current[key as BookingLimitsKey];
                          onChange(current);
                        }}
                      />
                    </div>
                  );
                })}
            {currentBookingLimits && Object.keys(currentBookingLimits).length <= 3 && (
              <Button
                color="minimal"
                StartIcon={FiPlus}
                onClick={() => {
                  if (!currentBookingLimits || !watchBookingLimits) return;
                  const currentKeys = Object.keys(watchBookingLimits);

                  const rest = Object.values(BOOKING_LIMIT_OPTIONS).filter(
                    (option) => !currentKeys.includes(option.value)
                  );
                  if (!rest || !currentKeys) return;
                  //currentBookingLimits is always defined so can be casted

                  setValue("bookingLimits", {
                    ...watchBookingLimits,
                    [rest[0].value]: 1,
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
