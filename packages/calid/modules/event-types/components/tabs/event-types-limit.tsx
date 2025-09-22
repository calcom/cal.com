import { Button } from "@calid/features/ui/components/button";
import { Calendar } from "@calid/features/ui/components/calendar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@calid/features/ui/components/card";
import { CustomSelect } from "@calid/features/ui/components/custom-select";
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

import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
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

// ============================================================================
// TYPES
// ============================================================================

type IPeriodType = (typeof PeriodType)[keyof typeof PeriodType];
type IntervalLimitsKey = keyof IntervalLimit;

interface DateRange {
  from?: Date;
  to?: Date;
  startDate?: Date;
  endDate?: Date;
}

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
}

// ============================================================================
// CONSTANTS & UTILITY FUNCTIONS
// ============================================================================

/**
 * Available interval limit options for booking and duration restrictions
 */
const INTERVAL_LIMIT_OPTIONS = ascendingLimitKeys.map((key) => ({
  value: key as keyof IntervalLimit,
  label: `Per ${intervalLimitKeyToUnit(key)}`,
}));

/**
 * Converts internal PeriodType to UI-friendly representation
 */
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

/**
 * Converts UI value back to internal PeriodType representation
 */
const getPeriodTypeFromUiValue = (uiValue: {
  value: PeriodType;
  rollingExcludeUnavailableDays: boolean;
}): PeriodType => {
  if (uiValue.value === PeriodType.ROLLING && uiValue.rollingExcludeUnavailableDays === true) {
    return PeriodType.ROLLING_WINDOW;
  }
  return uiValue.value;
};

/**
 * Creates buffer time options with proper labels
 */
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

/**
 * Creates slot interval options with default and custom intervals
 */
const createSlotIntervalOptions = (t: TFunction) => [
  { value: "-1", label: t("slot_interval_default") },
  ...[5, 10, 15, 20, 30, 45, 60, 75, 90, 105, 120].map((minutes) => ({
    value: minutes.toString(),
    label: `${minutes} ${t("minutes")}`,
  })),
];

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

/**
 * Manages minimum booking notice display state and duration conversion
 */
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

  // Sync hidden field with display values
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

/**
 * Manages offset start time preview calculations
 */
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
  ({ title, description, checked, onCheckedChange, disabled, children, tooltip }: SettingsToggleProps) => (
    <Card title={tooltip}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 p-6">
        <div className="flex-1 pr-8">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
      </CardHeader>
      {checked && children && <CardContent className="border-t border-gray-100 p-6">{children}</CardContent>}
    </Card>
  )
);

SettingsToggle.displayName = "SettingsToggle";

/**
 * Minimum booking notice input with duration type selector
 */
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
      <CustomSelect
        value={displayValues.type}
        onValueChange={(value) =>
          setDisplayValues({
            ...displayValues,
            type: value as DurationType,
          })
        }
        options={durationTypeOptions}
        disabled={disabled}
        className="w-full"
      />
      <input type="hidden" {...register(name as keyof FormValues)} />
    </div>
  );
});

MinimumBookingNoticeInput.displayName = "MinimumBookingNoticeInput";

/**
 * Rolling limit radio button with business/calendar days selector
 */
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
            <CustomSelect
              value={getSelectedOption()?.value.toString() || "0"}
              onValueChange={(value) => onChange({ value: parseInt(value) })}
              options={dayTypeOptions.map((opt) => ({ value: opt.value.toString(), label: opt.label }))}
              disabled={isDisabled}
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

