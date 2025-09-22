import { Icon } from "@calid/features/ui/components/icon";
import React, { useState, useCallback, useMemo } from "react";
import { useFormContext } from "react-hook-form";

import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import type {
  EventTypeSetup,
  FormValues,
  InputClassNames,
  SelectClassNames,
  SettingsToggleClassNames,
} from "@calcom/features/eventtypes/lib/types";
import { getPaymentAppData } from "@calcom/lib/getPaymentAppData";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Frequency } from "@calcom/prisma/zod-utils";
import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/prisma/zod-utils";
import type { RecurringEvent as RecurringEventType } from "@calcom/types/Calendar";
import classNames from "@calcom/ui/classNames";

// Enhanced component interfaces to match the old UI exactly
interface SwitchProps {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

interface SelectProps {
  options: Array<{ label: string; value: string }>;
  value: { label: string; value: string } | undefined;
  onChange: (option: { label: string; value: string }) => void;
  disabled?: boolean;
  className?: string;
  innerClassNames?: {
    control?: string;
    menu?: string;
    option?: string;
  };
  isSearchable?: boolean;
}

interface TextFieldProps {
  type: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  className?: string;
  defaultValue?: number;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

// UI Components that match the old component's behavior
const Switch: React.FC<SwitchProps> = ({ id, checked, onCheckedChange, disabled, className }) => {
  return (
    <label className="flex cursor-pointer items-center">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        disabled={disabled}
        className="sr-only"
      />
      <div
        className={classNames(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
          checked ? "bg-blue-600" : "bg-gray-200",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}>
        <span
          className={classNames(
            "bg-primary inline-block h-4 w-4 transform rounded-full transition-transform",
            checked ? "translate-x-6" : "translate-x-1"
          )}
        />
      </div>
    </label>
  );
};

const Select: React.FC<SelectProps> = ({
  options,
  value,
  onChange,
  disabled,
  className,
  innerClassNames,
  isSearchable = true,
}) => {
  return (
    <select
      value={value?.value || ""}
      onChange={(e) => {
        const option = options.find((opt) => opt.value === e.target.value);
        if (option) onChange(option);
      }}
      disabled={disabled}
      className={classNames(
        "w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500",
        disabled && "cursor-not-allowed bg-gray-50 opacity-50",
        className
      )}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

const TextField: React.FC<TextFieldProps> = ({
  type,
  min,
  max,
  disabled,
  className,
  defaultValue,
  onChange,
}) => {
  return (
    <input
      type={type}
      min={min}
      max={max}
      disabled={disabled}
      className={classNames(
        "rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500",
        disabled && "cursor-not-allowed bg-gray-50 opacity-50",
        className
      )}
      defaultValue={defaultValue}
      onChange={onChange}
    />
  );
};

const Alert: React.FC<{
  severity: "warning" | "error" | "info" | "success";
  title: string;
  className?: string;
  children?: React.ReactNode;
}> = ({ severity, title, className, children }) => {
  const severityStyles = {
    warning: "border-yellow-200 bg-yellow-50 text-yellow-800",
    error: "border-red-200 bg-red-50 text-red-800",
    info: "border-blue-200 bg-blue-50 text-blue-800",
    success: "border-green-200 bg-green-50 text-green-800",
  };

  const iconColor = {
    warning: "text-yellow-600",
    error: "text-red-600",
    info: "text-blue-600",
    success: "text-green-600",
  };

  return (
    <div
      className={classNames(
        "flex items-start space-x-3 rounded-lg border p-3",
        severityStyles[severity],
        className
      )}>
      <Icon
        name="triangle-alert"
        className={classNames("mt-0.5 h-5 w-5 flex-shrink-0", iconColor[severity])}
      />
      <div className="flex-1">
        <p className="font-medium">{title}</p>
        {children}
      </div>
    </div>
  );
};

// Enhanced Props interface that matches both old and new patterns
export interface RecurringEventProps {
  eventType: EventTypeSetup;
  customClassNames?: EventRecurringTabCustomClassNames;
}

export type EventRecurringTabCustomClassNames = {
  container?: string;
  recurringToggle?: SettingsToggleClassNames;
  frequencyInput?: InputClassNames;
  frequencyUnitSelect?: SelectClassNames;
  maxEventsInput?: {
    countInput?: string;
    labelText?: string;
    suffixText?: string;
    container?: string;
  };
  experimentalAlert?: string;
  paymentAlert?: string;
};

export const EventRecurring: React.FC<RecurringEventProps> = ({ eventType, customClassNames = {} }) => {
  const { t } = useLocale();
  const formMethods = useFormContext<FormValues>();

  // State management matching the old component exactly
  const [recurringEventState, setRecurringEventState] = useState<RecurringEventType | null>(
    formMethods.getValues("recurringEvent")
  );

  // Payment logic - integrated from EventRecurringTab
  const paymentAppData = useMemo(() => {
    return getPaymentAppData({
      ...eventType,
      metadata: eventTypeMetaDataSchemaWithTypedApps.parse(eventType.metadata),
    });
  }, [eventType]);

  const paymentEnabled = paymentAppData.price > 0;

  // Form validation checks from old component
  const isSeatsOffered = !!formMethods.getValues("seatsPerTimeSlot");
  const hasBookingLimitPerBooker = !!formMethods.getValues("maxActiveBookingsPerBooker");

  // Frequency options - exactly as in old component
  const recurringEventFreqOptions = useMemo(() => {
    return Object.entries(Frequency)
      .filter(([key, value]) => isNaN(Number(key)) && Number(value) < 3)
      .map(([key, value]) => ({
        label: t(`${key.toString().toLowerCase()}`, { count: recurringEventState?.interval }),
        value: value.toString(),
      }));
  }, [recurringEventState?.interval, t]);

  // Locked fields management
  const { shouldLockDisableProps } = useLockedFieldsManager({
    eventType,
    translate: t,
    formMethods,
  });
  const recurringLocked = shouldLockDisableProps("recurringEvent");

  // Event handlers - matching old component exactly
  const handleRecurringToggle = useCallback(
    (enabled: boolean) => {
      if (!enabled) {
        formMethods.setValue("recurringEvent", null, { shouldDirty: true });
        setRecurringEventState(null);
      } else {
        const newVal = eventType.recurringEvent || {
          interval: 1,
          count: 12,
          freq: Frequency.WEEKLY,
        };
        formMethods.setValue("recurringEvent", newVal, { shouldDirty: true });
        setRecurringEventState(newVal);
      }
    },
    [formMethods, eventType.recurringEvent]
  );

  const handleIntervalChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!recurringEventState) return;

      const newVal = {
        ...recurringEventState,
        interval: parseInt(event.target.value),
      };
      formMethods.setValue("recurringEvent", newVal, { shouldDirty: true });
      setRecurringEventState(newVal);
    },
    [recurringEventState, formMethods]
  );

  const handleFrequencyChange = useCallback(
    (option: { label: string; value: string }) => {
      if (!recurringEventState) return;

      const newVal = {
        ...recurringEventState,
        freq: parseInt(option.value || `${Frequency.WEEKLY}`),
      };
      formMethods.setValue("recurringEvent", newVal, { shouldDirty: true });
      setRecurringEventState(newVal);
    },
    [recurringEventState, formMethods]
  );

  const handleCountChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!recurringEventState) return;

