import type { FormValues } from "pages/event-types/[type]";
import { useState } from "react";
import { useFormContext } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Frequency } from "@calcom/prisma/zod-utils";
import type { RecurringEvent } from "@calcom/types/Calendar";
import { Alert, Select, SettingsToggle } from "@calcom/ui";

type RecurringEventControllerProps = {
  recurringEvent: RecurringEvent | null;
  paymentEnabled: boolean;
};

export default function RecurringEventController({
  recurringEvent,
  paymentEnabled,
}: RecurringEventControllerProps) {
  const { t } = useLocale();
  const [recurringEventState, setRecurringEventState] = useState<RecurringEvent | null>(recurringEvent);
  const formMethods = useFormContext<FormValues>();

  /* Just yearly-0, monthly-1 and weekly-2 */
  const recurringEventFreqOptions = Object.entries(Frequency)
    .filter(([key, value]) => isNaN(Number(key)) && Number(value) < 3)
    .map(([key, value]) => ({
      label: t(`${key.toString().toLowerCase()}`, { count: recurringEventState?.interval }),
      value: value.toString(),
    }));

  return (
    <div className="block items-start sm:flex">
      <div className={!paymentEnabled ? "w-full" : ""}>
        {paymentEnabled ? (
          <Alert severity="warning" title={t("warning_payment_recurring_event")} />
        ) : (
          <>
            <SettingsToggle
              title={t("recurring_event")}
              description={t("recurring_event_description")}
              checked={recurringEventState !== null}
              data-testid="recurring-event-check"
              onCheckedChange={(e) => {
                if (!e) {
                  formMethods.setValue("recurringEvent", null);
                  setRecurringEventState(null);
                } else {
                  const newVal = recurringEvent || {
                    interval: 1,
                    count: 12,
                    freq: Frequency.WEEKLY,
                  };
                  formMethods.setValue("recurringEvent", newVal);
                  setRecurringEventState(newVal);
                }
              }}>
              {recurringEventState && (
                <div data-testid="recurring-event-collapsible" className="text-sm">
                  <div className="flex items-center">
                    <p className="text-neutral-900 ltr:mr-2 rtl:ml-2">{t("repeats_every")}</p>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      className="block h-[36px] w-16 rounded-md border-gray-300 text-sm [appearance:textfield] ltr:mr-2 rtl:ml-2"
                      defaultValue={recurringEventState.interval}
                      onChange={(event) => {
                        const newVal = {
                          ...recurringEventState,
                          interval: parseInt(event?.target.value),
                        };
                        formMethods.setValue("recurringEvent", newVal);
                        setRecurringEventState(newVal);
                      }}
                    />
                    <Select
                      options={recurringEventFreqOptions}
                      value={recurringEventFreqOptions[recurringEventState.freq]}
                      isSearchable={false}
                      className="w-18 block h-[36px] min-w-0 rounded-md text-sm"
                      onChange={(event) => {
                        const newVal = {
                          ...recurringEventState,
                          freq: parseInt(event?.value || `${Frequency.WEEKLY}`),
                        };
                        formMethods.setValue("recurringEvent", newVal);
                        setRecurringEventState(newVal);
                      }}
                    />
                  </div>
                  <div className="mt-4 flex items-center">
                    <p className="text-neutral-900 ltr:mr-2 rtl:ml-2">{t("for_a_maximum_of")}</p>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      className="block h-[36px] w-16 rounded-md border-gray-300 text-sm [appearance:textfield] ltr:mr-2 rtl:ml-2"
                      defaultValue={recurringEventState.count}
                      onChange={(event) => {
                        const newVal = {
                          ...recurringEventState,
                          count: parseInt(event?.target.value),
                        };
                        formMethods.setValue("recurringEvent", newVal);
                        setRecurringEventState(newVal);
                      }}
                    />
                    <p className="text-neutral-900 ltr:mr-2 rtl:ml-2">
                      {t("events", {
                        count: recurringEventState.count,
                      })}
                    </p>
                  </div>
                </div>
              )}
            </SettingsToggle>
          </>
        )}
      </div>
    </div>
  );
}
