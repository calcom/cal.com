import React from "react";
import { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import type { UseFormRegisterReturn } from "react-hook-form";

import { Select, InputField } from "@calcom/ui";

import convertToNewDurationType from "../../lib/convertToNewDurationType";
import findDurationType from "../../lib/findDurationType";
import { durationTypeOptions } from "../../lib/limitsUtils";
import type { FormValues, DurationType } from "../../types";

export const MinimumBookingNoticeInput = React.forwardRef<
  HTMLInputElement,
  Omit<UseFormRegisterReturn<"minimumBookingNotice">, "ref">
>(function MinimumBookingNoticeInput({ ...passThroughProps }, ref) {
  const { setValue, getValues } = useFormContext<FormValues>();

  const [minimumBookingNoticeDisplayValues, setMinimumBookingNoticeDisplayValues] = useState<{
    type: DurationType;
    value: number;
  }>({
    type: findDurationType(getValues(passThroughProps.name)),
    value: convertToNewDurationType(
      "minutes",
      findDurationType(getValues(passThroughProps.name)),
      getValues(passThroughProps.name)
    ),
  });
  // keep hidden field in sync with minimumBookingNoticeDisplayValues
  useEffect(() => {
    setValue(
      passThroughProps.name,
      convertToNewDurationType(
        minimumBookingNoticeDisplayValues.type,
        "minutes",
        minimumBookingNoticeDisplayValues.value
      )
    );
  }, [minimumBookingNoticeDisplayValues, setValue, passThroughProps.name]);

  return (
    <div className="flex items-end justify-end">
      <div className="w-1/2 md:w-full">
        <InputField
          required
          disabled={passThroughProps.disabled}
          defaultValue={minimumBookingNoticeDisplayValues.value}
          onChange={(e) =>
            setMinimumBookingNoticeDisplayValues({
              ...minimumBookingNoticeDisplayValues,
              value: parseInt(e.target.value || "0", 10),
            })
          }
          label="Minimum Notice"
          type="number"
          placeholder="0"
          min={0}
          className="mb-0 h-9 rounded-[4px] ltr:mr-2 rtl:ml-2"
        />
        <input type="hidden" ref={ref} {...passThroughProps} />
      </div>
      <Select
        isSearchable={false}
        isDisabled={passThroughProps.disabled}
        className="mb-0 ml-2 h-9 w-full capitalize md:min-w-[150px] md:max-w-[200px]"
        defaultValue={durationTypeOptions.find(
          (option) => option.value === minimumBookingNoticeDisplayValues.type
        )}
        onChange={(input) => {
          if (input) {
            setMinimumBookingNoticeDisplayValues({
              ...minimumBookingNoticeDisplayValues,
              type: input.value,
            });
          }
        }}
        options={durationTypeOptions}
      />
    </div>
  );
});
