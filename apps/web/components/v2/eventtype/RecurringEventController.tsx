import type { FormValues } from "pages/event-types/[type]";
import { useState } from "react";
import { useFormContext } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Frequency } from "@calcom/prisma/zod-utils";
import type { RecurringEvent } from "@calcom/types/Calendar";
import { Alert } from "@calcom/ui/Alert";
import { Label, Select, Switch } from "@calcom/ui/v2";

type RecurringEventControllerProps = {
  recurringEvent: RecurringEvent | null;
  paymentEnabled: boolean;
  onRecurringEventDefined: (value: boolean) => void;
};

export default function RecurringEventController({
  recurringEvent,
  paymentEnabled,
  onRecurringEventDefined,
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
            <div className="flex space-x-3 ">
              <Switch
                name="requireConfirmation"
                checked={recurringEventState !== null}
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
                }}
              />
              <div className="flex flex-col">
                <Label className="text-sm font-semibold leading-none text-black">
                  {t("recurring_event")}
                </Label>
                <p className="-mt-2 text-sm leading-normal text-gray-600">
                  {t("recurring_event_description")}
                </p>
                {recurringEventState && (
                  <div data-testid="recurring-event-collapsible" className="mt-4 text-sm">
                    <div className="flex items-center">
                      <p className="mr-2 text-neutral-900">{t("repeats_every")}</p>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        className="block w-16 rounded-md border-gray-300 text-sm [appearance:textfield] ltr:mr-2 rtl:ml-2"
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
                        className="w-18 block min-w-0 rounded-md text-sm"
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
                        className="block w-16 rounded-md border-gray-300 text-sm [appearance:textfield] ltr:mr-2 rtl:ml-2"
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
                        {t("occurrence", {
                          count: recurringEventState.count,
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
