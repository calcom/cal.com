import BasePhoneInput, { Props } from "react-phone-number-input/react-hook-form";
import "react-phone-number-input/style.css";

export type PhoneInputProps<FormValues> = Props<
  {
    value: string;
    id: string;
    placeholder: string;
    required: boolean;
  },
  FormValues
>;

function PhoneInput<FormValues>({ control, name, className, ...rest }: PhoneInputProps<FormValues>) {
  return (
    <BasePhoneInput
      {...rest}
      international
      name={name}
      control={control}
      countrySelectProps={{ className: "text-black" }}
      numberInputProps={{ className: "border-0 text-sm focus:ring-0 dark:bg-gray-700" }}
      className={`${className} border-1 focus-within:border-brand block w-full rounded-sm border border-gray-300 py-px pl-3 ring-black focus-within:ring-1 disabled:text-gray-500 disabled:opacity-50 dark:border-gray-900 dark:bg-gray-700 dark:text-white dark:selection:bg-green-500 disabled:dark:text-gray-500`}
    />
  );
}

export default PhoneInput;
