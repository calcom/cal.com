"use client";

import { isSupportedCountry } from "libphonenumber-js";
import { useState, useEffect } from "react";

import { trpc } from "@calcom/trpc/react";

import BasePhoneInput, { type PhoneInputProps } from "./PhoneInput";

export function PhoneInputWebWrapper(props: Omit<PhoneInputProps, "defaultCountry">) {
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

      if (isSupportedCountry(data.countryCode)) {
        setDefaultCountry(data.countryCode.toLowerCase());
      } else {
        setDefaultCountry(navigator.language.split("-")[1]?.toLowerCase() || "us");
      }
    },
    [query.data]
  );

  return <BasePhoneInput {...props} defaultCountry={defaultCountry} />;
}

export default PhoneInputWebWrapper;
