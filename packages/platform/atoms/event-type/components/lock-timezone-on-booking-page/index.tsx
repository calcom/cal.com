import type { UseFormReturn } from "react-hook-form";
import { Controller } from "react-hook-form";

import { SettingsToggle } from "@calcom/ui";

import type { FormValues } from "../../types";

type LockTimeZoneToggleOnBookingPageProps = {
  formMethods: UseFormReturn<FormValues, any>;
  defaultValue?: boolean;
  shouldLockDisableProps: (fieldName: string) => {
    disabled: boolean;
    LockedIcon: false | JSX.Element;
  };
};

export function LockTimeZoneToggleOnBookingPage({
  formMethods,
  defaultValue,
  shouldLockDisableProps,
}: LockTimeZoneToggleOnBookingPageProps) {
  return (
    <Controller
      name="lockTimeZoneToggleOnBookingPage"
      control={formMethods.control}
      defaultValue={defaultValue}
      render={({ field: { value, onChange } }) => (
        <SettingsToggle
          labelClassName="text-sm"
          toggleSwitchAtTheEnd={true}
          switchContainerClassName="border-subtle rounded-lg border py-6 px-4 sm:px-6"
          title="Lock timezone on booking page"
          {...shouldLockDisableProps("lockTimeZoneToggleOnBookingPage")}
          description="To lock the timezone on booking page, useful for in-person events."
          checked={value}
          onCheckedChange={(e) => onChange(e)}
        />
      )}
    />
  );
}
