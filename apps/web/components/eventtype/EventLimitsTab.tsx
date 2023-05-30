import { useAutoAnimate } from "@formkit/auto-animate/react";
import * as RadioGroup from "@radix-ui/react-radio-group";
import type { EventTypeSetupProps, FormValues } from "pages/event-types/[type]";
import type { Key } from "react";
import React, { useEffect, useState } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import type { SingleValue } from "react-select";

import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import { classNames } from "@calcom/lib";
import type { DurationType } from "@calcom/lib/convertToNewDurationType";
import convertToNewDurationType from "@calcom/lib/convertToNewDurationType";
import findDurationType from "@calcom/lib/findDurationType";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { PeriodType } from "@calcom/prisma/enums";
import type { IntervalLimit } from "@calcom/types/Calendar";
import { Button, DateRangePicker, InputField, Label, Select, SettingsToggle, TextField } from "@calcom/ui";
import { Plus, Trash } from "@calcom/ui/components/icon";

const MinimumBookingNoticeInput = React.forwardRef<
  HTMLInputElement,
  Omit<UseFormRegisterReturn<"minimumBookingNotice">, "ref">
>(function MinimumBookingNoticeInput({ ...passThroughProps }, ref) {
  const { t } = useLocale();
  const { setValue, getValues } = useFormContext<FormValues>();
  const durationTypeOptions: {
    value: DurationType;
    label: string;
  }[] = [
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

  const [minimumBookingNoticeDisplayValues, setMinimumBookingNoticeDisplayValues] = useState<{
    type: DurationType;
    value: number;
  }>({
    type: findDurationType(getValues(passThroughProps.name)),
    value: convertToNewDurationType(
      "minutes",
      findDurationType(getValues(passThroughProps.name)),
      getValues(passThroughProps.name)
    ),
  });
  // keep hidden field in sync with minimumBookingNoticeDisplayValues
  useEffect(() => {
    setValue(
      passThroughProps.name,
      convertToNewDurationType(
        minimumBookingNoticeDisplayValues.type,
        "minutes",
        minimumBookingNoticeDisplayValues.value
      )
    );
  }, [minimumBookingNoticeDisplayValues, setValue, passThroughProps.name]);

  return (
    <div className="flex items-end justify-end">
      <div className="w-1/2 md:w-full">
        <InputField
          required
          disabled={passThroughProps.disabled}
          defaultValue={minimumBookingNoticeDisplayValues.value}
          onChange={(e) =>
            setMinimumBookingNoticeDisplayValues({
              ...minimumBookingNoticeDisplayValues,
              value: parseInt(e.target.value || "0", 10),
            })
          }
          label={t("minimum_booking_notice")}
          type="number"
          placeholder="0"
          min={0}
          className="mb-0 h-[38px] rounded-[4px] ltr:mr-2 rtl:ml-2"
        />
        <input type="hidden" ref={ref} {...passThroughProps} />
      </div>
      <Select
        isSearchable={false}
        isDisabled={passThroughProps.disabled}
        className="mb-0 ml-2 h-[38px] w-full capitalize md:min-w-[150px] md:max-w-[200px]"
        defaultValue={durationTypeOptions.find(
          (option) => option.value === minimumBookingNoticeDisplayValues.type
        )}
        onChange={(input) => {
          if (input) {
            setMinimumBookingNoticeDisplayValues({
              ...minimumBookingNoticeDisplayValues,
              type: input.value,
            });
          }
        }}
        options={durationTypeOptions}
      />
    </div>
  );
});

export const EventLimitsTab = ({ eventType }: Pick<EventTypeSetupProps, "eventType">) => {
  const { t, i18n } = useLocale();
  const formMethods = useFormContext<FormValues>();

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

  const { shouldLockIndicator, shouldLockDisableProps } = useLockedFieldsManager(
    eventType,
    t("locked_fields_admin_description"),
    t("locked_fields_member_description")
  );

  const bookingLimitsLocked = shouldLockDisableProps("bookingLimits");
  const durationLimitsLocked = shouldLockDisableProps("durationLimits");
  const periodTypeLocked = shouldLockDisableProps("periodType");
  const offsetStartLockedProps = shouldLockDisableProps("offsetStart");

  const optionsPeriod = [
    { value: 1, label: t("calendar_days") },
    { value: 0, label: t("business_days") },
  ];

  // offsetStart toggle is client-side only, opened by default if offsetStart is set
  const offsetStartValue = useWatch({
    control: formMethods.control,
    name: "offsetStart",
  });
  const [offsetToggle, setOffsetToggle] = useState(() => offsetStartValue > 0);

  // Preview how the offset will affect start times
  const offsetOriginalTime = new Date();
  offsetOriginalTime.setHours(9, 0, 0, 0);
  const offsetAdjustedTime = new Date(offsetOriginalTime.getTime() + offsetStartValue * 60 * 1000);

  return (
    <div className="space-y-8">
      <div className="space-y-4 lg:space-y-8">
        <div className="flex flex-col space-y-4 lg:flex-row lg:space-y-0 lg:space-x-4">
          <div className="w-full">
            <Label htmlFor="beforeBufferTime">
              {t("before_event")}
              {shouldLockIndicator("bookingLimits")}
            </Label>
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
                    isDisabled={shouldLockDisableProps("bookingLimits").disabled}
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
            <Label htmlFor="afterBufferTime">
              {t("after_event")}
              {shouldLockIndicator("bookingLimits")}
            </Label>
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
                    isDisabled={shouldLockDisableProps("bookingLimits").disabled}
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
        <div className="flex flex-col space-y-4 lg:flex-row lg:space-y-0 lg:space-x-4">
          <div className="w-full">
            <Label htmlFor="minimumBookingNotice">
              {t("minimum_booking_notice")}
              {shouldLockIndicator("minimumBookingNotice")}
            </Label>
            <MinimumBookingNoticeInput
              disabled={shouldLockDisableProps("minimumBookingNotice").disabled}
              {...formMethods.register("minimumBookingNotice")}
            />
          </div>
          <div className="w-full">
            <Label htmlFor="slotInterval">
              {t("slot_interval")}
              {shouldLockIndicator("slotInterval")}
            </Label>
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
                    isDisabled={shouldLockDisableProps("slotInterval").disabled}
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
      </div>
      <hr className="border-subtle" />
      <Controller
        name="bookingLimits"
        control={formMethods.control}
        render={({ field: { value } }) => (
          <SettingsToggle
            title={t("limit_booking_frequency")}
            {...bookingLimitsLocked}
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
            <IntervalLimitsManager
              disabled={bookingLimitsLocked.disabled}
              propertyName="bookingLimits"
              defaultLimit={1}
              step={1}
            />
          </SettingsToggle>
        )}
      />
      <hr className="border-subtle" />
      <Controller
        name="durationLimits"
        control={formMethods.control}
        render={({ field: { value } }) => (
          <SettingsToggle
            title={t("limit_total_booking_duration")}
            description={t("limit_total_booking_duration_description")}
            {...durationLimitsLocked}
            checked={Object.keys(value ?? {}).length > 0}
            onCheckedChange={(active) => {
              if (active) {
                formMethods.setValue("durationLimits", {
                  PER_DAY: 60,
                });
              } else {
                formMethods.setValue("durationLimits", {});
              }
            }}>
            <IntervalLimitsManager
              propertyName="durationLimits"
              defaultLimit={60}
              disabled={durationLimitsLocked.disabled}
              step={15}
              textFieldSuffix={t("minutes")}
            />
          </SettingsToggle>
        )}
      />
      <hr className="border-subtle" />
      <Controller
        name="periodType"
        control={formMethods.control}
        render={({ field: { value } }) => (
          <SettingsToggle
            title={t("limit_future_bookings")}
            description={t("limit_future_bookings_description")}
            {...periodTypeLocked}
            checked={value && value !== "UNLIMITED"}
            onCheckedChange={(bool) => formMethods.setValue("periodType", bool ? "ROLLING" : "UNLIMITED")}>
            <RadioGroup.Root
              defaultValue={watchPeriodType}
              value={watchPeriodType}
              onValueChange={(val) => formMethods.setValue("periodType", val as PeriodType)}>
              {PERIOD_TYPES.filter((opt) =>
                periodTypeLocked.disabled ? watchPeriodType === opt.type : true
              ).map((period) => {
                if (period.type === "UNLIMITED") return null;
                return (
                  <div
                    className={classNames(
                      "text-default mb-2 flex flex-wrap items-center text-sm",
                      watchPeriodType === "UNLIMITED" && "pointer-events-none opacity-30"
                    )}
                    key={period.type}>
                    {!periodTypeLocked.disabled && (
                      <RadioGroup.Item
                        id={period.type}
                        value={period.type}
                        className="min-w-4 bg-default border-default flex h-4 w-4 cursor-pointer items-center rounded-full border focus:border-2 focus:outline-none ltr:mr-2 rtl:ml-2">
                        <RadioGroup.Indicator className="after:bg-inverted relative flex h-4 w-4 items-center justify-center after:block after:h-2 after:w-2 after:rounded-full" />
                      </RadioGroup.Item>
                    )}
                    {period.prefix ? <span>{period.prefix}&nbsp;</span> : null}
                    {period.type === "ROLLING" && (
                      <div className="flex items-center">
                        <TextField
                          labelSrOnly
                          type="number"
                          className="border-default my-0 block w-16 text-sm [appearance:textfield] ltr:mr-2 rtl:ml-2"
                          placeholder="30"
                          disabled={periodTypeLocked.disabled}
                          {...formMethods.register("periodDays", { valueAsNumber: true })}
                          defaultValue={eventType.periodDays || 30}
                        />
                        <Select
                          options={optionsPeriod}
                          isSearchable={false}
                          isDisabled={periodTypeLocked.disabled}
                          onChange={(opt) => {
                            formMethods.setValue(
                              "periodCountCalendarDays",
                              opt?.value.toString() as "0" | "1"
                            );
                          }}
                          defaultValue={
                            optionsPeriod.find(
                              (opt) => opt.value === (eventType.periodCountCalendarDays ? 1 : 0)
                            ) ?? optionsPeriod[0]
                          }
                        />
                      </div>
                    )}
                    {period.type === "RANGE" && (
                      <div className="ms-2 me-2 inline-flex space-x-2 rtl:space-x-reverse">
                        <Controller
                          name="periodDates"
                          control={formMethods.control}
                          defaultValue={periodDates}
                          render={() => (
                            <DateRangePicker
                              startDate={formMethods.getValues("periodDates").startDate}
                              endDate={formMethods.getValues("periodDates").endDate}
                              disabled={periodTypeLocked.disabled}
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
                    {period.suffix ? <span className="ms-2 me-2">&nbsp;{period.suffix}</span> : null}
                  </div>
                );
              })}
            </RadioGroup.Root>
          </SettingsToggle>
        )}
      />
      <hr className="border-subtle" />
      <SettingsToggle
        title={t("offset_toggle")}
        description={t("offset_toggle_description")}
        {...offsetStartLockedProps}
        checked={offsetToggle}
        onCheckedChange={(active) => {
          setOffsetToggle(active);
          if (!active) {
            formMethods.setValue("offsetStart", 0);
          }
        }}>
        <TextField
          required
          type="number"
          {...offsetStartLockedProps}
          label={t("offset_start")}
          defaultValue={eventType.offsetStart}
          {...formMethods.register("offsetStart")}
          addOnSuffix={<>{t("minutes")}</>}
          hint={t("offset_start_description", {
            originalTime: offsetOriginalTime.toLocaleTimeString(i18n.language, { timeStyle: "short" }),
            adjustedTime: offsetAdjustedTime.toLocaleTimeString(i18n.language, { timeStyle: "short" }),
          })}
        />
      </SettingsToggle>
    </div>
  );
};

type IntervalLimitsKey = keyof IntervalLimit;

const intervalOrderKeys = ["PER_DAY", "PER_WEEK", "PER_MONTH", "PER_YEAR"] as const;

const INTERVAL_LIMIT_OPTIONS = intervalOrderKeys.map((key) => ({
  value: key as keyof IntervalLimit,
  label: `Per ${key.split("_")[1].toLocaleLowerCase()}`,
}));

type IntervalLimitItemProps = {
  key: Key;
  limitKey: IntervalLimitsKey;
  step: number;
  value: number;
  textFieldSuffix?: string;
  disabled?: boolean;
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
  disabled,
  onDelete,
  onLimitChange,
  onIntervalSelect,
}: IntervalLimitItemProps) => {
  return (
    <div className="mb-2 flex items-center space-x-2 text-sm rtl:space-x-reverse" key={limitKey}>
      <TextField
        required
        type="number"
        containerClassName={textFieldSuffix ? "w-44 -mb-1" : "w-16 mb-0"}
        className="mb-0 !h-auto"
        placeholder={`${value}`}
        disabled={disabled}
        min={step}
        step={step}
        defaultValue={value}
        addOnSuffix={textFieldSuffix}
        onChange={(e) => onLimitChange(limitKey, parseInt(e.target.value))}
      />
      <Select
        options={selectOptions}
        isSearchable={false}
        isDisabled={disabled}
        defaultValue={INTERVAL_LIMIT_OPTIONS.find((option) => option.value === limitKey)}
        onChange={onIntervalSelect}
      />
      {hasDeleteButton && !disabled && (
        <Button variant="icon" StartIcon={Trash} color="destructive" onClick={() => onDelete(limitKey)} />
      )}
    </div>
  );
};

type IntervalLimitsManagerProps<K extends "durationLimits" | "bookingLimits"> = {
  propertyName: K;
  defaultLimit: number;
  step: number;
  textFieldSuffix?: string;
  disabled?: boolean;
};

const IntervalLimitsManager = <K extends "durationLimits" | "bookingLimits">({
  propertyName,
  defaultLimit,
  step,
  textFieldSuffix,
  disabled,
}: IntervalLimitsManagerProps<K>) => {
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

          const [rest] = Object.values(INTERVAL_LIMIT_OPTIONS).filter(
            (option) => !currentKeys.includes(option.value)
          );
          if (!rest || !currentKeys.length) return;
          //currentDurationLimits is always defined so can be casted
          // @ts-expect-error FIXME Fix these typings
          setValue(propertyName, {
            ...watchIntervalLimits,
            [rest.value]: defaultLimit,
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
            {currentIntervalLimits && Object.keys(currentIntervalLimits).length <= 3 && !disabled && (
              <Button color="minimal" StartIcon={Plus} onClick={addLimit}>
                {t("add_limit")}
              </Button>
            )}
          </ul>
        );
      }}
    />
  );
};
