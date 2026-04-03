import { useState } from "react";
import { useFormContext } from "react-hook-form";

import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import { LearnMoreLink } from "@calcom/features/eventtypes/components/LearnMoreLink";
import type {
  EventTypeSetup,
  InputClassNames,
  SelectClassNames,
  SettingsToggleClassNames,
} from "@calcom/features/eventtypes/lib/types";
import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Frequency } from "@calcom/prisma/zod-utils";
import type { RecurringEvent } from "@calcom/types/Calendar";
import classNames from "@calcom/ui/classNames";
import { Alert } from "@calcom/ui/components/alert";
import { Select } from "@calcom/ui/components/form";
import { SettingsToggle } from "@calcom/ui/components/form";
import { TextField } from "@calcom/ui/components/form";

export type RecurringEventControllerProps = {
  eventType: EventTypeSetup;
  paymentEnabled: boolean;
  customClassNames?: EventRecurringTabCustomClassNames;
};

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

export default function RecurringEventController({
  eventType,
  paymentEnabled,
  customClassNames,
}: RecurringEventControllerProps) {
  const { t } = useLocale();
  const formMethods = useFormContext<FormValues>();
  const [recurringEventState, setRecurringEventState] = useState<RecurringEvent | null>(
    formMethods.getValues("recurringEvent")
  );
  const isSeatsOffered = !!formMethods.getValues("seatsPerTimeSlot");
  const hasBookingLimitPerBooker = !!formMethods.getValues("maxActiveBookingsPerBooker");
  /* Just yearly-0, monthly-1 and weekly-2 */
  const recurringEventFreqOptions = Object.entries(Frequency)
    .filter(([key, value]) => isNaN(Number(key)) && Number(value) < 3)
    .map(([key, value]) => ({
      label: t(`${key.toString().toLowerCase()}`, { count: recurringEventState?.interval }),
      value: value.toString(),
    }));

  const { shouldLockDisableProps } = useLockedFieldsManager({ eventType, translate: t, formMethods });

  const recurringLocked = shouldLockDisableProps("recurringEvent");

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
            <SettingsToggle
              labelClassName={classNames("text-sm", customClassNames?.recurringToggle?.label)}
              toggleSwitchAtTheEnd={true}
              switchContainerClassName={classNames(
                "border-subtle rounded-lg border py-6 px-4 sm:px-6",
                recurringEventState !== null && "rounded-b-none",
                customClassNames?.recurringToggle?.container
              )}
              childrenClassName={classNames("lg:ml-0", customClassNames?.recurringToggle?.children)}
              descriptionClassName={customClassNames?.recurringToggle?.description}
              title={t("recurring_event")}
              {...recurringLocked}
              description={
                <LearnMoreLink
                  t={t}
                  i18nKey="recurring_event_description"
                  href="https://cal.com/help/event-types/recurring-events"
                />
              }
              checked={!!recurringEventState}
              data-testid="recurring-event-check"
              disabled={(!recurringEventState && isSeatsOffered) || hasBookingLimitPerBooker}
              tooltip={
                isSeatsOffered
                  ? t("seats_doesnt_support_recurring")
                  : hasBookingLimitPerBooker
                    ? t("booking_limit_per_booker_doesnt_support_recurring")
                    : undefined
              }
              onCheckedChange={(e) => {
                if (!e) {
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
              }}>
              <div className="border-subtle rounded-b-lg border border-t-0 p-6">
                {recurringEventState && (
                  <div data-testid="recurring-event-collapsible" className="text-sm">
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
                        onChange={(event) => {
                          const newVal = {
                            ...recurringEventState,
                            interval: parseInt(event?.target.value),
                          };
                          formMethods.setValue("recurringEvent", newVal, { shouldDirty: true });
                          setRecurringEventState(newVal);
                        }}
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
                        isDisabled={recurringLocked.disabled}
                        onChange={(event) => {
                          const newVal = {
                            ...recurringEventState,
                            freq: parseInt(event?.value || `${Frequency.WEEKLY}`),
                          };
                          formMethods.setValue("recurringEvent", newVal, { shouldDirty: true });
                          setRecurringEventState(newVal);
                        }}
                      />
                    </div>
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
                        onChange={(event) => {
                          const newVal = {
                            ...recurringEventState,
                            count: parseInt(event?.target.value),
                          };
                          formMethods.setValue("recurringEvent", newVal, { shouldDirty: true });
                          setRecurringEventState(newVal);
                        }}
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
                )}
              </div>
            </SettingsToggle>
          </>
        )}
      </div>
    </div>
  );
}
