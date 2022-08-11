import * as RadioGroup from "@radix-ui/react-radio-group";
import { EventTypeSetupInfered, FormValues } from "pages/v2/event-types/[type]";
import { useState } from "react";
import { useFormContext, Controller, useWatch } from "react-hook-form";

import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { PeriodType } from "@calcom/prisma/client";
import { Select, Switch, Label } from "@calcom/ui/v2";

import { DateRangePicker } from "@components/ui/form/DateRangePicker";

export const EventLimitsTab = (props: Pick<EventTypeSetupInfered, "eventType">) => {
  const { t } = useLocale();
  const formMethods = useFormContext<FormValues>();
  const { eventType } = props;

  const PERIOD_TYPES = [
    {
      type: "ROLLING" as const,
      suffix: t("into_the_future"),
    },
    {
      type: "RANGE" as const,
      prefix: t("within_date_range"),
    },
    {
      type: "UNLIMITED" as const,
      prefix: t("indefinitely_into_future"),
    },
  ];

  const periodType =
    PERIOD_TYPES.find((s) => s.type === eventType.periodType) ||
    PERIOD_TYPES.find((s) => s.type === "UNLIMITED");

  const [periodDates] = useState<{ startDate: Date; endDate: Date }>({
    startDate: new Date(eventType.periodStartDate || Date.now()),
    endDate: new Date(eventType.periodEndDate || Date.now()),
  });
  const watchPeriodType = useWatch({
    control: formMethods.control,
    name: "periodType",
    defaultValue: periodType?.type,
  });

  return (
    <div>
      <div className="flex flex-col space-y-4 lg:flex-row lg:space-y-0 lg:space-x-4">
        <div className="w-full">
          <Label htmlFor="beforeBufferTime">{t("before_event")} </Label>
          <Controller
            name="beforeBufferTime"
            control={formMethods.control}
            defaultValue={eventType.beforeEventBuffer || 0}
            render={({ field: { onChange, value } }) => {
              const beforeBufferOptions = [
                {
                  label: t("event_buffer_default"),
                  value: 0,
                },
                ...[5, 10, 15, 20, 30, 45, 60, 90, 120].map((minutes) => ({
                  label: minutes + " " + t("minutes"),
                  value: minutes,
                })),
              ];
              return (
                <Select
                  isSearchable={false}
                  onChange={(val) => {
                    if (val) onChange(val.value);
                  }}
                  defaultValue={
                    beforeBufferOptions.find((option) => option.value === value) || beforeBufferOptions[0]
                  }
                  options={beforeBufferOptions}
                />
              );
            }}
          />
        </div>
        <div className="w-full">
          <Label htmlFor="afterBufferTime">{t("after_event")} </Label>
          <Controller
            name="afterBufferTime"
            control={formMethods.control}
            defaultValue={eventType.afterEventBuffer || 0}
            render={({ field: { onChange, value } }) => {
              const afterBufferOptions = [
                {
                  label: t("event_buffer_default"),
                  value: 0,
                },
                ...[5, 10, 15, 20, 30, 45, 60, 90, 120].map((minutes) => ({
                  label: minutes + " " + t("minutes"),
                  value: minutes,
                })),
              ];
              return (
                <Select
                  isSearchable={false}
                  onChange={(val) => {
                    if (val) onChange(val.value);
                  }}
                  defaultValue={
                    afterBufferOptions.find((option) => option.value === value) || afterBufferOptions[0]
                  }
                  options={afterBufferOptions}
                />
              );
            }}
          />
        </div>
        <div className="w-full">
          <Label htmlFor="minimumBookingNotice">{t("after_event")} </Label>
          <Controller
            name="minimumBookingNotice"
            control={formMethods.control}
            defaultValue={eventType.minimumBookingNotice || 0}
            render={({ field: { onChange, value } }) => {
              const minimumBookingOptions = [
                {
                  label: t("event_buffer_default"),
                  value: 0,
                },
                ...[5, 10, 15, 20, 30, 45, 60, 90, 120].map((minutes) => ({
                  label: minutes + " " + t("minutes"),
                  value: minutes,
                })),
              ];
              return (
                <Select
                  isSearchable={false}
                  onChange={(val) => {
                    if (val) onChange(val.value);
                  }}
                  defaultValue={
                    minimumBookingOptions.find((option) => option.value === value) || minimumBookingOptions[0]
                  }
                  options={minimumBookingOptions}
                />
              );
            }}
          />
        </div>
      </div>
      <hr className="my-8" />
      <div className="">
        <fieldset className="block flex-col sm:flex">
          <div className="flex space-x-3">
            <Controller
              name="periodType"
              control={formMethods.control}
              defaultValue={periodType?.type !== "UNLIMITED" ? "ROLLING" : "UNLIMITED"}
              render={({ field: { value } }) => (
                <Switch
                  checked={value !== "UNLIMITED"}
                  onCheckedChange={(bool) =>
                    formMethods.setValue("periodType", bool ? "ROLLING" : "UNLIMITED")
                  }
                />
              )}
            />

            <div className="">
              <Label className="text-sm font-semibold leading-none text-black">Limit Future Bookings</Label>
              <p className="-mt-2 text-sm leading-normal text-gray-600">
                Limit how far in the future people can book a time
              </p>
            </div>
          </div>
          <div className="mt-4 lg:ml-14">
            <Controller
              name="periodType"
              control={formMethods.control}
              defaultValue={periodType?.type}
              render={() => (
                <RadioGroup.Root
                  defaultValue={watchPeriodType}
                  value={watchPeriodType}
                  onValueChange={(val) => formMethods.setValue("periodType", val as PeriodType)}>
                  {PERIOD_TYPES.map((period) => {
                    if (period.type === "UNLIMITED") return null;
                    return (
                      <div
                        className={classNames(
                          "mb-2 flex flex-wrap items-center text-sm",
                          watchPeriodType === "UNLIMITED" && "pointer-events-none opacity-30"
                        )}
                        key={period.type}>
                        <RadioGroup.Item
                          id={period.type}
                          value={period.type}
                          className="min-w-4 flex h-4 w-4 cursor-pointer items-center rounded-full border border-black bg-white focus:border-2 focus:outline-none ltr:mr-2 rtl:ml-2">
                          <RadioGroup.Indicator className="relative flex h-4 w-4 items-center justify-center after:block after:h-2 after:w-2 after:rounded-full after:bg-black" />
                        </RadioGroup.Item>
                        {period.prefix ? <span>{period.prefix}&nbsp;</span> : null}
                        {period.type === "ROLLING" && (
                          <div className="flex ">
                            <input
                              type="number"
                              className="block w-16 rounded-md border-gray-300 py-3 text-sm [appearance:textfield] ltr:mr-2 rtl:ml-2"
                              placeholder="30"
                              {...formMethods.register("periodDays", { valueAsNumber: true })}
                              defaultValue={eventType.periodDays || 30}
                            />
                            <select
                              id=""
                              className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-sm focus:outline-none"
                              {...formMethods.register("periodCountCalendarDays")}
                              defaultValue={eventType.periodCountCalendarDays ? "1" : "0"}>
                              <option value="1">{t("calendar_days")}</option>
                              <option value="0">{t("business_days")}</option>
                            </select>
                          </div>
                        )}
                        {period.type === "RANGE" && (
                          <div className="inline-flex space-x-2 ltr:ml-2 rtl:mr-2 rtl:space-x-reverse">
                            <Controller
                              name="periodDates"
                              control={formMethods.control}
                              defaultValue={periodDates}
                              render={() => (
                                <DateRangePicker
                                  startDate={formMethods.getValues("periodDates").startDate}
                                  endDate={formMethods.getValues("periodDates").endDate}
                                  onDatesChange={({ startDate, endDate }) => {
                                    formMethods.setValue("periodDates", {
                                      startDate,
                                      endDate,
                                    });
                                  }}
                                />
                              )}
                            />
                          </div>
                        )}
                        {period.suffix ? (
                          <span className="ltr:ml-2 rtl:mr-2">&nbsp;{period.suffix}</span>
                        ) : null}
                      </div>
                    );
                  })}
                </RadioGroup.Root>
              )}
            />
          </div>
        </fieldset>
      </div>
    </div>
  );
};
