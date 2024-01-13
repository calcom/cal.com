import type { formMethods } from "event-type/components/location-input";
import { Controller } from "react-hook-form";

import { Input } from "@calcom/ui";

export type InputProps = {
  formMethods: formMethods;
  name: string;
  defaultValue?: string;
  inputName: string;
  inputPlaceholder: string;
  otherProps: object;
};

export function Text({
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
          <Input
            name={inputName}
            placeholder={inputPlaceholder}
            type="text"
            required
            onChange={onChange}
            value={value}
            className="my-0"
            {...otherProps}
          />
        );
      }}
    />
  );
}
