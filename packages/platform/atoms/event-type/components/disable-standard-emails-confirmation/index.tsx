import { Controller, type UseFormReturn } from "react-hook-form";

import { SettingsToggle } from "@calcom/ui";

import type { FormValues } from "../../types";

type DisableStandardEmailsConfirmationProps = {
  formMethods: UseFormReturn<FormValues, any>;
  name: string;
  title: string;
  description: string;
  defaultValue?: boolean;
};

export function DisableStandardEmailsConfirmation({
  formMethods,
  defaultValue,
  name,
  title,
  description,
}: DisableStandardEmailsConfirmationProps) {
  return (
    <>
      <Controller
        name="metadata.disableStandardEmails.confirmation.host"
        control={formMethods.control}
        defaultValue={defaultValue}
        render={({ field: { value, onChange } }) => (
          <>
            <SettingsToggle
              labelClassName="text-sm"
              toggleSwitchAtTheEnd={true}
              switchContainerClassName="border-subtle rounded-lg border py-6 px-4 sm:px-6"
              title={title}
              description={description}
              checked={value || false}
              onCheckedChange={(e) => {
                formMethods.setValue(name, e);
                onChange(e);
              }}
            />
          </>
        )}
      />
    </>
  );
}
