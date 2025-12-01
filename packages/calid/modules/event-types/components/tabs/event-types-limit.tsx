import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@calid/features/ui/components/card";
import { Icon } from "@calid/features/ui/components/icon";
import { CheckboxField } from "@calid/features/ui/components/input/checkbox-field";
import { NumberInput } from "@calid/features/ui/components/input/input";
import { Label } from "@calid/features/ui/components/label";
import { Popover, PopoverContent, PopoverTrigger } from "@calid/features/ui/components/popover";
import { RadioGroup } from "@calid/features/ui/components/radio-group";
import { RadioGroupItem } from "@calid/features/ui/components/radio-group";
import { Switch } from "@calid/features/ui/components/switch";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { TFunction } from "i18next";
import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useFormContext, Controller } from "react-hook-form";

import { getDefinedBufferTimes } from "@calcom/features/eventtypes/lib/getDefinedBufferTimes";
import type { FormValues, EventTypeSetup } from "@calcom/features/eventtypes/lib/types";
import { ROLLING_WINDOW_PERIOD_MAX_DAYS_TO_CHECK } from "@calcom/lib/constants";
import type { DurationType } from "@calcom/lib/convertToNewDurationType";
import convertToNewDurationType from "@calcom/lib/convertToNewDurationType";
import findDurationType from "@calcom/lib/findDurationType";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { ascendingLimitKeys, intervalLimitKeyToUnit } from "@calcom/lib/intervalLimits/intervalLimit";
import type { IntervalLimit } from "@calcom/lib/intervalLimits/intervalLimitSchema";
import { PeriodType } from "@calcom/prisma/enums";
import { Select } from "@calcom/ui/components/form";
import { DateRangePicker } from "@calcom/ui/components/form";

import { FieldPermissionIndicator, useFieldPermissions } from "./hooks/useFieldPermissions";

type IPeriodType = (typeof PeriodType)[keyof typeof PeriodType];
type IntervalLimitsKey = keyof IntervalLimit;

export interface EventLimitsProps {
  eventType: EventTypeSetup;
}

interface PeriodTypeUiValue {
  value: PeriodType;
  rollingExcludeUnavailableDays: boolean | null;
}

interface SettingsToggleProps {
  title: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  children?: React.ReactNode;
  tooltip?: string;
  LockedIcon?: React.ReactNode;
}

const INTERVAL_LIMIT_OPTIONS = ascendingLimitKeys.map((key) => ({
  value: key as keyof IntervalLimit,
  label: `Per ${intervalLimitKeyToUnit(key)}`,
}));

