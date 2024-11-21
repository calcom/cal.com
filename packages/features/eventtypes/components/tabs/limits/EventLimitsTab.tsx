import { useAutoAnimate } from "@formkit/auto-animate/react";
import * as RadioGroup from "@radix-ui/react-radio-group";
import type { Key } from "react";
import React, { useEffect, useState } from "react";
import type { UseFormRegisterReturn, UseFormReturn } from "react-hook-form";
import { Controller, useFormContext } from "react-hook-form";
import type { SingleValue } from "react-select";

import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import { getDefinedBufferTimes } from "@calcom/features/eventtypes/lib/getDefinedBufferTimes";
import type { FormValues, EventTypeSetupProps, InputClassNames } from "@calcom/features/eventtypes/lib/types";
import type { SelectClassNames, SettingsToggleClassNames } from "@calcom/features/eventtypes/lib/types";
import CheckboxField from "@calcom/features/form/components/CheckboxField";
import { classNames } from "@calcom/lib";
import { ROLLING_WINDOW_PERIOD_MAX_DAYS_TO_CHECK } from "@calcom/lib/constants";
import type { DurationType } from "@calcom/lib/convertToNewDurationType";
import convertToNewDurationType from "@calcom/lib/convertToNewDurationType";
import findDurationType from "@calcom/lib/findDurationType";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { ascendingLimitKeys, intervalLimitKeyToUnit } from "@calcom/lib/intervalLimit";
import { PeriodType } from "@calcom/prisma/enums";
import type { IntervalLimit } from "@calcom/types/Calendar";
import { Button, DateRangePicker, InputField, Label, Select, SettingsToggle, TextField } from "@calcom/ui";

type IPeriodType = (typeof PeriodType)[keyof typeof PeriodType];

export type EventLimitsTabCustomClassNames = {
  bufferAndNoticeSection?: {
    container?: string;
    beforeBufferSelect?: SelectClassNames;
    afterBufferSelect?: SelectClassNames;
    minimumNoticeInput?: SelectClassNames & { input?: string };
    timeSlotIntervalSelect?: SelectClassNames;
  };

  bookingFrequencyLimit: SettingsToggleClassNames & {
    intervalLimitItem?: IntervalLimitItemCustomClassNames;
    intervalLimitContainer?: string;
  };
  firstAvailableSlotOnly?: SettingsToggleClassNames;
  totalDurationLimit?: SettingsToggleClassNames & {
    intervalLimitItem?: IntervalLimitItemCustomClassNames;
  };
  futureBookingLimit?: SettingsToggleClassNames & {
    rollingLimit: RollingLimitCustomClassNames;
    rangeLimit: RangeLimitCustomClassNames;
  };
  offsetStartTimes?: SettingsToggleClassNames & {
    offsetInput?: InputClassNames;
  };
};

export type EventLimitsTabProps = Pick<EventTypeSetupProps, "eventType"> & {
  customClassNames?: EventLimitsTabCustomClassNames;
};

/**
 * We technically have a ROLLING_WINDOW future limit option that isn't shown as a Radio Option. Because UX is better by providing it as a toggle with ROLLING Limit radio option.
 * Also, ROLLING_WINDOW reuses the same `periodDays` field and `periodCountCalendarDays` fields
 *
 * So we consider `periodType=ROLLING && rollingExcludeUnavailableDays=true` to be the ROLLING_WINDOW option
 * We can't set `periodType=ROLLING_WINDOW` directly because it is not a valid Radio Option in UI
 * So, here we can convert from periodType to uiValue any time.
 */
const getUiValueFromPeriodType = (periodType: PeriodType) => {
  if (periodType === PeriodType.ROLLING_WINDOW) {
    return {
      value: PeriodType.ROLLING,
      rollingExcludeUnavailableDays: true,
    };
  }

  if (periodType === PeriodType.ROLLING) {
    return {
      value: PeriodType.ROLLING,
      rollingExcludeUnavailableDays: false,
    };
  }

  return {
    value: periodType,
    rollingExcludeUnavailableDays: null,
  };
};

/**
 * It compliments `getUiValueFromPeriodType`
 */
const getPeriodTypeFromUiValue = (uiValue: { value: PeriodType; rollingExcludeUnavailableDays: boolean }) => {
  if (uiValue.value === PeriodType.ROLLING && uiValue.rollingExcludeUnavailableDays === true) {
    return PeriodType.ROLLING_WINDOW;
  }

  return uiValue.value;
};

