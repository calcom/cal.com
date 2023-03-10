import { isSupportedCountry } from "libphonenumber-js";
import { useState } from "react";
import BasePhoneInput from "react-phone-number-input";
import type { Props, Country } from "react-phone-number-input";
import "react-phone-number-input/style.css";

import { trpc } from "@calcom/trpc/react";

export type PhoneInputProps = Props<{
  value: string;
  id?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  name?: string;
}>;

function PhoneInput({ name, className = "", onChange, ...rest }: PhoneInputProps) {
  const defaultCountry = useDefaultCountry();

  return (
    <BasePhoneInput
      {...rest}
      international
      defaultCountry={defaultCountry}
      name={name}
      onChange={onChange}
      countrySelectProps={{ className: "text-emphasis" }}
      numberInputProps={{
        className: "border-0 text-sm focus:ring-0 dark:bg-darkgray-100 dark:placeholder:text-darkgray-600",
      }}
      className={`${className} focus-within:border-brand-default dark:bg-darkgray-100 dark:border-darkgray-300 border-default disabled:text-subtle disabled:dark:text-subtle dark:text-inverted block w-full rounded-md rounded-sm border border py-px pl-3 ring-black focus-within:ring-1 disabled:opacity-50 dark:selection:bg-green-500`}
    />
  );
}

const useDefaultCountry = () => {
  const [defaultCountry, setDefaultCountry] = useState<Country>("US");
  trpc.viewer.public.countryCode.useQuery(undefined, {
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    onSuccess: (data) => {
      if (isSupportedCountry(data?.countryCode)) {
        setDefaultCountry(data.countryCode as Country);
      }
    },
  });

  return defaultCountry;
};

export default PhoneInput;
