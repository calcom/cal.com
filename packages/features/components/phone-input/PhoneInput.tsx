"use client";

import { isSupportedCountry } from "libphonenumber-js";
import moment from "moment-timezone";
import { useState, useEffect, useMemo } from "react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

import { useIsPlatform } from "@calcom/atoms/hooks/useIsPlatform";
import { useBookerTime } from "@calcom/features/bookings/Booker/components/hooks/useBookerTime";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";

declare module "moment-timezone" {
  interface MomentZone {
    countries(): string[];
  }
}
export type PhoneInputProps = {
  value?: string;
  id?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  name?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  defaultCountry?: string;
  autoFormat?: boolean;
};

function BasePhoneInput({
  name,
  className = "",
  onChange,
  value,
  defaultCountry = "us",
  autoFormat = true,
  ...rest
}: PhoneInputProps) {
  const isPlatform = useIsPlatform();

  if (!isPlatform) {
    return (
      <BasePhoneInputWeb
        name={name}
        className={className}
        onChange={onChange}
        value={value}
        autoFormat={autoFormat}
        {...rest}
      />
    );
  }

  return (
    <PhoneInput
      {...rest}
      value={value ? value.trim().replace(/^\+?/, "+") : undefined}
      enableSearch
      disableSearchIcon
      country={defaultCountry}
      autoFormat={autoFormat}
      inputProps={{
        name: name,
        required: rest.required,
        placeholder: rest.placeholder,
      }}
      onChange={(value) => {
        onChange(`+${value}`);
      }}
      containerClass={classNames(
        "hover:border-emphasis dark:focus:border-emphasis border-default !bg-default rounded-md border focus-within:outline-none focus-within:ring-2 focus-within:ring-brand-default disabled:cursor-not-allowed",
        className
      )}
      inputClass="text-sm focus:ring-0 !bg-default text-default placeholder:text-muted"
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

function BasePhoneInputWeb({
  name,
  className = "",
  onChange,
  value,
  ...rest
}: Omit<PhoneInputProps, "defaultCountry">) {
  const defaultCountry = useDefaultCountry();
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
      onChange={(value) => {
        onChange(`+${value}`);
      }}
      containerClass={classNames(
        "hover:border-emphasis dark:focus:border-emphasis border-default !bg-default rounded-md border focus-within:outline-none focus-within:ring-2 focus-within:ring-brand-default disabled:cursor-not-allowed",
        className
      )}
      inputClass="text-sm focus:ring-0 !bg-default text-default placeholder:text-muted"
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
  const { timezone } = useBookerTime();

  const [defaultCountry, setDefaultCountry] = useState("in");

  // Get country codes for the timezone using moment-timezone
  const countryCodes = useMemo(() => moment.tz.zone(timezone)?.countries?.() || [], [timezone]);
  // Only enable the query if there are multiple country codes or none found
  const shouldFetchCountryCode = countryCodes.length !== 1;

  const query = trpc.viewer.public.countryCode.useQuery(undefined, {
    enabled: shouldFetchCountryCode,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });

  useEffect(
    function refactorMeWithoutEffect() {
      // If we have exactly one country code from timezone, use it directly
      if (countryCodes.length === 1) {
        const countryCode = countryCodes[0];
        isSupportedCountry(countryCode)
          ? setDefaultCountry(countryCode.toLowerCase())
          : setDefaultCountry(navigator.language.split("-")[1]?.toLowerCase() || "in");
        return;
      }

      // Otherwise, use the TRPC query result
      const data = query.data;
      if (!data?.countryCode) {
        return;
      }

      isSupportedCountry(data?.countryCode)
        ? setDefaultCountry(data.countryCode.toLowerCase())
        : setDefaultCountry(navigator.language.split("-")[1]?.toLowerCase() || "in");
    },
    [query.data, countryCodes]
  );

  return defaultCountry;
};

export default BasePhoneInput;
