import { Icon } from "@calid/features/ui/components/icon";
import { TextField } from "@calid/features/ui/components/input/input";
import { Switch } from "@calid/features/ui/components/switch/switch";
import React, { useCallback, useMemo } from "react";
import { useFormContext } from "react-hook-form";

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
import { Select } from "@calcom/ui/components/form";

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

// Simplified Preview Component
const RecurringEventPreview: React.FC<{
  recurringEvent: RecurringEventType;
  customClassName?: string;
}> = ({ recurringEvent, customClassName }) => {
  const { t } = useLocale();

  // Generate human-readable description
  const getHumanReadableDescription = () => {
    const { freq, interval, count } = recurringEvent;

    // Helper to get ordinal suffix
    const getOrdinal = (n: number) => {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    // Frequency mapping
    let frequencyText = "";
    const intervalText = "";

    if (interval === 1) {
      // Simple cases: every day, every week, every month, every year
      switch (freq) {
        case Frequency.DAILY:
          frequencyText = "every day";
          break;
        case Frequency.WEEKLY:
          frequencyText = "every week";
          break;
        case Frequency.MONTHLY:
          frequencyText = "every month";
          break;
        case Frequency.YEARLY:
          frequencyText = "every year";
          break;
      }
    } else {
      // Complex cases with intervals
      switch (freq) {
        case Frequency.DAILY:
          if (interval === 2) {
            frequencyText = "every other day";
          } else {
            frequencyText = `every ${getOrdinal(interval)} day`;
          }
          break;
        case Frequency.WEEKLY:
          if (interval === 2) {
            frequencyText = "every other week";
          } else {
            frequencyText = `every ${interval} weeks`;
          }
          break;
        case Frequency.MONTHLY:
          if (interval === 2) {
            frequencyText = "every other month";
          } else {
            frequencyText = `every ${interval} months`;
          }
          break;
        case Frequency.YEARLY:
          if (interval === 2) {
            frequencyText = "every other year";
          } else {
            frequencyText = `every ${interval} years`;
          }
          break;
      }
    }

    // Count text
    const countText = count ? `for ${count} ${count === 1 ? "event" : "events"}` : "";

    // Combine the parts
    return `Repeats ${frequencyText} ${countText}`.trim();
  };

  return (
    <div className={classNames("border-border bg-default rounded-lg border p-4", customClassName)}>
      <div className="flex items-center space-x-2">
        <Icon name="repeat" className="text-default h-4 w-4" />
        <p className="text-default text-sm font-medium">{getHumanReadableDescription()}</p>
      </div>
    </div>
  );
};

// Enhanced Props interface
export interface RecurringEventProps {
  eventType: EventTypeSetup;
  customClassNames?: EventRecurringTabCustomClassNames;
  showPreview?: boolean;
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
  preview?: string;
};

export const EventRecurring: React.FC<RecurringEventProps> = ({
  eventType,
  customClassNames = {},
  showPreview = true,
}) => {
  const { t } = useLocale();
  const formMethods = useFormContext<FormValues>();

  // Watch the form state directly
  const recurringEventState = formMethods.watch("recurringEvent");

  // Payment logic
  const paymentAppData = useMemo(() => {
    return getPaymentAppData({
      ...eventType,
      metadata: eventTypeMetaDataSchemaWithTypedApps.parse(eventType.metadata),
    });
  }, [eventType]);

  const paymentEnabled = paymentAppData.price > 0;

  // Form validation checks
  const isSeatsOffered = !!formMethods.watch("seatsPerTimeSlot");
  const hasBookingLimitPerBooker = !!formMethods.watch("maxActiveBookingsPerBooker");

  // Frequency options
  const recurringEventFreqOptions = useMemo(() => {
    return Object.entries(Frequency)
      .filter(([key, value]) => isNaN(Number(key)) && Number(value) < 4)
      .map(([key, value]) => {
        return {
          label: t(`${key.toString().toLowerCase()}`, { count: recurringEventState?.interval }).toLowerCase(),
          value: value.toString(),
        };
      });
  }, [recurringEventState?.interval, t]);

  // Helper function to update recurring event in form
  const updateRecurringEvent = useCallback(
    (updates: Partial<RecurringEventType>) => {
      const current = formMethods.getValues("recurringEvent");
      if (!current) return;

      const newVal = {
        ...current,
        ...updates,
      };
      formMethods.setValue("recurringEvent", newVal, { shouldDirty: true });
    },
    [formMethods]
  );

  // Event handlers
  const handleRecurringToggle = useCallback(
    (enabled: boolean) => {
      if (!enabled) {
        formMethods.setValue("recurringEvent", null, { shouldDirty: true });
      } else {
        const newVal: RecurringEventType = {
          interval: eventType.recurringEvent?.interval || 1,
          count: eventType.recurringEvent?.count || 10,
          freq: eventType.recurringEvent?.freq || Frequency.DAILY,
        };
        formMethods.setValue("recurringEvent", newVal, { shouldDirty: true });
      }
    },
    [formMethods, eventType.recurringEvent]
  );

  const handleIntervalChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      updateRecurringEvent({ interval: parseInt(event.target.value) || 1 });
    },
    [updateRecurringEvent]
  );

  const handleFrequencyChange = useCallback(
    (option: { label: string; value: string }) => {
      updateRecurringEvent({ freq: parseInt(option.value || `${Frequency.WEEKLY}`) });
    },
    [updateRecurringEvent]
  );

  const handleCountChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      updateRecurringEvent({ count: parseInt(event.target.value) || 1 });
    },
    [updateRecurringEvent]
  );

  // Tooltip logic for disabled states
  const getDisabledTooltip = useMemo(() => {
    if (isSeatsOffered) return t("seats_doesnt_support_recurring");
    if (hasBookingLimitPerBooker) return t("booking_limit_per_booker_doesnt_support_recurring");
    return undefined;
  }, [isSeatsOffered, hasBookingLimitPerBooker, t]);

  // Main render
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
              title="Experimental Feature: Recurring Events are currently in beta. Please contact support if you encounter any issues."
            />

            <div className={recurringEventState && showPreview ? "space-y-4" : ""}>
              {/* Main Configuration Section */}
              <div className="space-y-0">
                {/* Settings Toggle Container */}
                <div
                  className={classNames(
                    "border-border rounded-lg border px-4 py-6 sm:px-6",
                    recurringEventState !== null && "rounded-b-none",
                    customClassNames?.recurringToggle?.container
                  )}>
                  {/* Toggle Header */}
                  <div className="flex items-center justify-between">
                    <div className={classNames("lg:ml-0", customClassNames?.recurringToggle?.children)}>
                      <label
                        htmlFor="enable-recurring"
                        className={classNames(
                          "text-emphasis text-sm font-medium",
                          customClassNames?.recurringToggle?.label
                        )}>
                        {t("recurring_event")}
                      </label>
                      <p
                        className={classNames(
                          "text-default mt-1 text-sm",
                          customClassNames?.recurringToggle?.description
                        )}>
                        {t("recurring_event_description")}
                      </p>
                    </div>
                    <Switch
                      id="enable-recurring"
                      checked={!!recurringEventState}
                      onCheckedChange={handleRecurringToggle}
                      disabled={(!recurringEventState && isSeatsOffered) || hasBookingLimitPerBooker}
                    />
                  </div>

                  {/* Show tooltip/warning for disabled state */}
                  {((!recurringEventState && isSeatsOffered) || hasBookingLimitPerBooker) &&
                    getDisabledTooltip && <p className="mt-2 text-sm text-amber-600">{getDisabledTooltip}</p>}
                </div>

                {/* Expanded Options */}
                {recurringEventState && (
                  <div className="border-border rounded-b-lg border border-t-0 p-6">
                    <div data-testid="recurring-event-collapsible" className="space-y-4 text-sm">
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
                          type="number"
                          min="1"
                          max="10"
                          className={classNames("mb-0", customClassNames?.frequencyInput?.input)}
                          value={recurringEventState.interval}
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
                          onChange={handleFrequencyChange}
                        />
                      </div>

                      {/* Number of occurrences */}
                      <div
                        className={classNames(
                          "flex items-center",
                          customClassNames?.maxEventsInput?.container
                        )}>
                        <p
                          className={classNames(
                            "text-emphasis ltr:mr-2 rtl:ml-2",
                            customClassNames?.maxEventsInput?.labelText
                          )}>
                          {t("number_of_occurrences") || "Number of occurrences"}
                        </p>
                        <TextField
                          type="number"
                          min={1}
                          max={730}
                          value={recurringEventState.count || 12}
                          className={classNames("mb-0 w-24", customClassNames?.maxEventsInput?.countInput)}
                          onChange={handleCountChange}
                        />
                        <span
                          className={classNames(
                            "text-emphasis ml-2 text-sm",
                            customClassNames?.maxEventsInput?.suffixText
                          )}>
                          {t("events", { count: recurringEventState.count || 12 })}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Simplified Preview Section */}
              {recurringEventState && showPreview && (
                <RecurringEventPreview
                  recurringEvent={recurringEventState}
                  customClassName={customClassNames?.preview}
                />
              )}
            </div>
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
  showPreview?: boolean;
};

// Export default for backward compatibility
export default EventRecurring;
