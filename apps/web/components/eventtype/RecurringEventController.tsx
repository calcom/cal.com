import type { EventTypeSetup, FormValues } from "pages/event-types/[type]";
import { useState } from "react";
import { useFormContext } from "react-hook-form";

import useLockedFieldsManager from "@calcom/features/ee/managed-event-types/hooks/useLockedFieldsManager";
import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Frequency } from "@calcom/prisma/zod-utils";
import type { RecurringEvent } from "@calcom/types/Calendar";
import { Alert, Select, SettingsToggle, TextField, DatePicker } from "@calcom/ui";

type RecurringEventControllerProps = {
  eventType: EventTypeSetup;
  paymentEnabled: boolean;
};

export default function RecurringEventController({
  eventType,
  paymentEnabled,
}: RecurringEventControllerProps) {
  const { t } = useLocale();
  const [recurringEventState, setRecurringEventState] = useState<RecurringEvent | null>(
    eventType.recurringEvent
  );
  const formMethods = useFormContext<FormValues>();
  const [definite, setDefinite] = useState(
    recurringEventState ? recurringEventState.count != Number.MAX_SAFE_INTEGER : true
  );
  const [custom, setCustom] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    recurringEventState && recurringEventState.until ? recurringEventState.until : new Date()
  );
  /* Just yearly-0, monthly-1, weekly-2, daily-3 */
  const recurringEventFreqOptions = Object.entries(Frequency)
    .filter(([key, value]) => isNaN(Number(key)) && Number(value) <= 3)
    .map(([key, value]) => ({
      label: t(`${key.toString().toLowerCase()}`, {
        count: Math.max(recurringEventState?.interval ? recurringEventState.interval : 2, 2),
      }),
      value: value.toString(),
    }));
  /* yearly-0, monthly-1, weekly-2, daily-3, custom-7, weekdays-8*/
  const recurringEventFreqOptionsCustom = Object.entries(Frequency)
    .filter(
      ([key, value]) =>
        (isNaN(Number(key)) && (Number(value) <= 3 || Number(value) == 7)) || Number(value) == 8
    )
    .map(([key, value]) => ({
      label: t(`${key.toString()[0] + key.toString().slice(1).toLowerCase()}`),
      value: value.toString(),
    }));
  const { shouldLockDisableProps } = useLockedFieldsManager(
    eventType,
    t("locked_fields_admin_description"),
    t("locked_fields_member_description")
  );
  const recurringLocked = shouldLockDisableProps("recurringEvent");
  const definiteLocked = shouldLockDisableProps("definite");
  const [customInterval, setCustomInterval] = useState<RecurringEvent | null>(null);
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
                  formMethods.setValue("recurringEvent", null);
                  setRecurringEventState(null);
                } else {
                  const newVal = eventType.recurringEvent || {
                    interval: 1,
                    count: 12,
                    freq: Frequency.WEEKLY,
                  };
                  formMethods.setValue("recurringEvent", newVal);
                  setRecurringEventState(newVal);
                }
              }}>
              <div className="border-subtle rounded-b-lg border border-t-0 p-6">
                {recurringEventState && (
                  <div data-testid="recurring-event-collapsible" className="text-sm">
                    <div className="mb-12 flex items-center">
                      <p className="text-emphasis ltr:mr-2 rtl:ml-2">{t("Repeat ")}</p>
                      <Select
                        options={recurringEventFreqOptionsCustom}
                        value={
                          customInterval
                            ? recurringEventFreqOptionsCustom[customInterval.freq]
                            : recurringEventFreqOptionsCustom[recurringEventState.freq]
                        }
                        isSearchable={false}
                        className="w-18 ml-2 block min-w-0 rounded-md text-sm"
                        isDisabled={recurringLocked.disabled}
                        onChange={(event) => {
                          const newVal = {
                            ...recurringEventState,
                            freq: parseInt(event?.value || `${Frequency.WEEKLY}`),
                          };
                          formMethods.setValue("recurringEvent", newVal);
                          setRecurringEventState(newVal);
                          event && parseInt(event?.value) == 8 ? setCustom(true) : setCustom(false);
                          setCustomInterval(newVal);
                        }}
                      />
                      {custom && (
                        <div>
                          <p className="text-emphasis tr:mr-2 ml-8 rtl:ml-2">{t("Repeats Every")}</p>
                          <TextField
                            disabled={recurringLocked.disabled}
                            type="number"
                            min="2"
                            max="20"
                            className="mb-0 ml-8"
                            defaultValue={Math.max(recurringEventState.interval, 2)}
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
                            className="w-18 ml-8 block min-w-0 rounded-md text-sm"
                            isDisabled={recurringLocked.disabled}
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
                      )}
                    </div>
                    <SettingsToggle
                      labelClassName="text-sm"
                      toggleSwitchAtTheEnd={true}
                      switchContainerClassName={classNames(
                        "border-subtle rounded-lg border py-6 px-4 sm:px-6",
                        recurringEventState !== null && "rounded-b-none"
                      )}
                      childrenClassName="lg:ml-0"
                      title={t("Set Limit")}
                      {...definiteLocked}
                      // description={t("recurring_event_description")}
                      checked={definite}
                      data-testid="recurring-event-check"
                      onCheckedChange={(e) => {
                        if (!e) {
                          const newVal = {
                            ...recurringEventState,
                            count: Number.MAX_SAFE_INTEGER,
                            until: undefined,
                          };
                          formMethods.setValue("recurringEvent", newVal);
                          setRecurringEventState(newVal);
                        }
                        setDefinite(!definite);
                      }}>
                      {definite && (
                        <div className="mt-4 flex items-center">
                          <p className="text-emphasis ltr:mr-2 rtl:ml-2">{t("for_a_maximum_of")}</p>
                          <TextField
                            disabled={definiteLocked.disabled}
                            type="number"
                            min="1"
                            max="30"
                            defaultValue={
                              recurringEventState.count != Number.MAX_SAFE_INTEGER
                                ? recurringEventState.count
                                : 12
                            }
                            className="mb-0"
                            onChange={(event) => {
                              if (definite) {
                                const newVal = {
                                  ...recurringEventState,
                                  count: parseInt(event?.target.value),
                                };
                                formMethods.setValue("recurringEvent", newVal);
                                setRecurringEventState(newVal);
                              }
                            }}
                          />
                          <p className="text-emphasis ltr:ml-2 rtl:mr-2">
                            {t("events", {
                              count: recurringEventState.count,
                            })}
                          </p>
                        </div>
                      )}
                      <div className="mt-4 flex items-center">
                        <p className="text-emphasis ltr:mr-2 rtl:ml-2">{t("Until")}</p>
                        <DatePicker
                          minDate={recurringEventState.dtstart}
                          date={selectedDate}
                          onDatesChange={(event) => {
                            setSelectedDate(event);
                            const newVal = {
                              ...recurringEventState,
                              count: recurringEventState.count,
                              until: event,
                            };
                            formMethods.setValue("recurringEvent", newVal);
                            setRecurringEventState(newVal);
                          }}
                        />
                        <button
                          className="ml-40"
                          onClick={() => {
                            const newVal = {
                              ...recurringEventState,
                              count: recurringEventState.count,
                              until: undefined,
                            };
                            formMethods.setValue("recurringEvent", newVal);
                            setRecurringEventState(newVal);
                            setSelectedDate(new Date());
                          }}>
                          Clear End Date
                        </button>
                        {/* Assuming End-dates have priority over max count,implementing a clear button for end date seems*/}
                      </div>
                    </SettingsToggle>
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
