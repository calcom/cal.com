import type { InputProps } from "event-type/components/location-input/organization-input-type/text";
import { Controller } from "react-hook-form";

import { PhoneInput } from "@calcom/ui";

export function Phone({
  formMethods,
  name,
  defaultValue,
  inputName,
  inputPlaceholder,
  otherProps,
}: InputProps) {
  return (
    <Controller
      control={formMethods.control}
      name={name}
      defaultValue={defaultValue}
      render={({ field: { onChange, value } }) => {
        return (
          <PhoneInput
            required
            placeholder={inputPlaceholder}
            name={inputName}
            value={value}
            onChange={onChange}
            {...otherProps}
          />
        );
      }}
    />
  );
}
