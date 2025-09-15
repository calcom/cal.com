import React, { useEffect, useState } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { useFormContext } from "react-hook-form";

import type { DurationType } from "@calcom/lib/convertToNewDurationType";
import convertToNewDurationType from "@calcom/lib/convertToNewDurationType";
import findDurationType from "@calcom/lib/findDurationType";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { InputField, Select } from "@calcom/ui/components/form";

import type { FormValues, SelectClassNames } from "../../../lib/types";

const MinimumCancellationNoticeInput = React.forwardRef<
  HTMLInputElement,
  Omit<UseFormRegisterReturn<"minimumCancellationNotice">, "ref"> & {
    customClassNames?: SelectClassNames & { input?: string };
  }
>(function MinimumCancellationNoticeInput({ customClassNames, ...passThroughProps }, ref) {
  const { t } = useLocale();
  const { setValue, getValues } = useFormContext<FormValues & { minimumCancellationNotice: number }>();
  const durationTypeOptions: {
    value: DurationType;
    label: string;
  }[] = [
    {
      label: t("minutes"),
      value: "minutes",
    },
    {
      label: t("hours"),
      value: "hours",
    },
    {
      label: t("days"),
      value: "days",
    },
  ];

  const [minimumCancellationNoticeDisplayValues, setMinimumCancellationNoticeDisplayValues] = useState<{
    type: DurationType;
    value: number;
  }>({
    type: findDurationType(getValues("minimumCancellationNotice" as any) || 0),
    value: convertToNewDurationType(
      "minutes",
      findDurationType(getValues("minimumCancellationNotice" as any) || 0),
      getValues("minimumCancellationNotice" as any) || 0
    ),
  });

  // keep hidden field in sync with minimumCancellationNoticeDisplayValues
  useEffect(() => {
    setValue(
      "minimumCancellationNotice" as any,
      convertToNewDurationType(
        minimumCancellationNoticeDisplayValues.type,
        "minutes",
        minimumCancellationNoticeDisplayValues.value
      ),
      { shouldDirty: true }
    );
  }, [minimumCancellationNoticeDisplayValues, setValue]);

  return (
    <div className="flex items-end justify-end">
      <div className="w-1/2 md:w-full">
        <InputField
          required
          disabled={passThroughProps.disabled}
          defaultValue={minimumCancellationNoticeDisplayValues.value}
          onChange={(e) =>
            setMinimumCancellationNoticeDisplayValues({
              ...minimumCancellationNoticeDisplayValues,
              value: parseInt(e.target.value || "0", 10),
            })
          }
          label={t("minimum_cancellation_notice")}
          type="number"
          placeholder="0"
          className={classNames("mb-0 h-9 ltr:mr-2 rtl:ml-2", customClassNames?.input)}
          min={0}
        />
        <input type="hidden" ref={ref} {...passThroughProps} />
      </div>
      <Select
        isSearchable={false}
        isDisabled={passThroughProps.disabled}
        className={classNames(
          "mb-0 ml-2 h-9 w-full capitalize md:min-w-[150px] md:max-w-[200px]",
          customClassNames?.select
        )}
        innerClassNames={customClassNames?.innerClassNames}
        defaultValue={durationTypeOptions.find(
          (option) => option.value === minimumCancellationNoticeDisplayValues.type
        )}
        onChange={(input) => {
          if (input) {
            setMinimumCancellationNoticeDisplayValues({
              ...minimumCancellationNoticeDisplayValues,
              type: input.value,
            });
          }
        }}
        options={durationTypeOptions}
      />
    </div>
  );
});

export default MinimumCancellationNoticeInput;