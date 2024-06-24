import React, { useEffect, useState } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { useFormContext } from "react-hook-form";

import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import type { DurationType } from "@calcom/lib/convertToNewDurationType";
import convertToNewDurationType from "@calcom/lib/convertToNewDurationType";
import findDurationType from "@calcom/lib/findDurationType";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { InputField, Select } from "@calcom/ui";

type MinimumBookingFields = "minimumBookingNotice" | "seatsMinimumBookingNotice";

// Define a generic type for the props, allowing dynamic passing of the `name` field
type MinimumBookingNoticeInputProps<T extends MinimumBookingFields> = {
  name: T;
} & Omit<UseFormRegisterReturn<T>, "ref">;

export const MinimumBookingNoticeInput = React.forwardRef<
  HTMLInputElement,
  MinimumBookingNoticeInputProps<MinimumBookingFields> & { hint?: React.ReactNode; placeholder?: string }
>(function MinimumBookingNoticeInput({ name, hint, placeholder, ...passThroughProps }, ref) {
  const { t } = useLocale();
  const { setValue, getValues } = useFormContext<FormValues>();
  const durationTypeOptions: {
    value: DurationType;
    label: string;
  }[] = [
    { label: t("minutes"), value: "minutes" },
    { label: t("hours"), value: "hours" },
    { label: t("days"), value: "days" },
  ];

  const initialValue = getValues(name);

  const [minimumBookingNoticeDisplayValues, setMinimumBookingNoticeDisplayValues] = useState<{
    type: DurationType;
    value: number | null;
  }>({
    type: initialValue === null ? "minutes" : findDurationType(initialValue),
    value:
      initialValue === null
        ? null
        : convertToNewDurationType("minutes", findDurationType(initialValue), initialValue),
  });

  useEffect(() => {
    if (minimumBookingNoticeDisplayValues.value === null) {
      setValue(name, null, { shouldDirty: true });
      return;
    }
    setValue(
      name,
      convertToNewDurationType(
        minimumBookingNoticeDisplayValues.type,
        "minutes",
        minimumBookingNoticeDisplayValues.value
      ),
      { shouldDirty: true }
    );
  }, [minimumBookingNoticeDisplayValues, setValue, name]);

  return (
    <div className="flex items-start justify-end">
      <div className="w-1/2 md:w-full">
        <InputField
          required={passThroughProps.required}
          disabled={passThroughProps.disabled}
          defaultValue={minimumBookingNoticeDisplayValues.value ?? ""}
          onChange={(e) => {
            const value = e.target.value === "" ? null : parseInt(e.target.value ?? "0", 10);
            setMinimumBookingNoticeDisplayValues({
              ...minimumBookingNoticeDisplayValues,
              value,
            });
          }}
          label={t("minimum_booking_notice")}
          type="number"
          min={0}
          className="mb-0 h-9 rounded-[4px] ltr:mr-2 rtl:ml-2"
          placeholder={placeholder}
          hint={hint}
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
