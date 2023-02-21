import type { Props } from "react-phone-number-input/react-hook-form";
import BasePhoneInput from "react-phone-number-input/react-hook-form";
import "react-phone-number-input/style.css";

export type PhoneInputProps<FormValues> = Props<
  {
    value: string;
    id: string;
    placeholder: string;
    required: boolean;
  },
  FormValues
> & { onChange?: (e: any) => void };

function PhoneInput<FormValues>({
  control,
  name,
  className,
  onChange,
  ...rest
}: PhoneInputProps<FormValues>) {
  return (
    <BasePhoneInput
      {...rest}
      international
      name={name}
      control={control}
      onChange={onChange}
      countrySelectProps={{ className: "text-black" }}
      numberInputProps={{
        className: "border-0 text-sm focus:ring-0 dark:bg-darkgray-100 dark:placeholder:text-darkgray-600",
      }}
      className={`${className} focus-within:border-brand dark:bg-darkgray-100 dark:border-darkgray-300 block w-full rounded-md rounded-sm border border border-gray-300 py-px pl-3 ring-black focus-within:ring-1 disabled:text-gray-500 disabled:opacity-50 dark:text-white dark:selection:bg-green-500 disabled:dark:text-gray-500`}
    />
  );
}

export default PhoneInput;
