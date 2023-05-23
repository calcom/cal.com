import { isSupportedCountry } from "libphonenumber-js";
import { useState } from "react";
import BasePhoneInput from "react-phone-number-input";
import type { Props, Country } from "react-phone-number-input";
import "react-phone-number-input/style.css";

import { classNames } from "@calcom/lib";
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
      flagUrl="/country-flag-icons/3x2/{XX}.svg"
      international
      defaultCountry={defaultCountry}
      name={name}
      onChange={onChange}
      countrySelectProps={{ className: "text-emphasis" }}
      numberInputProps={{
        className: "border-0 text-sm focus:ring-0 bg-default text-default",
      }}
      className={classNames(
        "hover:border-emphasis border-default bg-default rounded-md border py-px pl-3 focus-within:border-neutral-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-neutral-800 focus-within:ring-offset-1 disabled:cursor-not-allowed",
        className
      )}
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
