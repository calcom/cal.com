import { useEffect, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";

import type { FormValues } from "@calcom/features/eventtypes/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { SettingsToggle, TextField } from "@calcom/ui/components/form";

type minimumRescheduleNoticeLockedProps = {
  disabled: boolean;
  LockedIcon: false | JSX.Element;
  isLocked: boolean;
};

export default function MinimumRescheduleNoticeController({
  minimumRescheduleNoticeLocked,
}: {
  minimumRescheduleNoticeLocked: minimumRescheduleNoticeLockedProps;
}) {
  const { t } = useLocale();
  const formMethods = useFormContext<FormValues>();

  const [minimumRescheduleNoticeToggle, setMinimumRescheduleNoticeToggle] = useState(
    formMethods.getValues("minimumRescheduleNotice") !== null
  );

  // Watch form value to sync local input state
  const formValue = formMethods.watch("minimumRescheduleNotice");

  // Local state for input value to allow temporary empty state while typing
  const [inputValue, setInputValue] = useState<string>(formValue?.toString() ?? "");

  // Sync local state when form value changes externally
  useEffect(() => {
    setInputValue(formValue?.toString() ?? "");
  }, [formValue]);

  return (
    <Controller
      name="minimumRescheduleNotice"
      render={({ field: { value, onChange } }) => {
        const isChecked = minimumRescheduleNoticeToggle;

        return (
          <SettingsToggle
            labelClassName="text-sm"
            toggleSwitchAtTheEnd={true}
            switchContainerClassName={classNames(
              "border-subtle mt-6 rounded-lg border py-6 px-4 sm:px-6",
              isChecked && "rounded-b-none"
            )}
            childrenClassName="lg:ml-0"
            title={t("minimum_reschedule_notice")}
            description={t("minimum_reschedule_notice_description")}
            {...minimumRescheduleNoticeLocked}
            checked={isChecked}
            onCheckedChange={(active) => {
              setMinimumRescheduleNoticeToggle(active ?? false);
              if (active) {
                // Set default to 0 when enabling (user can then set their preferred value)
                onChange(0);
                setInputValue("0");
              } else {
                onChange(null);
                setInputValue("");
              }
            }}>
            <div className="border-subtle rounded-b-lg border border-t-0 p-6">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <TextField
                    id="minimumRescheduleNotice"
                    type="number"
                    min={0}
                    disabled={minimumRescheduleNoticeLocked.disabled}
                    value={inputValue}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setInputValue(newValue); // Update local state immediately for responsive typing
                      // Update form value only if valid number
                      if (newValue === "") {
                        // Allow empty input while typing - don't update form value yet
                        return;
                      }
                      const numValue = parseInt(newValue, 10);
                      if (!isNaN(numValue) && numValue >= 0) {
                        onChange(numValue);
                      }
                    }}
                    onBlur={() => {
                      // When user leaves the field, normalize empty input to 0
                      if (inputValue === "" || inputValue === "0") {
                        onChange(0);
                        setInputValue("0");
                      } else {
                        // Ensure form value matches input value
                        const numValue = parseInt(inputValue, 10);
                        if (!isNaN(numValue) && numValue >= 0) {
                          onChange(numValue);
                        } else {
                          // Invalid input, reset to 0
                          onChange(0);
                          setInputValue("0");
                        }
                      }
                    }}
                    placeholder="0"
                    className="w-32"
                  />
                  <span className="text-subtle text-sm">{t("minutes")}</span>
                </div>
              </div>
            </div>
          </SettingsToggle>
        );
      }}
    />
  );
}
