import { useAutoAnimate } from "@formkit/auto-animate/react";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { EventTypeSetupProps, FormValues } from "pages/event-types/[type]";
import { useMemo, useRef, useState } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";

import { classNames } from "@calcom/lib";
import convertToNewDurationType, { DurationType } from "@calcom/lib/convertToNewDurationType";
import findDurationType from "@calcom/lib/findDurationType";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { PeriodType } from "@calcom/prisma/client";
import type { BookingLimit } from "@calcom/types/Calendar";
import { Button, DateRangePicker, Icon, Input, InputField, Label, Select, SettingsToggle } from "@calcom/ui";

export const EventLimitsTab = ({ eventType }: Pick<EventTypeSetupProps, "eventType">) => {
  const { t } = useLocale();
  const formMethods = useFormContext<FormValues>();
  const minimumBookingNoticeType = useRef<DurationType>(findDurationType(eventType.minimumBookingNotice));
  const prevBookingNoticeType = useRef<DurationType>(minimumBookingNoticeType.current);

  const minimumBookingNoticeInDurationTypeFormValue = formMethods.watch("minimumBookingNoticeInDurationType");

  const PERIOD_TYPES = [
    {
      type: "ROLLING" as const,
      suffix: t("into_the_future"),
    },
    {
      type: "RANGE" as const,
      prefix: t("within_date_range"),
    },
    {
      type: "UNLIMITED" as const,
      prefix: t("indefinitely_into_future"),
    },
  ];

  const periodType =
    PERIOD_TYPES.find((s) => s.type === eventType.periodType) ||
    PERIOD_TYPES.find((s) => s.type === "UNLIMITED");

  const [periodDates] = useState<{ startDate: Date; endDate: Date }>({
    startDate: new Date(eventType.periodStartDate || Date.now()),
    endDate: new Date(eventType.periodEndDate || Date.now()),
  });
  const watchPeriodType = useWatch({
    control: formMethods.control,
    name: "periodType",
    defaultValue: periodType?.type,
  });

  const onMinimumNoticeDurationTypeChange = useMemo(
    () => (durationType?: DurationType) => {
      if (typeof durationType === "undefined") return;

      // Store current selected type in ref to use in previous run for comparrison.
      minimumBookingNoticeType.current = durationType;

      // Uses the previous selected type and converts the value to the new type.
      // Eg day was selected before, user selects hours now, so we multiple * 24 and round up.
      const minimumBookingNoticeInDurationType = convertToNewDurationType(
        prevBookingNoticeType.current,
        durationType,
        Number(minimumBookingNoticeInDurationTypeFormValue)
      );

      // Uses the round up value in the new type to calculate the value in minutes.
      // We should NOT use minimumBookingNoticeInDurationTypeFormValue here, since that
      // would break in the case that the user enters 90 minutes, changes the type to
      // hours (that will show 2 hours), but the value in minutes would then remain 90,
      // which is something else than the user things they save.
      const minimumBookingNoticeInMinutes = convertToNewDurationType(
        durationType,
        "minutes",
        Number(minimumBookingNoticeInDurationType)
      );

      // Updates both form values as well as stores the current type as previous type in ref.
      formMethods.setValue("minimumBookingNotice", minimumBookingNoticeInMinutes);
      formMethods.setValue("minimumBookingNoticeInDurationType", minimumBookingNoticeInDurationType);
      prevBookingNoticeType.current = durationType;
    },
    [formMethods, minimumBookingNoticeInDurationTypeFormValue]
  );

  /**
   * When the user inputs a new value for minimumBookingNoticeInDurationType,
   * we calculate the value in minutes, and update this hidden field as well.
   */
  const onMinimumNoticeChange = useMemo(
    () => (duration: string) => {
      const minimumBookingNoticeInMinutes = convertToNewDurationType(
        minimumBookingNoticeType.current,
        "minutes",
        Number(duration)
      );

      formMethods.setValue("minimumBookingNotice", minimumBookingNoticeInMinutes);
    },
    [formMethods]
  );

  return (
    <div>
      <div className="flex flex-col space-y-4 lg:flex-row lg:space-y-0 lg:space-x-4">
        <div className="w-full">
          <Label htmlFor="beforeBufferTime">{t("before_event")} </Label>
          <Controller
            name="beforeBufferTime"
            control={formMethods.control}
            defaultValue={eventType.beforeEventBuffer || 0}
            render={({ field: { onChange, value } }) => {
              const beforeBufferOptions = [
                {
                  label: t("event_buffer_default"),
                  value: 0,
                },
                ...[5, 10, 15, 20, 30, 45, 60, 90, 120].map((minutes) => ({
                  label: minutes + " " + t("minutes"),
                  value: minutes,
                })),
              ];
              return (
                <Select
                  isSearchable={false}
                  onChange={(val) => {
                    if (val) onChange(val.value);
                  }}
                  defaultValue={
                    beforeBufferOptions.find((option) => option.value === value) || beforeBufferOptions[0]
                  }
                  options={beforeBufferOptions}
                />
              );
            }}
          />
        </div>
        <div className="w-full">
          <Label htmlFor="afterBufferTime">{t("after_event")} </Label>
          <Controller
            name="afterBufferTime"
            control={formMethods.control}
            defaultValue={eventType.afterEventBuffer || 0}
            render={({ field: { onChange, value } }) => {
              const afterBufferOptions = [
                {
                  label: t("event_buffer_default"),
                  value: 0,
                },
                ...[5, 10, 15, 20, 30, 45, 60, 90, 120].map((minutes) => ({
                  label: minutes + " " + t("minutes"),
                  value: minutes,
                })),
              ];
              return (
                <Select
                  isSearchable={false}
                  onChange={(val) => {
                    if (val) onChange(val.value);
                  }}
                  defaultValue={
                    afterBufferOptions.find((option) => option.value === value) || afterBufferOptions[0]
                  }
                  options={afterBufferOptions}
                />
              );
            }}
          />
        </div>
      </div>
      <div className="flex flex-col space-y-4 pt-4 lg:flex-row lg:space-y-0 lg:space-x-4">
        <div className="flex w-full items-end justify-end">
          <Controller
            name="minimumBookingNotice"
            control={formMethods.control}
            render={() => {
              const durationTypeOptions = [
                {
                  label: t("minutes"),
                  value: "minutes",
                },
                {
                  label: t("hours"),
                  value: "hours",
                },
                {
                  label: t("days"),
                  value: "days",
                },
              ];

              return (
                <>
                  <div className="w-1/2 md:w-3/4">
                    <InputField
                      required
                      label={t("minimum_booking_notice")}
                      type="number"
                      placeholder="120"
                      className="mb-0 h-[38px] rounded-[4px] ltr:mr-2 rtl:ml-2"
                      {...formMethods.register("minimumBookingNoticeInDurationType", {
                        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                          onMinimumNoticeChange(event.target.value),
                      })}
                    />
                    <input type="hidden" {...formMethods.register("minimumBookingNotice")} />
                  </div>
                  <Select
                    isSearchable={false}
                    className="mb-0 ml-2 h-[38px] w-full capitalize md:min-w-[150px] md:max-w-[200px]"
                    defaultValue={durationTypeOptions.find(
                      (option) => option.value === minimumBookingNoticeType.current
                    )}
                    onChange={(input) => onMinimumNoticeDurationTypeChange(input?.value as DurationType)}
                    options={durationTypeOptions}
                  />
                </>
              );
            }}
          />
        </div>
        <div className="w-full">
          <Label htmlFor="slotInterval">{t("slot_interval")} </Label>
          <Controller
            name="slotInterval"
            control={formMethods.control}
            render={() => {
              const slotIntervalOptions = [
                {
                  label: t("slot_interval_default"),
                  value: -1,
                },
                ...[5, 10, 15, 20, 30, 45, 60, 75, 90, 105, 120].map((minutes) => ({
                  label: minutes + " " + t("minutes"),
                  value: minutes,
                })),
              ];
              return (
                <Select
                  isSearchable={false}
                  onChange={(val) => {
                    formMethods.setValue("slotInterval", val && (val.value || 0) > 0 ? val.value : null);
                  }}
                  defaultValue={
                    slotIntervalOptions.find((option) => option.value === eventType.slotInterval) ||
                    slotIntervalOptions[0]
                  }
                  options={slotIntervalOptions}
                />
              );
            }}
          />
        </div>
      </div>

      <hr className="my-8" />

      <Controller
        name="bookingLimits"
        control={formMethods.control}
        render={({ field: { value } }) => (
          <SettingsToggle
            title={t("limit_booking_frequency")}
            description={t("limit_booking_frequency_description")}
            checked={Object.keys(value ?? {}).length > 0}
            onCheckedChange={(active) => {
              if (active) {
                formMethods.setValue("bookingLimits", {
                  PER_DAY: 1,
                });
              } else {
                formMethods.setValue("bookingLimits", {});
              }
            }}>
            <BookingLimits />
          </SettingsToggle>
        )}
      />

      <hr className="my-8" />
      <Controller
        name="periodType"
        control={formMethods.control}
        render={({ field: { value } }) => (
          <SettingsToggle
            title={t("limit_future_bookings")}
            description={t("limit_future_bookings_description")}
            checked={value && value !== "UNLIMITED"}
            onCheckedChange={(bool) => formMethods.setValue("periodType", bool ? "ROLLING" : "UNLIMITED")}>
            <RadioGroup.Root
              defaultValue={watchPeriodType}
              value={watchPeriodType}
              onValueChange={(val) => formMethods.setValue("periodType", val as PeriodType)}>
              {PERIOD_TYPES.map((period) => {
                if (period.type === "UNLIMITED") return null;
                return (
                  <div
                    className={classNames(
                      "mb-2 flex flex-wrap items-center text-sm",
                      watchPeriodType === "UNLIMITED" && "pointer-events-none opacity-30"
                    )}
                    key={period.type}>
                    <RadioGroup.Item
                      id={period.type}
                      value={period.type}
                      className="min-w-4 flex h-4 w-4 cursor-pointer items-center rounded-full border border-black bg-white focus:border-2 focus:outline-none ltr:mr-2 rtl:ml-2">
                      <RadioGroup.Indicator className="relative flex h-4 w-4 items-center justify-center after:block after:h-2 after:w-2 after:rounded-full after:bg-black" />
                    </RadioGroup.Item>
                    {period.prefix ? <span>{period.prefix}&nbsp;</span> : null}
                    {period.type === "ROLLING" && (
                      <div className="flex h-9">
                        <Input
                          type="number"
                          className="block w-16 rounded-md border-gray-300 py-3 text-sm [appearance:textfield] ltr:mr-2 rtl:ml-2"
                          placeholder="30"
                          {...formMethods.register("periodDays", { valueAsNumber: true })}
                          defaultValue={eventType.periodDays || 30}
                        />
                        <select
                          id=""
                          className="block h-9 w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-sm focus:outline-none"
                          {...formMethods.register("periodCountCalendarDays")}
                          defaultValue={eventType.periodCountCalendarDays ? "1" : "0"}>
                          <option value="1">{t("calendar_days")}</option>
                          <option value="0">{t("business_days")}</option>
                        </select>
                      </div>
                    )}
                    {period.type === "RANGE" && (
                      <div className="inline-flex space-x-2 ltr:ml-2 ltr:mr-2 rtl:ml-2 rtl:space-x-reverse">
                        <Controller
                          name="periodDates"
                          control={formMethods.control}
                          defaultValue={periodDates}
                          render={() => (
                            <DateRangePicker
                              startDate={formMethods.getValues("periodDates").startDate}
                              endDate={formMethods.getValues("periodDates").endDate}
                              onDatesChange={({ startDate, endDate }) => {
                                formMethods.setValue("periodDates", {
                                  startDate,
                                  endDate,
                                });
                              }}
                            />
                          )}
                        />
                      </div>
                    )}
                    {period.suffix ? (
                      <span className="ltr:ml-2 ltr:mr-2 rtl:ml-2">&nbsp;{period.suffix}</span>
                    ) : null}
                  </div>
                );
              })}
            </RadioGroup.Root>
          </SettingsToggle>
        )}
      />
    </div>
  );
};

const validationOrderKeys = ["PER_DAY", "PER_WEEK", "PER_MONTH", "PER_YEAR"];
type BookingLimitsKey = keyof BookingLimit;
const BookingLimits = () => {
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
                          // Removes limit from previous selected value (eg when changed from per_week to per_month, we unset per_week here)
                          delete current[bookingLimitKey];
                          const newData = {
                            ...current,
                            // Set limit to new selected value (in the example above this means we set the limit to per_week here).
                            [val?.value as BookingLimitsKey]: watchBookingLimits[bookingLimitKey],
                          };
                          onChange(newData);
                        }}
                      />
                      <Button
                        size="icon"
                        StartIcon={Icon.FiTrash}
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
                StartIcon={Icon.FiPlus}
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
                    [rest[0].value]: undefined,
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
