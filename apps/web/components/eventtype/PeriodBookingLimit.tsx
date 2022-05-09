import { TrashIcon } from "@heroicons/react/outline";
import { PlusIcon, XIcon } from "@heroicons/react/solid";
import { EventTypeFormType } from "pages/event-types/[type]";
import React, { useMemo } from "react";
import { Controller, useFormContext } from "react-hook-form";
import type { TFunction } from "react-i18next";
import { CrossIcon } from "react-select/dist/declarations/src/components/indicators";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui";

import CheckboxField from "@components/ui/form/CheckboxField";

type Props = {
  visible: boolean;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
};

type Option = {
  readonly label: string;
  readonly value: string;
};
function PeriodSelectionInput({
  key,
  index,
  t,
}: {
  key: string;
  index: number;
  t: TFunction<"common", undefined>;
}) {
  return <></>;
}
function PeriodBookingLimit({ visible, setVisible }: Props) {
  const formMethods = useFormContext<EventTypeFormType>();
  const { t } = useLocale();
  console.log(formMethods.getValues("bookingFrequency"));
  const OPTIONS = useMemo(() => {
    const BASE_OPTIONS: Option[] = [
      // TODO: Filter these so we can't create duplicate entries
      { value: "DAY", label: t("period_label_day") },
      { value: "WEEK", label: t("period_label_week") },
      { value: "MONTH", label: t("period_label_month") },
    ];
    return BASE_OPTIONS;
  }, [t]);

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
                if (value > 0)
                  return (
                    <div className="flex items-center " key={index}>
                      {/* <PeriodSelectionInput key={key} index={index} t={t} /> */}
                      <Controller
                        name={`bookingFrequency.${key}`}
                        render={({ field: { onChange, value } }) => (
                          <input
                            type="number"
                            className="block w-16 rounded-sm border-gray-300 shadow-sm [appearance:textfield] ltr:mr-2 rtl:ml-2 sm:text-sm"
                            placeholder="0"
                            defaultValue={value || 0}
                            onChange={onChange}
                          />
                        )}></Controller>
                      <p className="text-sm text-gray-700">per</p>
                      <select
                        id={`periodBookingSelect-${index}`}
                        className="ml-2 block w-24 rounded-sm border-gray-300 py-2 pl-3 pr-10 text-base focus:outline-none sm:text-sm"
                        defaultValue={key}>
                        <option value="DAY">{t("period_label_day")}</option>
                        <option value="WEEK">{t("period_label_week")}</option>
                        <option value="MONTH">{t("period_label_month")}</option>
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
                        <XIcon className="h-4 w-4"></XIcon>
                      </Button>
                    </div>
                  );
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
                    frequency.forEach((period) => {
                      // Finding a value that hasnt been used already and creating a new input with that period
                      // @ts-ignore
                      if (values[period] === 0) {
                        formMethods.setValue("bookingFrequency", {
                          ...values,
                          [period]: 1,
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
