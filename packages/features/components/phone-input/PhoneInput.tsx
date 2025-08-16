"use client";

import { isSupportedCountry } from "libphonenumber-js";
import { useState, useEffect } from "react";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";

import { useIsPlatform } from "@calcom/atoms/hooks/useIsPlatform";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";

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
};

function BasePhoneInput({
  name,
  className = "",
  onChange,
  value,
  defaultCountry = "us",
  ...rest
}: PhoneInputProps) {
  const isPlatform = useIsPlatform();

  if (!isPlatform) {
    return (
      <BasePhoneInputWeb name={name} className={className} onChange={onChange} value={value} {...rest} />
    );
  }

  return (
    <PhoneInput
      {...rest}
      value={value}
      defaultCountry={value ? undefined : defaultCountry}
      inputProps={{
        name: name,
        required: rest.required,
        placeholder: rest.placeholder,
      }}
      onChange={(value) => {
        onChange(`${value}`);
      }}
      style={{ padding: "0px 12px" }}
      className={classNames(
        "hover:border-emphasis dark:focus:border-emphasis border-default !bg-default focus-within:ring-brand-default rounded-md border  focus-within:outline-none disabled:cursor-not-allowed",
        className
      )}
      inputClassName="text-sm focus:ring-0 !bg-default text-default placeholder:text-muted"
      countrySelectorStyleProps={{
        buttonClassName: "text-emphasis !bg-default ",
        buttonStyle: {
          border: "1px",
        },
        dropdownStyleProps: {
          listItemClassName: "!text-default !bg-default",
        },
      }}
      inputStyle={{ border: 0, color: "inherit" }}
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
      value={value}
      defaultCountry={value ? undefined : defaultCountry}
      inputProps={{
        name: name,
        required: rest.required,
        placeholder: rest.placeholder,
      }}
      onChange={(value) => {
        onChange(`${value}`);
      }}
      style={{ padding: "0px 12px" }}
      className={classNames(
        "hover:border-emphasis dark:focus:border-emphasis border-default !bg-default focus-within:ring-brand-default rounded-md border  focus-within:outline-none disabled:cursor-not-allowed",
        className
      )}
      inputClassName="text-sm focus:ring-0 !bg-default text-default placeholder:text-muted"
      countrySelectorStyleProps={{
        buttonClassName: "text-emphasis !bg-default ",
        buttonStyle: {
          border: "1px",
        },
        dropdownStyleProps: {
          listItemClassName: "!text-default !bg-default",
        },
      }}
      inputStyle={{ border: 0, color: "inherit" }}
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

export default BasePhoneInput;