type RangeLimitCustomClassNames = {
  wrapper?: string;
  datePickerWraper?: string;
  datePicker?: string;
};

function RangeLimitRadioItem({
  isDisabled,
  formMethods,
  radioValue,
  customClassNames,
}: {
  radioValue: string;
  isDisabled: boolean;
  formMethods: UseFormReturn<FormValues>;
  customClassNames?: RangeLimitCustomClassNames;
}) {
  const { t } = useLocale();
  return (
    <div
      className={classNames(
        "text-default mb-2 flex flex-wrap items-center text-sm",
        customClassNames?.wrapper
      )}>
      {!isDisabled && (
        <RadioGroup.Item
          id={radioValue}
          value={radioValue}
          className="min-w-4 bg-default border-default flex h-4 w-4 cursor-pointer items-center rounded-full border focus:border-2 focus:outline-none ltr:mr-2 rtl:ml-2">
          <RadioGroup.Indicator className="after:bg-inverted relative flex h-4 w-4 items-center justify-center after:block after:h-2 after:w-2 after:rounded-full" />
        </RadioGroup.Item>
      )}
      <div>
        <span>{t("within_date_range")}&nbsp;</span>
        <div
          className={classNames(
            "me-2 ms-2 inline-flex space-x-2 rtl:space-x-reverse",
            customClassNames?.datePickerWraper
          )}>
          <Controller
            name="periodDates"
            render={({ field: { onChange } }) => (
              <DateRangePicker
                dates={{
                  startDate: formMethods.getValues("periodDates").startDate,
                  endDate: formMethods.getValues("periodDates").endDate,
                }}
                disabled={isDisabled}
                onDatesChange={({ startDate, endDate }) => {
                  onChange({
                    startDate,
                    endDate,
                  });
                }}
                className={customClassNames?.datePicker}
              />
            )}
          />
        </div>
      </div>
    </div>
  );
}

type RollingLimitCustomClassNames = {
  container?: string;
  textField?: string;
  periodTypeSelect?: Pick<SelectClassNames, "select" | "innerClassNames">;
};

function RollingLimitRadioItem({
  radioValue,
  isDisabled,
  formMethods,
  onChange,
  rollingExcludeUnavailableDays,
  customClassNames,
}: {
  radioValue: IPeriodType;
  isDisabled: boolean;
  formMethods: UseFormReturn<FormValues>;
  onChange: (opt: { value: number } | null) => void;
  rollingExcludeUnavailableDays: boolean;
  customClassNames?: RollingLimitCustomClassNames;
}) {
  const { t } = useLocale();

  const options = [
    { value: 0, label: t("business_days") },
    { value: 1, label: t("calendar_days") },
  ];
  const getSelectedOption = () =>
    options.find((opt) => opt.value === (formMethods.getValues("periodCountCalendarDays") === true ? 1 : 0));

  const periodDaysWatch = formMethods.watch("periodDays");
  return (
    <div
      className={classNames(
        "text-default mb-2 flex flex-wrap items-baseline text-sm",
        customClassNames?.container
      )}>
      {!isDisabled && (
        <RadioGroup.Item
          id={radioValue}
          value={radioValue}
          className="min-w-4 bg-default border-default flex h-4 w-4 cursor-pointer items-center rounded-full border focus:border-2 focus:outline-none ltr:mr-2 rtl:ml-2">
          <RadioGroup.Indicator className="after:bg-inverted relative flex h-4 w-4 items-center justify-center after:block after:h-2 after:w-2 after:rounded-full" />
        </RadioGroup.Item>
      )}

      <div>
        <div className="flex items-center">
          <TextField
            labelSrOnly
            type="number"
            className={classNames(
              "border-default my-0 block w-16 text-sm [appearance:textfield] ltr:mr-2 rtl:ml-2",
              customClassNames?.textField
            )}
            placeholder="30"
            disabled={isDisabled}
            min={0}
            max={rollingExcludeUnavailableDays ? ROLLING_WINDOW_PERIOD_MAX_DAYS_TO_CHECK : undefined}
            {...formMethods.register("periodDays", { valueAsNumber: true })}
          />
          <Select
            options={options}
            isSearchable={false}
            isDisabled={isDisabled}
            onChange={onChange}
            name="periodCoundCalendarDays"
            value={getSelectedOption()}
            defaultValue={getSelectedOption()}
            className={customClassNames?.periodTypeSelect?.select}
            innerClassNames={customClassNames?.periodTypeSelect?.innerClassNames}
          />
          <span className="me-2 ms-2">&nbsp;{t("into_the_future")}</span>
        </div>
        <div className="py-2">
          <CheckboxField
            checked={!!rollingExcludeUnavailableDays}
            disabled={isDisabled}
            description={t("always_show_x_days", {
              x: periodDaysWatch,
            })}
            onChange={(e) => {
              const isChecked = e.target.checked;
              formMethods.setValue(
                "periodDays",
                Math.min(periodDaysWatch, ROLLING_WINDOW_PERIOD_MAX_DAYS_TO_CHECK)
              );
              formMethods.setValue(
                "periodType",
                getPeriodTypeFromUiValue({
                  value: PeriodType.ROLLING,
                  rollingExcludeUnavailableDays: isChecked,
                }),
                { shouldDirty: true }
              );
            }}
          />
        </div>
      </div>
    </div>
  );
}

