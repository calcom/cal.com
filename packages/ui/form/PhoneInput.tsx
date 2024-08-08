import type { CountryCode } from "libphonenumber-js";
import {
  isSupportedCountry,
  parsePhoneNumberFromString,
  getCountryCallingCode,
  getExampleNumber,
} from "libphonenumber-js";
import examples from "libphonenumber-js/examples.mobile.json";
import { useState, useEffect } from "react";
import type { CountryData } from "react-phone-input-2";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

import { classNames } from "@calcom/lib";
import { trpc } from "@calcom/trpc/react";

export type PhoneInputProps = {
  value?: string;
  id?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  name?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

function BasePhoneInput({ name, className = "", onChange, value, ...rest }: PhoneInputProps) {
  const defaultCountry = useDefaultCountry();
  const defaultDialCode = getCountryCallingCode(defaultCountry.toUpperCase() as CountryCode) as string;
  const [selectedDialCode, setSelectedDialCode] = useState(defaultDialCode);
  const [selectedCountryCode, setSelectedCountryCode] = useState(defaultCountry);

  // Type guard to check for CountryData type
  const isCountryData = (data: CountryData | unknown): data is CountryData => {
    return (data as CountryData).dialCode !== undefined;
  };

  // This function prefixes dialing code based on country selection only for AutoFill scenario.
  // This prevents wrong detection of intended country.
  const onCountryChange = (value: string) => {
    let updatedValue = `+${value}`;
    const phoneNumber = parsePhoneNumberFromString(updatedValue);
    const isValidPhoneNumber = phoneNumber?.isValid();

    // Prefix the dialing code only for AutoFill and Copy/Paste scenarios.
    // Below condition ensures that dialing code will be prefixed only in case of :
    // User has input a valid length of national number for selected/detected country (initially default country).
    if (!!value && !isValidPhoneNumber) {
      const validNationalNumberLength = getValidNumberLengthForCountry(selectedCountryCode);
      const actualInputNumberLength = value.replace(/\D/g, "").length;
      if (validNationalNumberLength === actualInputNumberLength) {
        const newValue = `+${selectedDialCode}${value}`;
        const phoneNumber = parsePhoneNumberFromString(newValue);
        // if resulting prefix is valid phone number, then only go ahead.
        if (phoneNumber?.isValid()) {
          updatedValue = newValue;
        }
      }
    }
    return updatedValue;
  };

  return (
    <PhoneInput
      {...rest}
      value={value ? value.trim().replace(/^\+?/, "+") : undefined}
      country={value ? undefined : defaultCountry}
      enableSearch
      disableSearchIcon
      inputProps={{
        name: name,
        required: rest.required,
        placeholder: rest.placeholder,
      }}
      onChange={(value, data) => {
        onChange(onCountryChange(value));
        setSelectedDialCode(isCountryData(data) ? data?.dialCode : "");
        setSelectedCountryCode(isCountryData(data) ? data?.countryCode : "");
      }}
      containerClass={classNames(
        "hover:border-emphasis dark:focus:border-emphasis border-default !bg-default rounded-md border focus-within:outline-none focus-within:ring-2 focus-within:ring-brand-default disabled:cursor-not-allowed",
        className
      )}
      inputClass="text-sm focus:ring-0 !bg-default text-default"
      buttonClass="text-emphasis !bg-default hover:!bg-emphasis"
      searchClass="!text-default !bg-default hover:!bg-emphasis"
      dropdownClass="!text-default !bg-default"
      inputStyle={{ width: "inherit", border: 0 }}
      searchStyle={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        padding: "6px 12px",
        gap: "8px",
        width: "296px",
        height: "28px",
        marginLeft: "-4px",
      }}
      dropdownStyle={{ width: "max-content" }}
    />
  );
}

const useDefaultCountry = () => {
  const [defaultCountry, setDefaultCountry] = useState("us");
  const query = trpc.viewer.public.countryCode.useQuery(undefined, {
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });

  useEffect(
    function refactorMeWithoutEffect() {
      const data = query.data;
      if (!data?.countryCode) {
        return;
      }

      isSupportedCountry(data?.countryCode)
        ? setDefaultCountry(data.countryCode.toLowerCase())
        : setDefaultCountry(navigator.language.split("-")[1]?.toLowerCase() || "us");
    },
    [query.data]
  );

  return defaultCountry;
};

function getValidNumberLengthForCountry(countryCode: string): number | null {
  // Get an example number for the given country
  const exampleNumber = getExampleNumber(countryCode.toUpperCase() as CountryCode, examples);
  if (!exampleNumber) {
    return null;
  }
  const nationalNumber = exampleNumber.nationalNumber;
  return nationalNumber.length;
}

export default BasePhoneInput;