const getUiValueFromPeriodType = (periodType: PeriodType): PeriodTypeUiValue => {
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

const getPeriodTypeFromUiValue = (uiValue: {
  value: PeriodType;
  rollingExcludeUnavailableDays: boolean;
}): PeriodType => {
  if (uiValue.value === PeriodType.ROLLING && uiValue.rollingExcludeUnavailableDays === true) {
    return PeriodType.ROLLING_WINDOW;
  }
  return uiValue.value;
};

const createBufferTimeOptions = (t: TFunction, includeCustomTimes = false) => {
  const baseOptions = [{ value: "0", label: t("event_buffer_default") }];

  if (includeCustomTimes) {
    baseOptions.push(
      ...getDefinedBufferTimes().map((minutes) => ({
        value: minutes.toString(),
        label: `${minutes} ${t("minutes")}`,
      }))
    );
  } else {
    baseOptions.push(
      ...[5, 10, 15, 20, 30, 45, 60, 90, 120].map((minutes) => ({
        value: minutes.toString(),
        label: `${minutes} ${t("minutes")}`,
      }))
    );
  }

  return baseOptions;
};

const createSlotIntervalOptions = (t: TFunction) => [
  { value: "-1", label: t("slot_interval_default") },
  ...[5, 10, 15, 20, 30, 45, 60, 75, 90, 105, 120].map((minutes) => ({
    value: minutes.toString(),
    label: `${minutes} ${t("minutes")}`,
  })),
];

const useMinimumBookingNotice = (fieldName: string) => {
  const { setValue, getValues } = useFormContext<FormValues>();
  const { t } = useLocale();

  const durationTypeOptions: { value: DurationType; label: string }[] = [
    { label: t("minutes"), value: "minutes" },
    { label: t("hours"), value: "hours" },
    { label: t("days"), value: "days" },
  ];

  const [displayValues, setDisplayValues] = useState<{
    type: DurationType;
    value: number;
  }>(() => {
    const currentValue = Number(getValues(fieldName as keyof FormValues)) || 0;
    return {
      type: findDurationType(currentValue),
      value: convertToNewDurationType("minutes", findDurationType(currentValue), currentValue),
    };
  });

  useEffect(() => {
    setValue(
      fieldName as keyof FormValues,
      convertToNewDurationType(displayValues.type, "minutes", displayValues.value),
      { shouldDirty: true }
    );
  }, [displayValues, setValue, fieldName]);

  return {
    displayValues,
    setDisplayValues,
    durationTypeOptions,
  };
};

const useOffsetTimePreview = (offsetMinutes: number, locale: string) => {
  return useMemo(() => {
    const originalTime = new Date();
    originalTime.setHours(9, 0, 0, 0);

    const adjustedTime = new Date(originalTime.getTime() + offsetMinutes * 60 * 1000);

    return {
      original: originalTime.toLocaleTimeString(locale, { timeStyle: "short" }),
      adjusted: adjustedTime.toLocaleTimeString(locale, { timeStyle: "short" }),
    };
  }, [offsetMinutes, locale]);
};

const SettingsToggle = memo(
  ({
    title,
    description,
    checked,
    onCheckedChange,
    disabled,
    children,
    tooltip,
    LockedIcon,
  }: SettingsToggleProps) => (
    <Card title={tooltip}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 p-6">
        <div className="flex-1 pr-8">
          <CardTitle className="flex items-center">
            {title}
            {LockedIcon}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
      </CardHeader>
      {checked && children && <CardContent className="border-default border-t p-6">{children}</CardContent>}
    </Card>
  )
);

SettingsToggle.displayName = "SettingsToggle";

const MinimumBookingNoticeInput = memo(({ disabled, name }: { disabled?: boolean; name: string }) => {
  const { register } = useFormContext<FormValues>();
  const { displayValues, setDisplayValues, durationTypeOptions } = useMinimumBookingNotice(name);

  return (
    <div className="flex items-center space-x-3">
      <NumberInput
        disabled={disabled}
        value={displayValues.value}
        onChange={(e) =>
          setDisplayValues({
            ...displayValues,
            value: parseInt(e.target.value || "0", 10),
          })
        }
        className="w-full"
        min={0}
        placeholder="0"
      />
      <Select
        value={durationTypeOptions.find((opt) => opt.value === displayValues.type)}
        onChange={(option) =>
          setDisplayValues({
            ...displayValues,
            type: (option?.value as DurationType) || "minutes",
          })
        }
        options={durationTypeOptions}
        isDisabled={disabled}
        className="w-full"
      />
      <input type="hidden" {...register(name as keyof FormValues)} />
    </div>
  );
});

MinimumBookingNoticeInput.displayName = "MinimumBookingNoticeInput";

const RollingLimitRadioItem = memo(
  ({
    radioValue,
    isDisabled,
    onChange,
    rollingExcludeUnavailableDays,
  }: {
    radioValue: IPeriodType;
    isDisabled: boolean;
    onChange: (opt: { value: number } | null) => void;
    rollingExcludeUnavailableDays: boolean;
  }) => {
    const { t } = useLocale();
    const formMethods = useFormContext<FormValues>();
    const periodDaysWatch = formMethods.watch("periodDays");

    const dayTypeOptions = [
      { value: 0, label: t("business_days") },
      { value: 1, label: t("calendar_days") },
    ];

    const getSelectedOption = useCallback(
      () =>
        dayTypeOptions.find(
          (opt) => opt.value === (formMethods.getValues("periodCountCalendarDays") === true ? 1 : 0)
        ),
      [formMethods, dayTypeOptions]
    );

    const handleExcludeUnavailableDaysChange = useCallback(
      (isChecked: boolean) => {
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
      },
      [formMethods, periodDaysWatch]
    );

    return (
      <div className="mb-2 flex flex-wrap items-baseline text-sm text-gray-700">
        {!isDisabled && <RadioGroupItem id={radioValue} value={radioValue} className="mr-2" />}

        <div>
          <div className="flex items-center space-x-2">
            <NumberInput
              className="my-0 block w-16"
              placeholder="30"
              disabled={isDisabled}
              min={0}
              max={rollingExcludeUnavailableDays ? ROLLING_WINDOW_PERIOD_MAX_DAYS_TO_CHECK : undefined}
              {...formMethods.register("periodDays", { valueAsNumber: true })}
            />
            <Select
              value={getSelectedOption()}
              onChange={(option) => onChange({ value: option?.value || 0 })}
              options={dayTypeOptions}
              isDisabled={isDisabled}
              className="w-40"
            />
            <span className="text-sm text-gray-600">{t("into_the_future")}</span>
          </div>

          <div className="flex flex-col py-2">
            <Label className="flex items-center space-x-2">
              <CheckboxField
                checked={!!rollingExcludeUnavailableDays}
                disabled={isDisabled}
                onCheckedChange={handleExcludeUnavailableDaysChange}
              />
              <span className="text-sm text-gray-600">{t("always_show_x_days", { x: periodDaysWatch })}</span>
            </Label>
          </div>
        </div>
      </div>
    );
  }
);

RollingLimitRadioItem.displayName = "RollingLimitRadioItem";

const RangeLimitRadioItem = memo(
  ({
    isDisabled,
    radioValue,
    watchPeriodTypeUiValue,
  }: {
    isDisabled: boolean;
    radioValue: string;
    watchPeriodTypeUiValue: IPeriodType;
  }) => {
    const { t } = useLocale();
    const [dateRange, setDateRange] = useState<{ startDate?: Date; endDate?: Date } | undefined>();

    const handleDateChange = useCallback(({ startDate, endDate }: { startDate?: Date; endDate?: Date }, onChange: (value: any) => void) => {
      setDateRange({ startDate, endDate });
      onChange({
        startDate,
        endDate,
      });
    }, []);

    return (
      <div className="mb-2 text-sm text-gray-700 sm:flex-row sm:items-center">
        <div className="flex w-full items-center sm:w-auto">
          {!isDisabled && <RadioGroupItem id={radioValue} value={radioValue} className="mr-2" />}
          <span>{t("within_date_range")}</span>
        </div>

        {watchPeriodTypeUiValue === PeriodType.RANGE && (
          <div className="ml-6 mt-2">
            <Controller
              name="periodDates"
              render={({ field: { onChange } }) => (
                <div className="w-fit">
                  <DateRangePicker
                    dates={dateRange || { startDate: undefined, endDate: undefined }}
                    onDatesChange={(dates) => handleDateChange(dates, onChange)}
                    disabled={isDisabled}
                    minDate={new Date()}
                    data-testid="period-dates-picker"
                  />
                </div>
              )}
            />
          </div>
        )}
      </div>
    );
  }
);

RangeLimitRadioItem.displayName = "RangeLimitRadioItem";

/**
 * Individual interval limit item with input, select, and delete controls
 */
const IntervalLimitItem = memo(
  ({
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
  }: {
    limitKey: IntervalLimitsKey;
    step: number;
    value: number;
    textFieldSuffix?: string;
    selectOptions: { value: keyof IntervalLimit; label: string }[];
    hasDeleteButton?: boolean;
    disabled?: boolean;
    onDelete: (intervalLimitsKey: IntervalLimitsKey) => void;
    onLimitChange: (intervalLimitsKey: IntervalLimitsKey, limit: number) => void;
    onIntervalSelect: (oldKey: IntervalLimitsKey, newKey: keyof IntervalLimit) => void;
  }) => {
    const handleLimitChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onLimitChange(limitKey, parseInt(e.target.value || "0", 10));
      },
      [limitKey, onLimitChange]
    );

    const handleIntervalChange = useCallback(
      (newValue: string) => {
        if (newValue !== limitKey) {
          onIntervalSelect(limitKey, newValue as keyof IntervalLimit);
        }
      },
      [limitKey, onIntervalSelect]
    );

    const handleDelete = useCallback(() => {
      onDelete(limitKey);
    }, [limitKey, onDelete]);

    return (
      <div
        data-testid="add-limit"
        className="mb-4 flex w-full min-w-0 items-center gap-x-2 text-sm"
        key={limitKey}>
        <NumberInput
          className="w-20"
          placeholder={`${value}`}
          disabled={disabled}
          min={step}
          step={step}
          defaultValue={value}
          onChange={handleLimitChange}
        />

        {textFieldSuffix && <span className="text-sm text-gray-600">{textFieldSuffix}</span>}

        <Select
          value={selectOptions.find((opt) => opt.value === limitKey)}
          onChange={(option) => handleIntervalChange(option?.value || limitKey)}
          options={selectOptions}
          isDisabled={disabled}
          className="w-36"
        />

        {hasDeleteButton && !disabled && (
          <button
            className="flex items-center rounded-lg border border-red-200 px-2 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
            onClick={handleDelete}>
            <Icon name="trash-2" className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);

IntervalLimitItem.displayName = "IntervalLimitItem";

export const IntervalLimitsManager = memo(
  ({
    propertyName,
    defaultLimit,
    step,
    textFieldSuffix,
    disabled,
    fieldPermissions,
  }: {
    propertyName: "durationLimits" | "bookingLimits";
    defaultLimit: number;
    step: number;
    textFieldSuffix?: string;
    disabled?: boolean;
    fieldPermissions: ReturnType<typeof useFieldPermissions>;
  }) => {
    const { watch, setValue, control } = useFormContext<FormValues>();
    const { t } = useLocale();
    const [animateRef] = useAutoAnimate<HTMLUListElement>();
    const watchIntervalLimits = watch(propertyName);

    const isFieldDisabled = fieldPermissions?.getFieldState(propertyName).isDisabled;
    const effectiveDisabled = disabled || isFieldDisabled;

    const addLimit = useCallback(() => {
      if (!watchIntervalLimits) return;

      const currentKeys = Object.keys(watchIntervalLimits);
      const availableOption = INTERVAL_LIMIT_OPTIONS.find((option) => !currentKeys.includes(option.value));

      if (!availableOption) return;

      setValue(propertyName, {
        ...watchIntervalLimits,
        [availableOption.value]: defaultLimit,
      });
    }, [watchIntervalLimits, propertyName, setValue, defaultLimit]);

    const handleLimitChange = useCallback(
      (intervalLimitKey: IntervalLimitsKey, val: number) => {
        setValue(`${propertyName}.${intervalLimitKey}` as any, val, { shouldDirty: true });
      },
      [propertyName, setValue]
    );

    const handleDelete = useCallback(
      (intervalLimitKey: IntervalLimitsKey, currentLimits: any, onChange: (value: any) => void) => {
        const updated = { ...currentLimits };
        delete updated[intervalLimitKey];
        onChange(updated);
      },
      []
    );

    const handleIntervalSelect = useCallback(
      (
        oldKey: IntervalLimitsKey,
        newKey: keyof IntervalLimit,
        currentLimits: any,
        onChange: (value: any) => void
      ) => {
        if (oldKey === newKey) return;

        const updated = { ...currentLimits };
        const currentValue = updated[oldKey];
        delete updated[oldKey];
        updated[newKey] = currentValue;
        onChange(updated);
      },
      []
    );

    return (
      <Controller
        name={propertyName}
        control={control}
        render={({ field: { value: currentIntervalLimits, onChange } }) => (
          <ul ref={animateRef} className="space-y-2">
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
                      value={value as number}
                      disabled={effectiveDisabled}
                      textFieldSuffix={textFieldSuffix}
                      hasDeleteButton={Object.keys(currentIntervalLimits).length > 1}
                      selectOptions={INTERVAL_LIMIT_OPTIONS.filter(
                        (option) =>
                          !Object.keys(currentIntervalLimits).includes(option.value) ||
                          option.value === limitKey
                      )}
                      onLimitChange={handleLimitChange}
                      onDelete={(intervalLimitKey) =>
                        handleDelete(intervalLimitKey, currentIntervalLimits, onChange)
                      }
                      onIntervalSelect={(oldKey, newKey) =>
                        handleIntervalSelect(oldKey, newKey, currentIntervalLimits, onChange)
                      }
                    />
                  );
                })}

            {currentIntervalLimits &&
              Object.keys(currentIntervalLimits).length <= 3 &&
              !effectiveDisabled && (
                <button
                  onClick={addLimit}
                  className="flex items-center space-x-1 text-sm font-medium text-blue-600 hover:text-blue-700">
                  <Icon name="plus" className="h-4 w-4" />
                  <span>{t("add_limit")}</span>
                </button>
              )}
          </ul>
        )}
      />
    );
  }
);