const MinimumBookingNoticeInput = React.forwardRef<
  HTMLInputElement,
  Omit<UseFormRegisterReturn<"minimumBookingNotice">, "ref"> & {
    customClassNames?: SelectClassNames & { input?: string };
  }
>(function MinimumBookingNoticeInput({ customClassNames, ...passThroughProps }, ref) {
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
      ),
      { shouldDirty: true }
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
          className={classNames("mb-0 h-9 rounded-[4px] ltr:mr-2 rtl:ml-2", customClassNames?.input)}
          min={0}
        />
        <input type="hidden" ref={ref} {...passThroughProps} />
      </div>
      <Select
        isSearchable={false}
        isDisabled={passThroughProps.disabled}
        className={classNames(
          "mb-0 ml-2 h-9 w-full capitalize md:min-w-[150px] md:max-w-[200px]",
          customClassNames?.select
        )}
        innerClassNames={customClassNames?.innerClassNames}
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

export const EventLimitsTab = ({ eventType, customClassNames }: EventLimitsTabProps) => {
  const { t, i18n } = useLocale();
  const formMethods = useFormContext<FormValues>();

  const { shouldLockIndicator, shouldLockDisableProps } = useLockedFieldsManager({
    eventType,
    translate: t,
    formMethods,
  });

  const bookingLimitsLocked = shouldLockDisableProps("bookingLimits");
  const durationLimitsLocked = shouldLockDisableProps("durationLimits");
  const onlyFirstAvailableSlotLocked = shouldLockDisableProps("onlyShowFirstAvailableSlot");
  const periodTypeLocked = shouldLockDisableProps("periodType");
  const offsetStartLockedProps = shouldLockDisableProps("offsetStart");

  const [offsetToggle, setOffsetToggle] = useState(formMethods.getValues("offsetStart") > 0);

  // Preview how the offset will affect start times
  const watchOffsetStartValue = formMethods.watch("offsetStart");
  const offsetOriginalTime = new Date();
  offsetOriginalTime.setHours(9, 0, 0, 0);
  const offsetAdjustedTime = new Date(offsetOriginalTime.getTime() + watchOffsetStartValue * 60 * 1000);

  return (
    <div>
      <div
        className={classNames(
          "border-subtle space-y-6 rounded-lg border p-6",
          customClassNames?.bufferAndNoticeSection?.container
        )}>
        <div className="flex flex-col space-y-4  lg:flex-row lg:space-x-4 lg:space-y-0">
          <div
            className={classNames(
              "w-full",
              customClassNames?.bufferAndNoticeSection?.beforeBufferSelect?.container
            )}>
            <Label
              htmlFor="beforeBufferTime"
              className={customClassNames?.bufferAndNoticeSection?.beforeBufferSelect?.label}>
              {t("before_event")}
              {shouldLockIndicator("beforeBufferTime")}
            </Label>
            <Controller
              name="beforeEventBuffer"
              render={({ field: { onChange, value } }) => {
                const beforeBufferOptions = [
                  {
                    label: t("event_buffer_default"),
                    value: 0,
                  },
                  ...getDefinedBufferTimes().map((minutes) => ({
                    label: `${minutes} ${t("minutes")}`,
                    value: minutes,
                  })),
                ];
                return (
                  <Select
                    isSearchable={false}
                    onChange={(val) => {
                      if (val) onChange(val.value);
                    }}
                    isDisabled={shouldLockDisableProps("beforeBufferTime").disabled}
                    defaultValue={
                      beforeBufferOptions.find((option) => option.value === value) || beforeBufferOptions[0]
                    }
                    options={beforeBufferOptions}
                    className={classNames(
                      customClassNames?.bufferAndNoticeSection?.beforeBufferSelect?.select
                    )}
                    innerClassNames={
                      customClassNames?.bufferAndNoticeSection?.beforeBufferSelect?.innerClassNames
                    }
                  />
                );
              }}
            />
          </div>
          <div
            className={classNames(
              "w-full",
              customClassNames?.bufferAndNoticeSection?.afterBufferSelect?.container
            )}>
            <Label
              htmlFor="afterBufferTime"
              className={customClassNames?.bufferAndNoticeSection?.afterBufferSelect?.label}>
              {t("after_event")}
              {shouldLockIndicator("afterBufferTime")}
            </Label>
            <Controller
              name="afterEventBuffer"
              render={({ field: { onChange, value } }) => {
                const afterBufferOptions = [
                  {
                    label: t("event_buffer_default"),
                    value: 0,
                  },
                  ...[5, 10, 15, 20, 30, 45, 60, 90, 120].map((minutes) => ({
                    label: `${minutes} ${t("minutes")}`,
                    value: minutes,
                  })),
                ];
                return (
                  <Select
                    isSearchable={false}
                    onChange={(val) => {
                      if (val) onChange(val.value);
                    }}
                    isDisabled={shouldLockDisableProps("afterBufferTime").disabled}
                    defaultValue={
                      afterBufferOptions.find((option) => option.value === value) || afterBufferOptions[0]
                    }
                    options={afterBufferOptions}
                    className={classNames(
                      customClassNames?.bufferAndNoticeSection?.afterBufferSelect?.select
                    )}
                    innerClassNames={
                      customClassNames?.bufferAndNoticeSection?.afterBufferSelect?.innerClassNames
                    }
                  />
                );
              }}
            />
          </div>
        </div>
        <div className="flex flex-col space-y-4 lg:flex-row lg:space-x-4 lg:space-y-0">
          <div
            className={classNames(
              "w-full",
              customClassNames?.bufferAndNoticeSection?.minimumNoticeInput?.container
            )}>
            <Label
              htmlFor="minimumBookingNotice"
              className={customClassNames?.bufferAndNoticeSection?.minimumNoticeInput?.label}>
              {t("minimum_booking_notice")}
              {shouldLockIndicator("minimumBookingNotice")}
            </Label>
            <MinimumBookingNoticeInput
              customClassNames={customClassNames?.bufferAndNoticeSection?.minimumNoticeInput}
              disabled={shouldLockDisableProps("minimumBookingNotice").disabled}
              {...formMethods.register("minimumBookingNotice")}
            />
          </div>
          <div
            className={classNames(
              "w-full",
              customClassNames?.bufferAndNoticeSection?.timeSlotIntervalSelect?.container
            )}>
            <Label
              htmlFor="slotInterval"
              className={customClassNames?.bufferAndNoticeSection?.timeSlotIntervalSelect?.label}>
              {t("slot_interval")}
              {shouldLockIndicator("slotInterval")}
            </Label>
            <Controller
              name="slotInterval"
              render={() => {
                const slotIntervalOptions = [
                  {
                    label: t("slot_interval_default"),
                    value: -1,
                  },
                  ...[5, 10, 15, 20, 30, 45, 60, 75, 90, 105, 120].map((minutes) => ({
                    label: `${minutes} ${t("minutes")}`,
                    value: minutes,
                  })),
                ];
                return (
                  <Select
                    isSearchable={false}
                    isDisabled={shouldLockDisableProps("slotInterval").disabled}
                    onChange={(val) => {
                      formMethods.setValue("slotInterval", val && (val.value || 0) > 0 ? val.value : null, {
                        shouldDirty: true,
                      });
                    }}
                    defaultValue={
                      slotIntervalOptions.find(
                        (option) => option.value === formMethods.getValues("slotInterval")
                      ) || slotIntervalOptions[0]
                    }
                    options={slotIntervalOptions}
                    className={customClassNames?.bufferAndNoticeSection?.timeSlotIntervalSelect?.select}
                    innerClassNames={
                      customClassNames?.bufferAndNoticeSection?.timeSlotIntervalSelect?.innerClassNames
                    }
                  />
                );
              }}
            />
          </div>
        </div>
      </div>
      <Controller
        name="bookingLimits"
        render={({ field: { value } }) => {
          const isChecked = Object.keys(value ?? {}).length > 0;
          return (
            <SettingsToggle
              toggleSwitchAtTheEnd={true}
              labelClassName={classNames("text-sm", customClassNames?.bookingFrequencyLimit?.label)}
              title={t("limit_booking_frequency")}
              {...bookingLimitsLocked}
              description={t("limit_booking_frequency_description")}
              checked={isChecked}
              onCheckedChange={(active) => {
                if (active) {
                  formMethods.setValue(
                    "bookingLimits",
                    {
                      PER_DAY: 1,
                    },
                    { shouldDirty: true }
                  );
                } else {
                  formMethods.setValue("bookingLimits", {}, { shouldDirty: true });
                }
              }}
              switchContainerClassName={classNames(
                "border-subtle mt-6 rounded-lg border py-6 px-4 sm:px-6",
                isChecked && "rounded-b-none",
                customClassNames?.bookingFrequencyLimit?.container
              )}
              childrenClassName={classNames("lg:ml-0", customClassNames?.bookingFrequencyLimit?.children)}
              descriptionClassName={customClassNames?.bookingFrequencyLimit?.description}>
              <div
                className={classNames(
                  "border-subtle rounded-b-lg border border-t-0 p-6",
                  customClassNames?.bookingFrequencyLimit?.intervalLimitContainer
                )}>
                <IntervalLimitsManager
                  disabled={bookingLimitsLocked.disabled}
                  propertyName="bookingLimits"
                  defaultLimit={1}
                  step={1}
                  customClassNames={customClassNames?.bookingFrequencyLimit?.intervalLimitItem}
                />
              </div>
            </SettingsToggle>
          );
        }}
      />
      <Controller
        name="onlyShowFirstAvailableSlot"
        render={({ field: { onChange, value } }) => {
          const isChecked = value;
          return (
            <SettingsToggle
              toggleSwitchAtTheEnd={true}
              labelClassName={classNames("text-sm", customClassNames?.firstAvailableSlotOnly?.label)}
              title={t("only_show_first_available_slot")}
              description={t("only_show_first_available_slot_description")}
              checked={isChecked}
              {...onlyFirstAvailableSlotLocked}
              onCheckedChange={(active) => {
                onChange(active ?? false);
              }}
              switchContainerClassName={classNames(
                "border-subtle mt-6 rounded-lg border py-6 px-4 sm:px-6",
                isChecked && "rounded-b-none",
                customClassNames?.firstAvailableSlotOnly?.container
              )}
              childrenClassName={customClassNames?.firstAvailableSlotOnly?.children}
              descriptionClassName={customClassNames?.firstAvailableSlotOnly?.description}
            />
          );
        }}
      />
      <Controller
        name="durationLimits"
        render={({ field: { onChange, value } }) => {
          const isChecked = Object.keys(value ?? {}).length > 0;
          return (
            <SettingsToggle
              labelClassName={classNames("text-sm", customClassNames?.totalDurationLimit?.label)}
              toggleSwitchAtTheEnd={true}
              switchContainerClassName={classNames(
                "border-subtle mt-6 rounded-lg border py-6 px-4 sm:px-6",
                isChecked && "rounded-b-none",
                customClassNames?.totalDurationLimit?.container
              )}
              childrenClassName={classNames("lg:ml-0", customClassNames?.totalDurationLimit?.children)}
              descriptionClassName={customClassNames?.totalDurationLimit?.description}
              title={t("limit_total_booking_duration")}
              description={t("limit_total_booking_duration_description")}
              {...durationLimitsLocked}
              checked={isChecked}
              onCheckedChange={(active) => {
                if (active) {
                  onChange({
                    PER_DAY: 60,
                  });
                } else {
                  onChange({});
                }
              }}>
              <div className="border-subtle rounded-b-lg border border-t-0 p-6">
                <IntervalLimitsManager
                  propertyName="durationLimits"
                  defaultLimit={60}
                  disabled={durationLimitsLocked.disabled}
                  step={15}
                  textFieldSuffix={t("minutes")}
                  customClassNames={customClassNames?.totalDurationLimit?.intervalLimitItem}
                />
              </div>
            </SettingsToggle>
          );
        }}
      />
      <Controller
        name="periodType"
        render={({ field: { onChange, value } }) => {
          const isChecked = value && value !== "UNLIMITED";

          const { value: watchPeriodTypeUiValue, rollingExcludeUnavailableDays } = getUiValueFromPeriodType(
            formMethods.watch("periodType")
          );

          return (
            <SettingsToggle
              labelClassName={classNames("text-sm", customClassNames?.futureBookingLimit?.label)}
              toggleSwitchAtTheEnd={true}
              switchContainerClassName={classNames(
                "border-subtle mt-6 rounded-lg border py-6 px-4 sm:px-6",
                isChecked && "rounded-b-none",
                customClassNames?.futureBookingLimit?.container
              )}
              childrenClassName={classNames("lg:ml-0", customClassNames?.futureBookingLimit?.children)}
              descriptionClassName={customClassNames?.futureBookingLimit?.description}
              title={t("limit_future_bookings")}
              description={t("limit_future_bookings_description")}
              {...periodTypeLocked}
              checked={isChecked}
              onCheckedChange={(isEnabled) => {
                if (isEnabled && !formMethods.getValues("periodDays")) {
                  formMethods.setValue("periodDays", 30, { shouldDirty: true });
                }
                return onChange(isEnabled ? PeriodType.ROLLING : PeriodType.UNLIMITED);
              }}>
              <div className="border-subtle rounded-b-lg border border-t-0 p-6">
                <RadioGroup.Root
                  value={watchPeriodTypeUiValue}
                  onValueChange={(val) => {
                    formMethods.setValue(
                      "periodType",
                      getPeriodTypeFromUiValue({
                        value: val as IPeriodType,
                        rollingExcludeUnavailableDays: formMethods.getValues("rollingExcludeUnavailableDays"),
                      }),
                      {
                        shouldDirty: true,
                      }
                    );
                  }}>
                  {(periodTypeLocked.disabled ? watchPeriodTypeUiValue === PeriodType.ROLLING : true) && (
                    <RollingLimitRadioItem
                      rollingExcludeUnavailableDays={!!rollingExcludeUnavailableDays}
                      radioValue={PeriodType.ROLLING}
                      isDisabled={periodTypeLocked.disabled}
                      formMethods={formMethods}
                      customClassNames={customClassNames?.futureBookingLimit?.rollingLimit}
                      onChange={(opt) => {
                        formMethods.setValue("periodCountCalendarDays", opt?.value === 1, {
                          shouldDirty: true,
                        });
                      }}
                    />
                  )}
                  {(periodTypeLocked.disabled ? watchPeriodTypeUiValue === PeriodType.RANGE : true) && (
                    <RangeLimitRadioItem
                      radioValue={PeriodType.RANGE}
                      customClassNames={customClassNames?.futureBookingLimit?.rangeLimit}
                      isDisabled={periodTypeLocked.disabled}
                      formMethods={formMethods}
                    />
                  )}
                </RadioGroup.Root>
              </div>
            </SettingsToggle>
          );
        }}
      />
      <SettingsToggle
        labelClassName={classNames("text-sm", customClassNames?.offsetStartTimes?.label)}
        toggleSwitchAtTheEnd={true}
        switchContainerClassName={classNames(
          "border-subtle mt-6 rounded-lg border py-6 px-4 sm:px-6",
          offsetToggle && "rounded-b-none",
          customClassNames?.offsetStartTimes?.container
        )}
        childrenClassName={classNames("lg:ml-0", customClassNames?.offsetStartTimes?.children)}
        title={t("offset_toggle")}
        descriptionClassName={customClassNames?.offsetStartTimes?.description}
        description={t("offset_toggle_description")}
        {...offsetStartLockedProps}
        checked={offsetToggle}
        onCheckedChange={(active) => {
          setOffsetToggle(active);
          if (!active) {
            formMethods.setValue("offsetStart", 0, { shouldDirty: true });
          }
        }}>
        <div className={classNames("border-subtle rounded-b-lg border border-t-0 p-6")}>
          <TextField
            required
            type="number"
            containerClassName={classNames(
              "max-w-80",
              customClassNames?.offsetStartTimes?.offsetInput?.container
            )}
            labelClassName={customClassNames?.offsetStartTimes?.offsetInput?.label}
            addOnClassname={customClassNames?.offsetStartTimes?.offsetInput?.addOn}
            className={customClassNames?.offsetStartTimes?.offsetInput?.input}
            label={t("offset_start")}
            {...formMethods.register("offsetStart", { setValueAs: (value) => Number(value) })}
            addOnSuffix={<>{t("minutes")}</>}
            hint={t("offset_start_description", {
              originalTime: offsetOriginalTime.toLocaleTimeString(i18n.language, { timeStyle: "short" }),
              adjustedTime: offsetAdjustedTime.toLocaleTimeString(i18n.language, { timeStyle: "short" }),
            })}
          />
        </div>
      </SettingsToggle>
    </div>
  );
};

type IntervalLimitsKey = keyof IntervalLimit;

const INTERVAL_LIMIT_OPTIONS = ascendingLimitKeys.map((key) => ({
  value: key as keyof IntervalLimit,
  label: `Per ${intervalLimitKeyToUnit(key)}`,
}));

type IntervalLimitItemCustomClassNames = {
  addLimitButton?: string;
  limitText?: string;
  limitSelect?: Omit<SelectClassNames, "label" | "container">;
  container?: string;
};

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
  customClassNames?: IntervalLimitItemCustomClassNames;
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
  customClassNames,
}: IntervalLimitItemProps) => {
  return (
    <div
      data-testid="add-limit"
      className={classNames(
        "mb-4 flex max-h-9 items-center space-x-2 text-sm rtl:space-x-reverse",
        customClassNames?.container
      )}
      key={limitKey}>
      <TextField
        required
        type="number"
        containerClassName={textFieldSuffix ? "w-44 -mb-1" : "w-16 mb-0"}
        className={classNames("mb-0", customClassNames?.limitText)}
        placeholder={`${value}`}
        disabled={disabled}
        min={step}
        step={step}
        defaultValue={value}
        addOnSuffix={textFieldSuffix}
        onChange={(e) => onLimitChange(limitKey, parseInt(e.target.value || "0", 10))}
      />
      <Select
        options={selectOptions}
        isSearchable={false}
        isDisabled={disabled}
        defaultValue={INTERVAL_LIMIT_OPTIONS.find((option) => option.value === limitKey)}
        onChange={onIntervalSelect}
        className={classNames("w-36", customClassNames?.limitSelect?.select)}
        innerClassNames={customClassNames?.limitSelect?.innerClassNames}
      />
      {hasDeleteButton && !disabled && (
        <Button
          variant="icon"
          StartIcon="trash-2"
          color="destructive"
          className={classNames("border-none", customClassNames?.addLimitButton)}
          onClick={() => onDelete(limitKey)}
        />
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
  customClassNames?: IntervalLimitItemCustomClassNames;
};

export const IntervalLimitsManager = <K extends "durationLimits" | "bookingLimits">({
  propertyName,
  defaultLimit,
  step,
  textFieldSuffix,
  disabled,
  customClassNames,
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

          setValue(
            propertyName,
            // @ts-expect-error FIXME Fix these typings
            {
              ...watchIntervalLimits,
              [rest.value]: defaultLimit,
            },
            { shouldDirty: true }
          );
        };

        return (
          <ul ref={animateRef}>
            {currentIntervalLimits &&
              watchIntervalLimits &&
              Object.entries(currentIntervalLimits)
                .sort(([limitKeyA], [limitKeyB]) => {
                  return (
                    ascendingLimitKeys.indexOf(limitKeyA as IntervalLimitsKey) -
                    ascendingLimitKeys.indexOf(limitKeyB as IntervalLimitsKey)
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
                        setValue(`${propertyName}.${intervalLimitKey}`, val, { shouldDirty: true })
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
                      customClassNames={customClassNames}
                    />
                  );
                })}
            {currentIntervalLimits && Object.keys(currentIntervalLimits).length <= 3 && !disabled && (
              <Button color="minimal" StartIcon="plus" onClick={addLimit}>
                {t("add_limit")}
              </Button>
            )}
          </ul>
        );
      }}
    />
  );
};
