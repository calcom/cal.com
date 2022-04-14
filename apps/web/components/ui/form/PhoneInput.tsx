import BasePhoneInput, { Props } from "react-phone-number-input/react-hook-form";
import "react-phone-number-input/style.css";

import classNames from "@lib/classNames";

export type PhoneInputProps<FormValues> = Props<
  {
    value: string;
    id: string;
    placeholder: string;
    required: boolean;
  },
  FormValues
>;

function PhoneInput<FormValues>({ control, name, ...rest }: PhoneInputProps<FormValues>) {
  return (
    <BasePhoneInput
      {...rest}
      name={name}
      control={control}
      className={classNames(
        "border-1 focus-within:border-brand block w-full rounded-sm border border-gray-300 py-px px-3 shadow-sm ring-black focus-within:ring-1 dark:border-black dark:bg-black dark:text-white",
        rest.disabled ? "bg-gray-200 dark:text-gray-500" : ""
      )}
    />
  );
}

export default PhoneInput;
