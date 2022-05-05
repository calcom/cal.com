import { TrashIcon } from "@heroicons/react/outline";
import { PlusIcon } from "@heroicons/react/solid";
import { EventTypeFormType } from "pages/event-types/[type]";
import React from "react";
import { Controller, useFormContext } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import showToast from "@calcom/lib/notification";
import { Button } from "@calcom/ui";

import CheckboxField from "@components/ui/form/CheckboxField";

type Props = {
  visible: boolean;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
};

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
              {Object.entries(formMethods.getValues("bookingFrequency") ?? {}).map(([key, value], index) => (
                <div className="flex items-center " key={key}>
                  <input
                    type="number"
                    className="block w-16 rounded-sm border-gray-300 shadow-sm [appearance:textfield] ltr:mr-2 rtl:ml-2 sm:text-sm"
                    placeholder="30"
                    defaultValue={value || 0}
                  />
                  <p className="text-sm text-gray-700">per</p>
                  <select
                    id={`periodBookingSelect-${index}`}
                    className="ml-2 block w-24 rounded-sm border-gray-300 py-2 pl-3 pr-10 text-base focus:outline-none sm:text-sm"
                    defaultValue={key}>
                    <option value="YEAR">{t("period_label_year")}</option>
                    <option value="MONTH">{t("period_label_month")}</option>
                    <option value="WEEK">{t("period_label_week")}</option>
                    <option value="DAY">{t("period_label_day")}</option>
                  </select>
                  <Button
                    color="minimal"
                    className="ml-2 "
                    type="button"
                    onClick={() => {
                      const values = formMethods.getValues("bookingFrequency");
                      // @ts-ignore This key can only be the right type.
                      delete values[key];
                      formMethods.setValue("bookingFrequency", { ...values });
                    }}>
                    <TrashIcon className="h-4 w-4"></TrashIcon>
                  </Button>
                </div>
              ))}

              {Object.keys(formMethods.getValues("bookingFrequency") ?? {}).length !== 4 && (
                <Button
                  color="minimal"
                  className="w-32"
                  type="button"
                  StartIcon={PlusIcon}
                  onClick={() => {
                    const values = formMethods.getValues("bookingFrequency");
                    const frequency = ["YEAR", "MONTH", "WEEK", "DAY"]; // Array in reverse so they get added in the right order
                    if (!values) {
                      // If not values already add day as a default
                      formMethods.setValue("bookingFrequency", {
                        DAY: 0,
                      });
                      return;
                    }
                    frequency.forEach((period) => {
                      // Finding a value that hasnt been used already and creating a new input with that period
                      if (!(period in values)) {
                        formMethods.setValue("bookingFrequency", {
                          ...values,
                          [period]: 0,
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
