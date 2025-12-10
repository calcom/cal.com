"use client";

import { useIsPlatform } from "@calcom/atoms/hooks/useIsPlatform";

import type { PhoneInputProps } from "./PhoneInput";
import { PhoneInputPlatformWrapper } from "./PhoneInputPlatformWrapper";
import { PhoneInputWebWrapper } from "./PhoneInputWebWrapper";

export default function PhoneInputWrapper(props: Omit<PhoneInputProps, "defaultCountry">) {
  const isPlatform = useIsPlatform();

  if (isPlatform) {
    return <PhoneInputPlatformWrapper {...props} />;
  }

  return <PhoneInputWebWrapper {...props} />;
}

export { PhoneInputProps };