      const newVal = {
        ...recurringEventState,
        count: parseInt(event.target.value),
      };
      formMethods.setValue("recurringEvent", newVal, { shouldDirty: true });
      setRecurringEventState(newVal);
    },
    [recurringEventState, formMethods]
  );

  // Tooltip logic for disabled states - exactly as in old component
  const getDisabledTooltip = useMemo(() => {
    if (isSeatsOffered) return t("seats_doesnt_support_recurring");
    if (hasBookingLimitPerBooker) return t("booking_limit_per_booker_doesnt_support_recurring");
    return undefined;
  }, [isSeatsOffered, hasBookingLimitPerBooker, t]);

  // Main render - following the exact structure of the old component
  return (
    <div className={classNames("block items-start sm:flex", customClassNames?.container)}>
      <div className={!paymentEnabled ? "w-full" : ""}>
        {paymentEnabled ? (
          <Alert
            severity="warning"
            className={customClassNames?.paymentAlert}
            title={t("warning_payment_recurring_event")}
          />
        ) : (
          <>
            <Alert
              className={classNames("mb-4", customClassNames?.experimentalAlert)}
              severity="warning"
              title="Experimental: Recurring Events are currently experimental and causes some issues sometimes when checking for availability. We are working on fixing this."
            />

            {/* Settings Toggle Container - matching old component structure exactly */}
            <div
              className={classNames(
                "border-subtle rounded-lg border px-4 py-6 sm:px-6",
                recurringEventState !== null && "rounded-b-none",
                customClassNames?.recurringToggle?.container
              )}>
              {/* Toggle Header */}
              <div className="flex items-center justify-between">
                <div className={classNames("lg:ml-0", customClassNames?.recurringToggle?.children)}>
                  <label
                    htmlFor="enable-recurring"
                    className={classNames("text-sm font-medium", customClassNames?.recurringToggle?.label)}>
                    {t("recurring_event")}
                  </label>
                  <p
                    className={classNames(
                      "mt-1 text-sm text-gray-600",
                      customClassNames?.recurringToggle?.description
                    )}>
                    {t("recurring_event_description")}
                  </p>
                </div>
                <Switch
                  id="enable-recurring"
                  checked={!!recurringEventState}
                  onCheckedChange={handleRecurringToggle}
                  disabled={
                    recurringLocked.disabled ||
                    (!recurringEventState && isSeatsOffered) ||
                    hasBookingLimitPerBooker
                  }
                />
              </div>

              {/* Show tooltip/warning for disabled state */}
              {((!recurringEventState && isSeatsOffered) || hasBookingLimitPerBooker) &&
                getDisabledTooltip && <p className="mt-2 text-sm text-amber-600">{getDisabledTooltip}</p>}
            </div>

            {/* Expanded Options - exactly matching old component structure */}
            {recurringEventState && (
              <div className="border-subtle rounded-b-lg border border-t-0 p-6">
                <div data-testid="recurring-event-collapsible" className="text-sm">
                  {/* Frequency Control */}
                  <div className="flex items-center">
                    <p
                      className={classNames(
                        "text-emphasis ltr:mr-2 rtl:ml-2",
                        customClassNames?.frequencyInput?.label
                      )}>
                      {t("repeats_every")}
                    </p>
                    <TextField
                      disabled={recurringLocked.disabled}
                      type="number"
                      min="1"
                      max="20"
                      className={classNames("mb-0", customClassNames?.frequencyInput?.input)}
                      defaultValue={recurringEventState.interval}
                      onChange={handleIntervalChange}
                    />
                    <Select
                      options={recurringEventFreqOptions}
                      value={recurringEventFreqOptions[recurringEventState.freq]}
                      isSearchable={false}
                      className={classNames(
                        "w-18 ml-2 block min-w-0 rounded-md text-sm",
                        customClassNames?.frequencyUnitSelect?.select
                      )}
                      innerClassNames={customClassNames?.frequencyUnitSelect?.innerClassNames}
                      disabled={recurringLocked.disabled}
                      onChange={handleFrequencyChange}
                    />
                  </div>

                  {/* Max Events Control */}
                  <div
                    className={classNames(
                      "mt-4 flex items-center",
                      customClassNames?.maxEventsInput?.container
                    )}>
                    <p
                      className={classNames(
                        "text-emphasis ltr:mr-2 rtl:ml-2",
                        customClassNames?.maxEventsInput?.labelText
                      )}>
                      {t("for_a_maximum_of")}
                    </p>
                    <TextField
                      disabled={recurringLocked.disabled}
                      type="number"
                      min="1"
                      max="24"
                      defaultValue={recurringEventState.count}
                      className={classNames("mb-0", customClassNames?.maxEventsInput?.countInput)}
                      onChange={handleCountChange}
                    />
                    <p
                      className={classNames(
                        "text-emphasis ltr:ml-2 rtl:mr-2",
                        customClassNames?.maxEventsInput?.suffixText
                      )}>
                      {t("events", {
                        count: recurringEventState.count,
                      })}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Export type for compatibility
export type RecurringEventControllerProps = {
  eventType: EventTypeSetup;
  paymentEnabled: boolean;
  customClassNames?: EventRecurringTabCustomClassNames;
};

// Export default for backward compatibility
export default EventRecurring;