IntervalLimitsManager.displayName = "IntervalLimitsManager";

const MaxActiveBookingsPerBookerController = memo(
  ({ fieldPermissions }: { fieldPermissions: ReturnType<typeof useFieldPermissions> }) => {
    const { t } = useLocale();
    const formMethods = useFormContext<FormValues>();

    const [maxActiveBookingsPerBookerToggle, setMaxActiveBookingsPerBookerToggle] = useState(
      (formMethods.getValues("maxActiveBookingsPerBooker") ?? 0) > 0
    );

    const isRecurringEvent = !!formMethods.getValues("recurringEvent");
    const maxActiveBookingPerBookerOfferReschedule = formMethods.watch(
      "maxActiveBookingPerBookerOfferReschedule"
    );

    const handleToggleChange = useCallback(
      (active: boolean, onChange: (value: any) => void) => {
        if (active) {
          onChange(1);
        } else {
          onChange(null);
        }
        setMaxActiveBookingsPerBookerToggle(!maxActiveBookingsPerBookerToggle);
      },
      [maxActiveBookingsPerBookerToggle]
    );

    const handleInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>, onChange: (value: any) => void) => {
        onChange(e.target.value === "" ? null : parseInt(e.target.value, 10));
      },
      []
    );

    const handleOfferRescheduleChange = useCallback(
      (isChecked: boolean) => {
        formMethods.setValue("maxActiveBookingPerBookerOfferReschedule", isChecked, {
          shouldDirty: true,
        });
      },
      [formMethods]
    );

    return (
      <Controller
        name="maxActiveBookingsPerBooker"
        render={({ field: { onChange, value } }) => (
          <SettingsToggle
            title={t("booker_booking_limit")}
            description={t("booker_booking_limit_description")}
            checked={maxActiveBookingsPerBookerToggle}
            disabled={
              isRecurringEvent || fieldPermissions.getFieldState("maxActiveBookingsPerBooker").isDisabled
            }
            tooltip={isRecurringEvent ? t("recurring_event_doesnt_support_booker_booking_limit") : ""}
            LockedIcon={
              <FieldPermissionIndicator
                fieldName="maxActiveBookingsPerBooker"
                fieldPermissions={fieldPermissions}
                t={t}
              />
            }
            onCheckedChange={(active) => handleToggleChange(active, onChange)}>
            <div className="space-y-4">
              <div>
                <Label>Maximum bookings</Label>
                <div className="flex items-center space-x-2">
                  <NumberInput
                    value={value ?? ""}
                    onChange={(e) => handleInputChange(e, onChange)}
                    min={1}
                    step={1}
                    className="w-20"
                    data-testid="booker-booking-limit-input"
                    placeholder="1"
                  />
                  <span className="text-sm text-gray-600">bookings</span>
                </div>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <CheckboxField
                    checked={!!maxActiveBookingPerBookerOfferReschedule}
                    onCheckedChange={handleOfferRescheduleChange}
                  />
                  <span className="text-sm text-gray-600">{t("offer_to_reschedule_last_booking")}</span>
                </div>
              </div>
            </div>
          </SettingsToggle>
        )}
      />
    );
  }
);

