"use client";

import { trpc } from "@calcom/trpc/react";
import { isSupportedCountry } from "libphonenumber-js";
import { useEffect, useState } from "react";
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
        const browserCountry = navigator.language.split("-").pop()?.toUpperCase();
        setDefaultCountry(
          browserCountry && isSupportedCountry(browserCountry) ? browserCountry.toLowerCase() : "us"
        );
      }
    },
    [query.data]
  );

  return <BasePhoneInput {...props} defaultCountry={defaultCountry} />;
}

export default PhoneInputWebWrapper;
