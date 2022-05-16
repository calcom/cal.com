import { Collapsible, CollapsibleContent } from "@radix-ui/react-collapsible";
import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Frequency as RRuleFrequency } from "rrule";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { RecurringEvent } from "@calcom/types/Calendar";
import { Alert } from "@calcom/ui/Alert";

import Select from "@components/ui/form/Select";

type RecurringEventControllerProps = {
  recurringEvent: RecurringEvent;
  formMethods: UseFormReturn<any, any>;
  paymentEnabled: boolean;
  onRecurringEventDefined: Function;
};

export default function RecurringEventController({
  recurringEvent,
  formMethods,
  paymentEnabled,
  onRecurringEventDefined,
}: RecurringEventControllerProps) {
  const { t } = useLocale();

  const [recurringEventDefined, setRecurringEventDefined] = useState(recurringEvent?.count !== undefined);

  const [recurringEventInterval, setRecurringEventInterval] = useState(recurringEvent?.interval || 1);
  const [recurringEventFrequency, setRecurringEventFrequency] = useState(
    recurringEvent?.freq || RRuleFrequency.WEEKLY
  );
  const [recurringEventCount, setRecurringEventCount] = useState(recurringEvent?.count || 12);

  /* Just yearly-0, monthly-1 and weekly-2 */
  const recurringEventFreqOptions = Object.entries(RRuleFrequency)
    .filter(([key, value]) => isNaN(Number(key)) && Number(value) < 3)
    .map(([key, value]) => ({
      label: t(`${key.toString().toLowerCase()}`, { count: recurringEventInterval }),
      value: value.toString(),
    }));

  return (
    <div className="block items-start sm:flex">
      <div className="min-w-48 mb-4 sm:mb-0">
        <label htmlFor="recurringEvent" className="flex text-sm font-medium text-neutral-700">
          {t("recurring_event")}
        </label>
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
                    setRecurringEventDefined(event?.target.checked);
                    onRecurringEventDefined(event?.target.checked);
                    if (!event?.target.checked) {
                      formMethods.setValue("recurringEvent", {});
                    } else {
                      formMethods.setValue(
                        "recurringEvent",
                        recurringEventDefined
                          ? recurringEvent
                          : {
                              interval: 1,
                              count: 12,
                              freq: RRuleFrequency.WEEKLY,
                            }
                      );
                    }
                    recurringEvent = formMethods.getValues("recurringEvent");
                  }}
                  type="checkbox"
                  className="text-primary-600  h-4 w-4 rounded border-gray-300"
                  defaultChecked={recurringEventDefined}
                  data-testid="recurring-event-check"
                />
              </div>
              <div className="text-sm ltr:ml-3 rtl:mr-3">
                <p className="text-neutral-900">{t("recurring_event_description")}</p>
              </div>
            </div>
            <Collapsible
              open={recurringEventDefined}
              data-testid="recurring-event-collapsible"
              onOpenChange={() => setRecurringEventDefined(!recurringEventDefined)}>
              <CollapsibleContent className="mt-4 text-sm">
                <div className="flex items-center">
                  <p className="mr-2 text-neutral-900">{t("repeats_every")}</p>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    className="block w-16 rounded-sm border-gray-300 shadow-sm [appearance:textfield] ltr:mr-2 rtl:ml-2 sm:text-sm"
                    defaultValue={recurringEvent?.interval || 1}
                    onChange={(event) => {
                      setRecurringEventInterval(parseInt(event?.target.value));
                      recurringEvent.interval = parseInt(event?.target.value);
                      formMethods.setValue("recurringEvent", recurringEvent);
                    }}
                  />
                  <Select
                    options={recurringEventFreqOptions}
                    value={recurringEventFreqOptions[recurringEventFrequency]}
                    isSearchable={false}
                    className="w-18 block min-w-0 rounded-sm sm:text-sm"
                    onChange={(e) => {
                      if (e?.value) {
                        setRecurringEventFrequency(parseInt(e?.value));
                        recurringEvent.freq = parseInt(e?.value);
                        formMethods.setValue("recurringEvent", recurringEvent);
                      }
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
                    defaultValue={recurringEvent?.count || 12}
                    onChange={(event) => {
                      setRecurringEventCount(parseInt(event?.target.value));
                      recurringEvent.count = parseInt(event?.target.value);
                      formMethods.setValue("recurringEvent", recurringEvent);
                    }}
                  />
                  <p className="mr-2 text-neutral-900">
                    {t(`${RRuleFrequency[recurringEventFrequency].toString().toLowerCase()}`, {
                      count: recurringEventCount,
                    })}
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </div>
    </div>
  );
}
