"use client";

import { useCountryCode } from "@calcom/atoms/hooks/useCountryCode";
import { isSupportedCountry } from "libphonenumber-js";
import { useEffect, useState } from "react";
import BasePhoneInput, { type PhoneInputProps } from "./PhoneInput";

export function PhoneInputPlatformWrapper(props: Omit<PhoneInputProps, "defaultCountry">): JSX.Element {
  const [defaultCountry, setDefaultCountry] = useState("us");

  const { data: countryCode } = useCountryCode();

  useEffect(() => {
    if (!countryCode) {
      return;
    }

    if (isSupportedCountry(countryCode)) {
      setDefaultCountry(countryCode.toLowerCase());
    } else {
      const browserCountry = navigator.language.split("-").pop()?.toUpperCase();
      if (browserCountry && isSupportedCountry(browserCountry)) {
        setDefaultCountry(browserCountry.toLowerCase());
      } else {
        setDefaultCountry("us");
      }
    }
  }, [countryCode]);

  return <BasePhoneInput {...props} defaultCountry={defaultCountry} />;
}

export default PhoneInputPlatformWrapper;
