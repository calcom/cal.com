import type { FormValues } from "pages/event-types/[type]";
import { useState } from "react";
import { UseFormReturn } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Frequency } from "@calcom/prisma/zod-utils";
import { RecurringEvent } from "@calcom/types/Calendar";
import { Alert } from "@calcom/ui/Alert";

import Select from "@components/ui/form/Select";

type RecurringEventControllerProps = {
  recurringEvent: RecurringEvent | null;
  formMethods: UseFormReturn<FormValues>;
  paymentEnabled: boolean;
  onRecurringEventDefined: (value: boolean) => void;
};

export default function RecurringEventController({
  recurringEvent,
  formMethods,
  paymentEnabled,
  onRecurringEventDefined,
}: RecurringEventControllerProps) {
  const { t } = useLocale();
  const [recurringEventState, setRecurringEventState] = useState<RecurringEvent | null>(recurringEvent);

  /* Just yearly-0, monthly-1 and weekly-2 */
  const recurringEventFreqOptions = Object.entries(Frequency)
    .filter(([key, value]) => isNaN(Number(key)) && Number(value) < 3)
    .map(([key, value]) => ({
      label: t(`${key.toString().toLowerCase()}`, { count: recurringEventState?.interval }),
      value: value.toString(),
    }));

  return (
    <div className="block items-start sm:flex">
      <div className="min-w-48 mb-4 sm:mb-0">
        <span className="flex text-sm font-medium text-neutral-700">{t("recurring_event")}</span>
      </div>
      <div className={!paymentEnabled ? "w-full" : ""}>
        {paymentEnabled ? (
          <Alert severity="warning" title={t("warning_payment_recurring_event")} />
        ) : (
          <>
            <div className="relative flex items-start">
              <div className="flex h-5 items-center">
                <input
                  onChange={(event) => {
                    onRecurringEventDefined(event?.target.checked);
                    if (!event?.target.checked) {
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
                  }}
                  type="checkbox"
                  className="text-primary-600  h-4 w-4 rounded border-gray-300"
                  defaultChecked={recurringEventState !== null}
                  data-testid="recurring-event-check"
                  id="recurringEvent"
                />
              </div>
              <div className="text-sm ltr:ml-3 rtl:mr-3">
                <label htmlFor="recurringEvent" className="text-neutral-900">
                  {t("recurring_event_description")}
                </label>
              </div>
            </div>
            {recurringEventState && (
              <div data-testid="recurring-event-collapsible" className="mt-4 text-sm">
                <div className="flex items-center">
                  <p className="mr-2 text-neutral-900">{t("repeats_every")}</p>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    className="block w-16 rounded-sm border-gray-300 shadow-sm [appearance:textfield] ltr:mr-2 rtl:ml-2 sm:text-sm"
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
                    className="w-18 block min-w-0 rounded-sm sm:text-sm"
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
                  <p className="mr-2 text-neutral-900">{t("max")}</p>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    className="block w-16 rounded-sm border-gray-300 shadow-sm [appearance:textfield] ltr:mr-2 rtl:ml-2 sm:text-sm"
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
                  <p className="mr-2 text-neutral-900">
                    {t(`${Frequency[recurringEventState.freq].toString().toLowerCase()}`, {
                      count: recurringEventState.count,
                    })}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
