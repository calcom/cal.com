import * as RadioGroup from "@radix-ui/react-radio-group";
import { Controller, useWatch } from "react-hook-form";

import { classNames } from "@calcom/lib";
import type { PeriodType } from "@calcom/prisma/enums";
import { Select, SettingsToggle, TextField, DateRangePicker } from "@calcom/ui";

import { PERIOD_TYPES, optionsPeriod } from "../../lib/limitsUtils";
import type { LimitsToggleProps } from "../../types";

type LimitFutureBookingsProps = {
  formMethods: LimitsToggleProps;
  eventType: {
    periodDays: number | null;
    periodCountCalendarDays: boolean | null;
  };
  periodDates: {
    startDate: Date;
    endDate: Date;
  };
  periodType:
    | {
        type: "ROLLING";
        suffix: string;
        prefix?: undefined;
      }
    | {
        type: "RANGE";
        prefix: string;
        suffix?: undefined;
      }
    | {
        type: "UNLIMITED";
        prefix: string;
        suffix?: undefined;
      }
    | undefined;
};

export function LimitFutureBookings({
  formMethods,
  periodType,
  eventType,
  periodDates,
}: LimitFutureBookingsProps) {
  const watchPeriodType = useWatch({
    control: formMethods.control,
    name: "periodType",
    defaultValue: periodType?.type,
  });

  return (
    <Controller
      name="periodType"
      control={formMethods.control}
      render={({ field: { value } }) => {
        const isChecked = value && value !== "UNLIMITED";

        return (
          <SettingsToggle
            labelClassName="text-sm"
            toggleSwitchAtTheEnd={true}
            switchContainerClassName={classNames(
              "border-subtle mt-6 rounded-lg border py-6 px-4 sm:px-6",
              isChecked && "rounded-b-none"
            )}
            childrenClassName="lg:ml-0"
            title="Limit future bookings"
            description="Limit how far in the future this event can be booked"
            checked={isChecked}
            onCheckedChange={(bool) => formMethods.setValue("periodType", bool ? "ROLLING" : "UNLIMITED")}>
            <div className="border-subtle rounded-b-lg border border-t-0 p-6">
              <RadioGroup.Root
                defaultValue={watchPeriodType}
                value={watchPeriodType}
                onValueChange={(val) => formMethods.setValue("periodType", val as PeriodType)}>
                {PERIOD_TYPES.map((period) => {
                  if (period.type === "UNLIMITED") return null;

                  return (
                    <div
                      className={classNames(
                        "text-default mb-2 flex flex-wrap items-center text-sm",
                        watchPeriodType === "UNLIMITED" && "pointer-events-none opacity-30"
                      )}
                      key={period.type}>
                      <RadioGroup.Item
                        id={period.type}
                        value={period.type}
                        className="min-w-4 bg-default border-default flex h-4 w-4 cursor-pointer items-center rounded-full border focus:border-2 focus:outline-none ltr:mr-2 rtl:ml-2">
                        <RadioGroup.Indicator className="after:bg-inverted relative flex h-4 w-4 items-center justify-center after:block after:h-2 after:w-2 after:rounded-full" />
                      </RadioGroup.Item>

                      {period.prefix ? <span>{period.prefix}&nbsp;</span> : null}
                      {period.type === "ROLLING" && (
                        <div className="flex items-center">
                          <TextField
                            labelSrOnly
                            type="number"
                            className="border-default my-0 block w-16 text-sm [appearance:textfield] ltr:mr-2 rtl:ml-2"
                            placeholder="30"
                            {...formMethods.register("periodDays", { valueAsNumber: true })}
                            defaultValue={eventType.periodDays || 30}
                          />
                          <Select
                            options={optionsPeriod}
                            isSearchable={false}
                            onChange={(opt) => {
                              formMethods.setValue(
                                "periodCountCalendarDays",
                                opt?.value.toString() as "0" | "1"
                              );
                            }}
                            defaultValue={
                              optionsPeriod.find(
                                (opt) => opt.value === (eventType.periodCountCalendarDays ? 1 : 0)
                              ) ?? optionsPeriod[0]
                            }
                          />
                        </div>
                      )}
                      {period.type === "RANGE" && (
                        <div>
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
                      {period.suffix ? <span className="me-2 ms-2">&nbsp;{period.suffix}</span> : null}
                    </div>
                  );
                })}
              </RadioGroup.Root>
            </div>
          </SettingsToggle>
        );
      }}
    />
  );
}
