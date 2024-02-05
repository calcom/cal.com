import type { UseFormReturn } from "react-hook-form";
import { Controller } from "react-hook-form";

import { SettingsToggle } from "@calcom/ui";

import type { FormValues } from "../../types";

type RequiresBookerEmailVerificationProps = {
  formMethods: UseFormReturn<FormValues, any>;
  defaultValue?: boolean;
  shouldLockDisableProps: (fieldName: string) => {
    disabled: boolean;
    LockedIcon: false | JSX.Element;
  };
};

export function RequiresBookerEmailVerification({
  formMethods,
  defaultValue,
  shouldLockDisableProps,
}: RequiresBookerEmailVerificationProps) {
  return (
    <Controller
      name="requiresBookerEmailVerification"
      control={formMethods.control}
      defaultValue={defaultValue}
      render={({ field: { value, onChange } }) => (
        <SettingsToggle
          labelClassName="text-sm"
          toggleSwitchAtTheEnd={true}
          switchContainerClassName="border-subtle rounded-lg border py-6 px-4 sm:px-6"
          title="Requires booker email verification"
          {...shouldLockDisableProps("requiresBookerEmailVerification")}
          description="To ensure booker's email verification before scheduling events"
          checked={value}
          onCheckedChange={(e) => onChange(e)}
        />
      )}
    />
  );
}
