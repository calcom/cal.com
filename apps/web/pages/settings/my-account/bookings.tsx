import * as RadioGroup from "@radix-ui/react-radio-group";
import classNames from "classnames";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { PeriodType } from "@calcom/prisma/enums";
import { Button, DateRangePicker, Form, Meta, Select, SettingsToggle, TextField, Label } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";
import {
  MinimumBookingNoticeInput,
  IntervalLimitsManager,
  optionsPeriod,
  PERIOD_TYPES,
} from "@components/eventtype/EventLimitsTab";

const BookingsView = () => {
  const [showLimitFrequency, setShowLimitFrequency] = useState(false);
  const [showLimitFutureBookings, setShowLimitFutureBookings] = useState(false);
  const { t } = useLocale();
  const bookingsLimitFormMethods = useForm();
  const bookingFutureLimitFormMethods = useForm({
    defaultValues: {
      periodType: "UNLIMITED",
      periodCountCalendarDays: false,
      periodDays: 30,
      periodDates: {
        startDate: new Date(),
        endDate: new Date(),
      },
    },
  });

  const watchPeriodType = bookingFutureLimitFormMethods.watch("periodType");

  return (
    <div>
      <Meta
        title={t("bookings")}
        description={t("bookings_settings_description", { appName: APP_NAME })}
        borderInShellHeader={false}
      />
      <Form
        form={bookingsLimitFormMethods}
        handleSubmit={(values) => {
          console.log(values);
        }}>
        <Controller
          name="bookingLimits"
          render={({ field: { value } }) => {
            return (
              <SettingsToggle
                toggleSwitchAtTheEnd={true}
                labelClassName="text-sm"
                title={t("limit_booking_frequency")}
                description={t("limit_booking_frequency_description")}
                checked={showLimitFrequency}
                onCheckedChange={(active) => {
                  setShowLimitFrequency(active);
                  if (active) {
                    bookingsLimitFormMethods.setValue(
                      "bookingLimits",
                      {
                        PER_DAY: 1,
                      },
                      { shouldDirty: true }
                    );
                  } else {
                    bookingsLimitFormMethods.setValue("bookingLimits", {}, { shouldDirty: true });
                  }
                }}
                switchContainerClassName={classNames(
                  "border-subtle mt-6 rounded-lg border py-6 px-4 sm:px-6",
                  showLimitFrequency && "rounded-b-none"
                )}
                childrenClassName="lg:ml-0">
                <div className="border-subtle border border-b-0 border-t-0 p-6">
                  <IntervalLimitsManager
                    disabled={false}
                    propertyName="bookingLimits"
                    defaultLimit={1}
                    step={1}
                  />
                </div>
              </SettingsToggle>
            );
          }}
        />
        {showLimitFrequency && (
          <SectionBottomActions align="end">
            <Button color="primary" type="submit" data-testid="profile-submit-button">
              {t("update")}
            </Button>
          </SectionBottomActions>
        )}
      </Form>

      <Form
        form={bookingFutureLimitFormMethods}
        handleSubmit={(values) => {
          console.log(values);
        }}>
        <Controller
          name="periodType"
          render={({ field: { onChange, value } }) => {
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
                title={t("limit_future_bookings")}
                description={t("limit_future_bookings_description")}
                checked={isChecked}
                onCheckedChange={(bool) => {
                  if (bool && !bookingFutureLimitFormMethods.getValues("periodDays")) {
                    bookingFutureLimitFormMethods.setValue("periodDays", 30, { shouldDirty: true });
                  }
                  setShowLimitFutureBookings(bool);
                  return onChange(bool ? "ROLLING" : "UNLIMITED");
                }}>
                <div className="border-subtle border border-b-0 border-t-0 p-6">
                  <RadioGroup.Root
                    value={watchPeriodType}
                    onValueChange={(val) =>
                      bookingFutureLimitFormMethods.setValue("periodType", val as PeriodType, {
                        shouldDirty: true,
                      })
                    }>
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
                          {period.prefix ? <span>{t(period.prefix)}&nbsp;</span> : null}
                          {period.type === "ROLLING" && (
                            <div className="flex items-center">
                              <TextField
                                labelSrOnly
                                type="number"
                                className="border-default my-0 block w-16 text-sm [appearance:textfield] ltr:mr-2 rtl:ml-2"
                                placeholder="30"
                                {...bookingFutureLimitFormMethods.register("periodDays", {
                                  valueAsNumber: true,
                                })}
                              />
                              <Select
                                options={optionsPeriod.map((option) => ({
                                  ...option,
                                  label: t(option.label),
                                }))}
                                isSearchable={false}
                                onChange={(opt) => {
                                  bookingFutureLimitFormMethods.setValue(
                                    "periodCountCalendarDays",
                                    opt?.value === 1 ? true : false,
                                    { shouldDirty: true }
                                  );
                                }}
                                name="periodCoundCalendarDays"
                                value={optionsPeriod.find((opt) => {
                                  opt.value ===
                                    (bookingFutureLimitFormMethods.getValues("periodCountCalendarDays") ===
                                    true
                                      ? 1
                                      : 0);
                                })}
                                defaultValue={optionsPeriod.find(
                                  (opt) =>
                                    opt.value ===
                                    (bookingFutureLimitFormMethods.getValues("periodCountCalendarDays") ===
                                    true
                                      ? 1
                                      : 0)
                                )}
                              />
                            </div>
                          )}
                          {period.type === "RANGE" && (
                            <div className="me-2 ms-2 inline-flex space-x-2 rtl:space-x-reverse">
                              <Controller
                                name="periodDates"
                                render={({ field: { onChange } }) => (
                                  <DateRangePicker
                                    startDate={
                                      bookingFutureLimitFormMethods.getValues("periodDates").startDate
                                    }
                                    endDate={bookingFutureLimitFormMethods.getValues("periodDates").endDate}
                                    onDatesChange={({ startDate, endDate }) => {
                                      onChange({
                                        startDate,
                                        endDate,
                                      });
                                    }}
                                  />
                                )}
                              />
                            </div>
                          )}
                          {period.suffix ? <span className="me-2 ms-2">&nbsp;{t(period.suffix)}</span> : null}
                        </div>
                      );
                    })}
                  </RadioGroup.Root>
                  <div className="flex flex-col">
                    <Label className="text-emphasis text-sm font-medium leading-none">Buffer Limits</Label>
                    <div className="bg-muted rounded-md p-4">
                      <div className="flex flex-col space-y-4 lg:flex-row lg:space-x-4 lg:space-y-0">
                        <div className="w-full">
                          <Label htmlFor="beforeBufferTime">{t("before_event")}</Label>
                          <Controller
                            name="beforeEventBuffer"
                            render={({ field: { onChange, value } }) => {
                              const beforeBufferOptions = [
                                {
                                  label: t("event_buffer_default"),
                                  value: 0,
                                },
                                ...[5, 10, 15, 20, 30, 45, 60, 90, 120].map((minutes) => ({
                                  label: `${minutes} ${t("minutes")}`,
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
                                    beforeBufferOptions.find((option) => option.value === value) ||
                                    beforeBufferOptions[0]
                                  }
                                  options={beforeBufferOptions}
                                />
                              );
                            }}
                          />
                        </div>
                        <div className="w-full">
                          <Label htmlFor="afterBufferTime">{t("after_event")}</Label>
                          <Controller
                            name="afterEventBuffer"
                            render={({ field: { onChange, value } }) => {
                              const afterBufferOptions = [
                                {
                                  label: t("event_buffer_default"),
                                  value: 0,
                                },
                                ...[5, 10, 15, 20, 30, 45, 60, 90, 120].map((minutes) => ({
                                  label: `${minutes} ${t("minutes")}`,
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
                                    afterBufferOptions.find((option) => option.value === value) ||
                                    afterBufferOptions[0]
                                  }
                                  options={afterBufferOptions}
                                />
                              );
                            }}
                          />
                        </div>
                      </div>
                      <div className="mt-4 flex flex-col space-y-4 lg:flex-row lg:space-x-4 lg:space-y-0">
                        <div className="w-2/4">
                          <Label htmlFor="minimumBookingNotice">{t("minimum_booking_notice")}</Label>
                          <MinimumBookingNoticeInput
                            {...bookingFutureLimitFormMethods.register("minimumBookingNotice")}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </SettingsToggle>
            );
          }}
        />
        {showLimitFutureBookings && (
          <SectionBottomActions align="end">
            <Button color="primary" type="submit" data-testid="profile-submit-button">
              {t("update")}
            </Button>
          </SectionBottomActions>
        )}
      </Form>
    </div>
  );
};

const BookingsViewWrapper = () => {
  return <BookingsView />;
};

BookingsViewWrapper.getLayout = getLayout;
BookingsViewWrapper.PageWrapper = PageWrapper;

export default BookingsViewWrapper;