MaxActiveBookingsPerBookerController.displayName = "MaxActiveBookingsPerBookerController";

const BeforeAfterEventSection = memo(
  ({ fieldPermissions }: { fieldPermissions: ReturnType<typeof useFieldPermissions> }) => {
    const { t } = useLocale();
    const formMethods = useFormContext<FormValues>();

    const beforeBufferOptions = useMemo(() => createBufferTimeOptions(t, true), [t]);
    const afterBufferOptions = useMemo(() => createBufferTimeOptions(t), [t]);
    const slotIntervalOptions = useMemo(() => createSlotIntervalOptions(t), [t]);

    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardContent>
            <div className="space-y-6">
              <div>
                <Label>
                  {t("before_event")}
                  <FieldPermissionIndicator
                    fieldName="beforeEventBuffer"
                    fieldPermissions={fieldPermissions}
                    t={t}
                  />
                </Label>
                <Controller
                  name="beforeEventBuffer"
                  render={({ field: { onChange, value } }) => (
                    <Select
                      value={beforeBufferOptions.find((opt) => opt.value === value?.toString())}
                      onChange={(option) => onChange(parseInt(option?.value || "0"))}
                      options={beforeBufferOptions}
                      className="w-full"
                      isDisabled={fieldPermissions.getFieldState("beforeEventBuffer").isDisabled}
                    />
                  )}
                />
              </div>

              <div>
                <Label>
                  {t("minimum_booking_notice")}
                  <FieldPermissionIndicator
                    fieldName="minimumBookingNotice"
                    fieldPermissions={fieldPermissions}
                    t={t}
                  />
                </Label>
                <MinimumBookingNoticeInput
                  name="minimumBookingNotice"
                  disabled={fieldPermissions.getFieldState("minimumBookingNotice").isDisabled}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="space-y-6">
              <div>
                <Label>
                  {t("after_event")}
                  <FieldPermissionIndicator
                    fieldName="afterEventBuffer"
                    fieldPermissions={fieldPermissions}
                    t={t}
                  />
                </Label>
                <Controller
                  name="afterEventBuffer"
                  render={({ field: { onChange, value } }) => (
                    <Select
                      value={afterBufferOptions.find((opt) => opt.value === value?.toString())}
                      onChange={(option) => onChange(parseInt(option?.value || "0"))}
                      options={afterBufferOptions}
                      className="w-full"
                      isDisabled={fieldPermissions.getFieldState("afterEventBuffer").isDisabled}
                    />
                  )}
                />
              </div>

              <div>
                <Label>
                  {t("slot_interval")}
                  <FieldPermissionIndicator
                    fieldName="slotInterval"
                    fieldPermissions={fieldPermissions}
                    t={t}
                  />
                </Label>
                <Controller
                  name="slotInterval"
                  render={({ field: { value } }) => (
                    <Select
                      value={slotIntervalOptions.find((opt) => opt.value === value?.toString())}
                      onChange={(option) => {
                        const numVal = parseInt(option?.value || "-1");
                        formMethods.setValue("slotInterval", numVal > 0 ? numVal : null, {
                          shouldDirty: true,
                        });
                      }}
                      options={slotIntervalOptions}
                      className="w-full"
                      isDisabled={fieldPermissions.getFieldState("slotInterval").isDisabled}
                    />
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
);

BeforeAfterEventSection.displayName = "BeforeAfterEventSection";

const OffsetStartSection = memo(
  ({
    offsetToggle,
    setOffsetToggle,
    fieldPermissions,
  }: {
    offsetToggle: boolean;
    setOffsetToggle: (value: boolean) => void;
    fieldPermissions: ReturnType<typeof useFieldPermissions>;
  }) => {
    const { t, i18n } = useLocale();
    const formMethods = useFormContext<FormValues>();
    const watchOffsetStartValue = formMethods.watch("offsetStart");
    const timePreview = useOffsetTimePreview(watchOffsetStartValue, i18n.language);

    const handleToggleChange = useCallback(
      (active: boolean) => {
        setOffsetToggle(active);
        if (!active) {
          formMethods.setValue("offsetStart", 0, { shouldDirty: true });
        }
      },
      [setOffsetToggle, formMethods]
    );

    if (formMethods.getValues("offsetStart") <= 0) return null;

    return (
      <SettingsToggle
        title={t("offset_toggle")}
        description={t("offset_toggle_description")}
        checked={offsetToggle}
        disabled={fieldPermissions.getFieldState("offsetStart").isDisabled}
        LockedIcon={
          <FieldPermissionIndicator fieldName="offsetStart" fieldPermissions={fieldPermissions} t={t} />
        }
        onCheckedChange={handleToggleChange}>
        <div className="space-y-3">
          <div>
            <Label>{t("offset_start")}</Label>
            <div className="flex items-center space-x-2">
              <NumberInput
                className="w-20"
                {...formMethods.register("offsetStart", { setValueAs: (value) => Number(value) })}
              />
              <span className="text-sm text-gray-600">{t("minutes")}</span>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            {t("offset_start_description", {
              originalTime: timePreview.original,
              adjustedTime: timePreview.adjusted,
            })}
          </p>
        </div>
      </SettingsToggle>
    );
  }
);

OffsetStartSection.displayName = "OffsetStartSection";

export const EventLimits = ({ eventType }: EventLimitsProps) => {
  const { t } = useLocale();
  const formMethods = useFormContext<FormValues>();
  const [offsetToggle, setOffsetToggle] = useState(formMethods.getValues("offsetStart") > 0);

  // Field permissions management
  const fieldPermissions = useFieldPermissions({ eventType, translate: t, formMethods });
  console.log("fieldPermissions:", fieldPermissions);

  const watchPeriodType = formMethods.watch("periodType");
  const { value: watchPeriodTypeUiValue, rollingExcludeUnavailableDays } =
    getUiValueFromPeriodType(watchPeriodType);

  const handleBookingLimitsToggle = useCallback(
    (active: boolean) => {
      if (active) {
        formMethods.setValue("bookingLimits", { PER_DAY: 1 }, { shouldDirty: true });
      } else {
        formMethods.setValue("bookingLimits", {}, { shouldDirty: true });
      }
    },
    [formMethods]
  );

  const handleDurationLimitsToggle = useCallback((active: boolean, onChange: (value: any) => void) => {
    if (active) {
      onChange({ PER_DAY: 60 });
    } else {
      onChange({});
    }
  }, []);

  const handleOnlyFirstSlotToggle = useCallback((active: boolean, onChange: (value: any) => void) => {
    onChange(active ?? false);
  }, []);

  const handleFutureBookingsToggle = useCallback(
    (isEnabled: boolean, onChange: (value: any) => void) => {
      if (isEnabled && !formMethods.getValues("periodDays")) {
        formMethods.setValue("periodDays", 30, { shouldDirty: true });
      }
      return onChange(isEnabled ? PeriodType.ROLLING : PeriodType.UNLIMITED);
    },
    [formMethods]
  );

  const handlePeriodTypeChange = useCallback(
    (val: string) => {
      formMethods.setValue(
        "periodType",
        getPeriodTypeFromUiValue({
          value: val as IPeriodType,
          rollingExcludeUnavailableDays: formMethods.getValues("rollingExcludeUnavailableDays"),
        }),
        { shouldDirty: true }
      );
    },
    [formMethods]
  );

  const handleRollingDayTypeChange = useCallback(
    (opt: { value: number } | null) => {
      formMethods.setValue("periodCountCalendarDays", opt?.value === 1, {
        shouldDirty: true,
      });
    },
    [formMethods]
  );

  return (
    <div className="mx-auto max-w-none space-y-6 p-0">
      <BeforeAfterEventSection fieldPermissions={fieldPermissions} />

      <Controller
        name="bookingLimits"
        render={({ field: { value } }) => {
          const isChecked = Object.keys(value ?? {}).length > 0;
          return (
            <SettingsToggle
              title={t("limit_booking_frequency")}
              description={t("limit_booking_frequency_description")}
              checked={isChecked}
              disabled={fieldPermissions.getFieldState("bookingLimits").isDisabled}
              LockedIcon={
                <FieldPermissionIndicator
                  fieldName="bookingLimits"
                  fieldPermissions={fieldPermissions}
                  t={t}
                />
              }
              onCheckedChange={handleBookingLimitsToggle}>
              <IntervalLimitsManager
                propertyName="bookingLimits"
                defaultLimit={1}
                step={1}
                fieldPermissions={fieldPermissions}
              />
            </SettingsToggle>
          );
        }}
      />

      <Controller
        name="onlyShowFirstAvailableSlot"
        render={({ field: { onChange, value } }) => (
          <SettingsToggle
            title={t("only_show_first_available_slot")}
            description={t("only_show_first_available_slot_description")}
            checked={!!value}
            disabled={fieldPermissions.getFieldState("onlyShowFirstAvailableSlot").isDisabled}
            LockedIcon={
              <FieldPermissionIndicator
                fieldName="onlyShowFirstAvailableSlot"
                fieldPermissions={fieldPermissions}
                t={t}
              />
            }
            onCheckedChange={(active) => handleOnlyFirstSlotToggle(active, onChange)}
          />
        )}
      />

      <Controller
        name="durationLimits"
        render={({ field: { onChange, value } }) => {
          const isChecked = Object.keys(value ?? {}).length > 0;
          return (
            <SettingsToggle
              title={t("limit_total_booking_duration")}
              description={t("limit_total_booking_duration_description")}
              checked={isChecked}
              disabled={fieldPermissions.getFieldState("durationLimits").isDisabled}
              LockedIcon={
                <FieldPermissionIndicator
                  fieldName="durationLimits"
                  fieldPermissions={fieldPermissions}
                  t={t}
                />
              }
              onCheckedChange={(active) => handleDurationLimitsToggle(active, onChange)}>
              <IntervalLimitsManager
                propertyName="durationLimits"
                defaultLimit={60}
                step={15}
                textFieldSuffix={t("minutes")}
                fieldPermissions={fieldPermissions}
              />
            </SettingsToggle>
          );
        }}
      />

      <MaxActiveBookingsPerBookerController fieldPermissions={fieldPermissions} />

      <Controller
        name="periodType"
        render={({ field: { onChange, value } }) => {
          const isChecked = value && value !== "UNLIMITED";

          return (
            <SettingsToggle
              title={t("limit_future_bookings")}
              description={t("limit_future_bookings_description")}
              checked={!!isChecked}
              disabled={fieldPermissions.getFieldState("periodType").isDisabled}
              LockedIcon={
                <FieldPermissionIndicator fieldName="periodType" fieldPermissions={fieldPermissions} t={t} />
              }
              onCheckedChange={(isEnabled) => handleFutureBookingsToggle(isEnabled, onChange)}>
              <RadioGroup value={watchPeriodTypeUiValue} onValueChange={handlePeriodTypeChange}>
                {/* Rolling Limit Option */}
                <RollingLimitRadioItem
                  rollingExcludeUnavailableDays={!!rollingExcludeUnavailableDays}
                  radioValue={PeriodType.ROLLING}
                  isDisabled={false}
                  onChange={handleRollingDayTypeChange}
                />

                {/* Range Limit Option */}
                <RangeLimitRadioItem
                  radioValue={PeriodType.RANGE}
                  isDisabled={false}
                  watchPeriodTypeUiValue={watchPeriodTypeUiValue}
                />
              </RadioGroup>
            </SettingsToggle>
          );
        }}
      />

      <OffsetStartSection
        offsetToggle={offsetToggle}
        setOffsetToggle={setOffsetToggle}
        fieldPermissions={fieldPermissions}
      />
    </div>
  );
};