/**
 * Date range selector for period limits
 */
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
    const [dateRange, setDateRange] = useState<{ from: Date; to?: Date } | undefined>();

    const formatDateRange = useCallback(() => {
      if (!dateRange?.from) return "Pick a date range";
      if (dateRange.to) {
        return `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`;
      }
      return dateRange.from.toLocaleDateString();
    }, [dateRange]);

    const handleDateSelect = useCallback((range: any, onChange: (value: any) => void) => {
      if (range && range.from) {
        setDateRange(range as { from: Date; to?: Date });
        onChange({
          startDate: range.from,
          endDate: range.to,
        });
      } else {
        setDateRange(undefined);
        onChange({
          startDate: undefined,
          endDate: undefined,
        });
      }
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
                <Popover>
                  <PopoverTrigger asChild>
                    <Button color="secondary" size="sm" disabled={isDisabled}>
                      <Icon name="calendar" className="mr-2 h-4 w-4" />
                      {formatDateRange()}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="bg-primary w-auto p-0" align="end">
                    <Calendar
                      mode="range"
                      selected={dateRange && dateRange.from ? dateRange : undefined}
                      onSelect={(range) => handleDateSelect(range, onChange)}
                      className="pointer-events-auto mb-2 rounded-md border border-gray-300"
                    />
                  </PopoverContent>
                </Popover>
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

        <CustomSelect
          value={limitKey}
          onValueChange={handleIntervalChange}
          options={selectOptions.map((opt) => ({ value: opt.value, label: opt.label }))}
          disabled={disabled}
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

/**
 * Manager component for interval limits (booking/duration limits)
 */
export const IntervalLimitsManager = memo(
  ({
    propertyName,
    defaultLimit,
    step,
    textFieldSuffix,
    disabled,
  }: {
    propertyName: "durationLimits" | "bookingLimits";
    defaultLimit: number;
    step: number;
    textFieldSuffix?: string;
    disabled?: boolean;
  }) => {
    const { watch, setValue, control } = useFormContext<FormValues>();
    const { t } = useLocale();
    const [animateRef] = useAutoAnimate<HTMLUListElement>();
    const watchIntervalLimits = watch(propertyName);

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
                      disabled={disabled}
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

            {/* Add Limit Button */}
            {currentIntervalLimits && Object.keys(currentIntervalLimits).length <= 3 && !disabled && (
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

/**
 * Maximum active bookings per booker control section
 */
const MaxActiveBookingsPerBookerController = memo(
  ({
    maxActiveBookingsPerBookerLocked,
  }: {
    maxActiveBookingsPerBookerLocked: {
      disabled: boolean;
      LockedIcon: false | JSX.Element;
      isLocked: boolean;
    };
  }) => {
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
            disabled={isRecurringEvent || maxActiveBookingsPerBookerLocked.disabled}
            tooltip={isRecurringEvent ? t("recurring_event_doesnt_support_booker_booking_limit") : ""}
            onCheckedChange={(active) => handleToggleChange(active, onChange)}>
            <div className="space-y-4">
              <div>
                <Label>Maximum bookings</Label>
                <div className="flex items-center space-x-2">
                  <NumberInput
                    value={value ?? ""}
                    disabled={maxActiveBookingsPerBookerLocked.disabled}
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
                    disabled={maxActiveBookingsPerBookerLocked.disabled}
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

/**
 * Before/After event configuration section
 */
const BeforeAfterEventSection = memo(() => {
  const { t } = useLocale();
  const formMethods = useFormContext<FormValues>();
  const { shouldLockIndicator, shouldLockDisableProps } = useLockedFieldsManager({
    eventType: {} as EventTypeSetup, // This should be passed from parent
    translate: t,
    formMethods,
  });

  const beforeBufferOptions = useMemo(() => createBufferTimeOptions(t, true), [t]);
  const afterBufferOptions = useMemo(() => createBufferTimeOptions(t), [t]);
  const slotIntervalOptions = useMemo(() => createSlotIntervalOptions(t), [t]);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {/* Before Event Section */}
      <Card>
        <CardContent>
          <div className="space-y-6">
            {/* Buffer Time Selector */}
            <div>
              <Label>
                {t("before_event")}
                {shouldLockIndicator("beforeBufferTime")}
              </Label>
              <Controller
                name="beforeEventBuffer"
                render={({ field: { onChange, value } }) => (
                  <CustomSelect
                    value={value?.toString() || "0"}
                    onValueChange={(val) => onChange(parseInt(val))}
                    options={beforeBufferOptions}
                    disabled={shouldLockDisableProps("beforeBufferTime").disabled}
                    className="w-full"
                  />
                )}
              />
            </div>

            {/* Minimum Booking Notice */}
            <div>
              <Label>
                {t("minimum_booking_notice")}
                {shouldLockIndicator("minimumBookingNotice")}
              </Label>
              <MinimumBookingNoticeInput
                disabled={shouldLockDisableProps("minimumBookingNotice").disabled}
                name="minimumBookingNotice"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* After Event Section */}
      <Card>
        <CardContent>
          <div className="space-y-6">
            {/* After Event Buffer */}
            <div>
              <Label>
                {t("after_event")}
                {shouldLockIndicator("afterBufferTime")}
              </Label>
              <Controller
                name="afterEventBuffer"
                render={({ field: { onChange, value } }) => (
                  <CustomSelect
                    value={value?.toString() || "0"}
                    onValueChange={(val) => onChange(parseInt(val))}
                    options={afterBufferOptions}
                    disabled={shouldLockDisableProps("afterBufferTime").disabled}
                    className="w-full"
                  />
                )}
              />
            </div>

            {/* Slot Interval */}
            <div>
              <Label>
                {t("slot_interval")}
                {shouldLockIndicator("slotInterval")}
              </Label>
              <Controller
                name="slotInterval"
                render={({ field: { value } }) => (
                  <CustomSelect
                    value={value?.toString() || "-1"}
                    onValueChange={(val) => {
                      const numVal = parseInt(val);
                      formMethods.setValue("slotInterval", numVal > 0 ? numVal : null, {
                        shouldDirty: true,
                      });
                    }}
                    options={slotIntervalOptions}
                    disabled={shouldLockDisableProps("slotInterval").disabled}
                    className="w-full"
                  />
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

BeforeAfterEventSection.displayName = "BeforeAfterEventSection";

/**
 * Offset start times configuration section
 */
const OffsetStartSection = memo(
  ({
    offsetToggle,
    setOffsetToggle,
    offsetStartLockedProps,
  }: {
    offsetToggle: boolean;
    setOffsetToggle: (value: boolean) => void;
    offsetStartLockedProps: { disabled: boolean };
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

    // Only show if there's already an offset value
    if (formMethods.getValues("offsetStart") <= 0) return null;

    return (
      <SettingsToggle
        title={t("offset_toggle")}
        description={t("offset_toggle_description")}
        checked={offsetToggle}
        disabled={offsetStartLockedProps.disabled}
        onCheckedChange={handleToggleChange}>
        <div className="space-y-3">
          <div>
            <Label>{t("offset_start")}</Label>
            <div className="flex items-center space-x-2">
              <NumberInput
                className="w-20"
                {...formMethods.register("offsetStart", { setValueAs: (value) => Number(value) })}
                disabled={offsetStartLockedProps.disabled}
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Main EventLimits component that manages all booking and event limitations
 * Handles buffer times, booking limits, duration limits, future booking restrictions, etc.
 */
export const EventLimits = ({ eventType }: EventLimitsProps) => {
  const { t } = useLocale();
  const formMethods = useFormContext<FormValues>();

  // ============================================================================
  // LOCKED FIELDS MANAGEMENT
  // ============================================================================
  const { shouldLockIndicator, shouldLockDisableProps } = useLockedFieldsManager({
    eventType,
    translate: t,
    formMethods,
  });

  const lockStates = useMemo(
    () => ({
      bookingLimits: shouldLockDisableProps("bookingLimits"),
      durationLimits: shouldLockDisableProps("durationLimits"),
      onlyFirstAvailableSlot: shouldLockDisableProps("onlyShowFirstAvailableSlot"),
      periodType: shouldLockDisableProps("periodType"),
      offsetStart: shouldLockDisableProps("offsetStart"),
      maxActiveBookingsPerBooker: shouldLockDisableProps("maxActiveBookingsPerBooker"),
    }),
    [shouldLockDisableProps]
  );

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  const [offsetToggle, setOffsetToggle] = useState(formMethods.getValues("offsetStart") > 0);

  // ============================================================================
  // WATCHED VALUES
  // ============================================================================
  const watchPeriodType = formMethods.watch("periodType");

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  const { value: watchPeriodTypeUiValue, rollingExcludeUnavailableDays } =
    getUiValueFromPeriodType(watchPeriodType);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
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

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className="mx-auto max-w-none space-y-6 p-0">
      {/* Before/After Event Sections */}
      <BeforeAfterEventSection />

      {/* Booking Frequency Limits */}
      <Controller
        name="bookingLimits"
        render={({ field: { value } }) => {
          const isChecked = Object.keys(value ?? {}).length > 0;
          return (
            <SettingsToggle
              title={t("limit_booking_frequency")}
              description={t("limit_booking_frequency_description")}
              checked={isChecked}
              disabled={lockStates.bookingLimits.disabled}
              onCheckedChange={handleBookingLimitsToggle}>
              <IntervalLimitsManager
                disabled={lockStates.bookingLimits.disabled}
                propertyName="bookingLimits"
                defaultLimit={1}
                step={1}
              />
            </SettingsToggle>
          );
        }}
      />

      {/* Only Show First Available Slot */}
      <Controller
        name="onlyShowFirstAvailableSlot"
        render={({ field: { onChange, value } }) => (
          <SettingsToggle
            title={t("only_show_first_available_slot")}
            description={t("only_show_first_available_slot_description")}
            checked={!!value}
            disabled={lockStates.onlyFirstAvailableSlot.disabled}
            onCheckedChange={(active) => handleOnlyFirstSlotToggle(active, onChange)}
          />
        )}
      />

      {/* Duration Limits */}
      <Controller
        name="durationLimits"
        render={({ field: { onChange, value } }) => {
          const isChecked = Object.keys(value ?? {}).length > 0;
          return (
            <SettingsToggle
              title={t("limit_total_booking_duration")}
              description={t("limit_total_booking_duration_description")}
              checked={isChecked}
              disabled={lockStates.durationLimits.disabled}
              onCheckedChange={(active) => handleDurationLimitsToggle(active, onChange)}>
              <IntervalLimitsManager
                propertyName="durationLimits"
                defaultLimit={60}
                disabled={lockStates.durationLimits.disabled}
                step={15}
                textFieldSuffix={t("minutes")}
              />
            </SettingsToggle>
          );
        }}
      />

      {/* Max Active Bookings Per Booker */}
      <MaxActiveBookingsPerBookerController
        maxActiveBookingsPerBookerLocked={lockStates.maxActiveBookingsPerBooker}
      />

      {/* Future Booking Limits */}
      <Controller
        name="periodType"
        render={({ field: { onChange, value } }) => {
          const isChecked = value && value !== "UNLIMITED";

          return (
            <SettingsToggle
              title={t("limit_future_bookings")}
              description={t("limit_future_bookings_description")}
              checked={!!isChecked}
              disabled={lockStates.periodType.disabled}
              onCheckedChange={(isEnabled) => handleFutureBookingsToggle(isEnabled, onChange)}>
              <RadioGroup value={watchPeriodTypeUiValue} onValueChange={handlePeriodTypeChange}>
                {/* Rolling Limit Option */}
                {(lockStates.periodType.disabled ? watchPeriodTypeUiValue === PeriodType.ROLLING : true) && (
                  <RollingLimitRadioItem
                    rollingExcludeUnavailableDays={!!rollingExcludeUnavailableDays}
                    radioValue={PeriodType.ROLLING}
                    isDisabled={lockStates.periodType.disabled}
                    onChange={handleRollingDayTypeChange}
                  />
                )}

                {/* Range Limit Option */}
                {(lockStates.periodType.disabled ? watchPeriodTypeUiValue === PeriodType.RANGE : true) && (
                  <RangeLimitRadioItem
                    radioValue={PeriodType.RANGE}
                    isDisabled={lockStates.periodType.disabled}
                    watchPeriodTypeUiValue={watchPeriodTypeUiValue}
                  />
                )}
              </RadioGroup>
            </SettingsToggle>
          );
        }}
      />

      {/* Offset Start Times */}
      <OffsetStartSection
        offsetToggle={offsetToggle}
        setOffsetToggle={setOffsetToggle}
        offsetStartLockedProps={lockStates.offsetStart}
      />
    </div>
  );
};
