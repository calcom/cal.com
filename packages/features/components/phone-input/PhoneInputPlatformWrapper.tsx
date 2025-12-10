"use client";

import { isSupportedCountry } from "libphonenumber-js";
import { useState, useEffect } from "react";

import { useCountryCode } from "@calcom/atoms/hooks/useCountryCode";

import BasePhoneInput, { type PhoneInputProps } from "./PhoneInput";

export function PhoneInputPlatformWrapper(props: Omit<PhoneInputProps, "defaultCountry">) {
  const [defaultCountry, setDefaultCountry] = useState("us");

  const { data: countryCode } = useCountryCode();

  useEffect(() => {
    if (!countryCode) {
      return;
    }

    if (isSupportedCountry(countryCode)) {
      setDefaultCountry(countryCode.toLowerCase());
    } else {
      const browserCountry = navigator.language.split("-").pop()?.toLowerCase();
      setDefaultCountry(browserCountry && isSupportedCountry(browserCountry) ? browserCountry : "us");
    }
  }, [countryCode]);

  return <BasePhoneInput {...props} defaultCountry={defaultCountry} />;
}

export default PhoneInputPlatformWrapper;
