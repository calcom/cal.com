import type { UseFormReturn } from "react-hook-form";
import { Controller } from "react-hook-form";

import { SettingsToggle } from "@calcom/ui";

import type { FormValues } from "../../types";

type HideCalendarNotesProps = {
  formMethods: UseFormReturn<FormValues, any>;
  defaultValue?: boolean;
  shouldLockDisableProps: (fieldName: string) => {
    disabled: boolean;
    LockedIcon: false | JSX.Element;
  };
};

export function HideCalendarNotes({
  formMethods,
  defaultValue,
  shouldLockDisableProps,
}: HideCalendarNotesProps) {
  return (
    <Controller
      name="hideCalendarNotes"
      control={formMethods.control}
      defaultValue={defaultValue}
      render={({ field: { value, onChange } }) => (
        <SettingsToggle
          labelClassName="text-sm"
          toggleSwitchAtTheEnd={true}
          switchContainerClassName="border-subtle rounded-lg border py-6 px-4 sm:px-6"
          title="Hide notes in calendar"
          {...shouldLockDisableProps("hideCalendarNotes")}
          description="For privacy reasons, additional inputs and notes will be hidden in the calendar entry. They will still be sent to your email."
          checked={value}
          onCheckedChange={(e) => onChange(e)}
        />
      )}
    />
  );
}
