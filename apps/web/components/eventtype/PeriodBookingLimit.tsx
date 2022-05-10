import { PlusIcon, XIcon } from "@heroicons/react/solid";
import { BookingPeriodFrequencyType, EventTypeFormType } from "pages/event-types/[type]";
import React from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import type { TFunction } from "react-i18next";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui";

import CheckboxField from "@components/ui/form/CheckboxField";

type Props = {
  visible: boolean;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
};

function calculateMinMaxValue(periodType: string, bookingFrequency: BookingPeriodFrequencyType) {
  if (periodType === "DAY") return 1;
  if (periodType === "WEEK") return bookingFrequency.DAY + 1;
  if (periodType === "MONTH") return bookingFrequency.WEEK + 1;
  return 1; // Imposible case
}

function PeriodBookingLimitInputs({
  periodType,
  index,
}: {
  periodType: "DAY" | "MONTH" | "WEEK";
  index: number;
}) {
  const formMethods = useFormContext<EventTypeFormType>();
  const { t } = useLocale();
  formMethods.watch(`bookingFrequency.${periodType}`);

  return (
    <div className="flex items-center ">
      <Controller
        name={`bookingFrequency.${periodType}`}
        render={({ field: { onChange, value } }) => (
          <input
            type="number"
            className="block w-16 rounded-sm border-gray-300 shadow-sm [appearance:textfield] ltr:mr-2 rtl:ml-2 sm:text-sm"
            placeholder="0"
            min={calculateMinMaxValue(periodType, formMethods.getValues("bookingFrequency"))}
            defaultValue={value}
            onChange={(e) => onChange(parseInt(e.target.value))}
          />
        )}
      />
      <p className="text-sm text-gray-700">per</p>
      {/* TODO: Fix this selection - I can't figure out how to do this */}
      <select
        id={`periodBookingSelect-${index}`}
        className="ml-2 block w-24 rounded-sm border-gray-300 py-2 pl-3 pr-10 text-base focus:outline-none sm:text-sm"
        defaultValue={periodType}>
        <option value="DAY">{t("period_label_day")}</option>
        <option value="WEEK">{t("period_label_week")}</option>
        <option value="MONTH">{t("period_label_month")}</option>
      </select>
      <Button
        color="minimal"
        className="ml-2 "
        type="button"
        onClick={() => {
          // @ts-ignore This periodType can only be the right type.
          formMethods.setValue(`bookingFrequency.${periodType}`, 0);
        }}>
        <XIcon className="h-4 w-4"></XIcon>
      </Button>
    </div>
  );
}

function PeriodBookingLimit({ visible, setVisible }: Props) {
  const formMethods = useFormContext<EventTypeFormType>();
  const { t } = useLocale();
  return (
    <Controller
      name="bookingFrequency"
      control={formMethods.control}
      render={() => (
        <div className="block w-full">
          <CheckboxField
            id="bookingFrequncyToggle"
            name="bookingFrequncyToggle"
            description={t("limit_booking_frequency")}
            descriptionAsLabel
            defaultChecked={visible}
            onChange={(e) => {
              setVisible(e?.target.checked);
            }}
          />
          {visible && (
            <div className="mt-3 flex flex-col space-y-3 bg-gray-100 p-4">
              {Object.entries(formMethods.getValues("bookingFrequency") ?? {}).map(([key, value], index) => {
                // @ts-ignore Key is only these types - Object.entries loosing infered types
                if (value > 0) return <PeriodBookingLimitInputs index={index} periodType={key} key={index} />;
              })}

              {Object.keys(formMethods.getValues("bookingFrequency")) && (
                <Button
                  color="minimal"
                  className="w-32"
                  type="button"
                  StartIcon={PlusIcon}
                  onClick={() => {
                    const values = formMethods.getValues("bookingFrequency");
                    const frequency = ["MONTH", "WEEK", "DAY"];
                    // Finding a value that hasnt been used already and creating a new input with that period
                    frequency.forEach((period, index) => {
                      // @ts-ignore
                      if (values[period] === 0) {
                        formMethods.setValue("bookingFrequency", {
                          ...values,
                          [period]: calculateMinMaxValue(period, formMethods.getValues("bookingFrequency")),
                        });
                        return;
                      }
                    });
                  }}>
                  Add Limit
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    />
  );
}

export default PeriodBookingLimit;
