import type { EventTypeSetup } from "pages/event-types/[type]";
import { useState } from "react";
import { useFormContext } from "react-hook-form";

import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Frequency } from "@calcom/prisma/zod-utils";
import type { RecurringEvent } from "@calcom/types/Calendar";
import { Alert, Select, SettingsToggle, TextField } from "@calcom/ui";

type RecurringEventControllerProps = {
  eventType: EventTypeSetup;
  paymentEnabled: boolean;
};

export default function RecurringEventController({
  eventType,
  paymentEnabled,
}: RecurringEventControllerProps) {
  const { t } = useLocale();
  const formMethods = useFormContext<FormValues>();
  const [recurringEventState, setRecurringEventState] = useState<RecurringEvent | null>(
    formMethods.getValues("recurringEvent")
  );
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
    <div className="block items-start sm:flex">
      <div className={!paymentEnabled ? "w-full" : ""}>
        {paymentEnabled ? (
          <Alert severity="warning" title={t("warning_payment_recurring_event")} />
        ) : (
          <>
            <Alert
              className="mb-4"
              severity="warning"
              title="Experimental: Recurring Events are currently experimental and causes some issues sometimes when checking for availability. We are working on fixing this."
            />
            <SettingsToggle
              labelClassName="text-sm"
              toggleSwitchAtTheEnd={true}
              switchContainerClassName={classNames(
                "border-subtle rounded-lg border py-6 px-4 sm:px-6",
                recurringEventState !== null && "rounded-b-none"
              )}
              childrenClassName="lg:ml-0"
              title={t("recurring_event")}
              {...recurringLocked}
              description={t("recurring_event_description")}
              checked={recurringEventState !== null}
              data-testid="recurring-event-check"
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
                      <p className="text-emphasis ltr:mr-2 rtl:ml-2">{t("repeats_every")}</p>
                      <TextField
                        disabled={recurringLocked.disabled}
                        type="number"
                        min="1"
                        max="20"
                        className="mb-0"
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
                        className="w-18 ml-2 block min-w-0 rounded-md text-sm"
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
                    <div className="mt-4 flex items-center">
                      <p className="text-emphasis ltr:mr-2 rtl:ml-2">{t("for_a_maximum_of")}</p>
                      <TextField
                        disabled={recurringLocked.disabled}
                        type="number"
                        min="1"
                        max="20"
                        defaultValue={recurringEventState.count}
                        className="mb-0"
                        onChange={(event) => {
                          const newVal = {
                            ...recurringEventState,
                            count: parseInt(event?.target.value),
                          };
                          formMethods.setValue("recurringEvent", newVal, { shouldDirty: true });
                          setRecurringEventState(newVal);
                        }}
                      />
                      <p className="text-emphasis ltr:ml-2 rtl:mr-2">
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
