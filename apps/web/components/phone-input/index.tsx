"use client";

import { useIsPlatform } from "@calcom/atoms/hooks/useIsPlatform";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";

import type { PhoneInputProps } from "./PhoneInput";
import { PhoneInputPlatformWrapper } from "./PhoneInputPlatformWrapper";

/** These are like 40kb that not every user needs */
const PhoneInputWebWrapper: ComponentType<Omit<PhoneInputProps, "defaultCountry">> = dynamic(() =>
  import("./PhoneInputWebWrapper").then((mod) => mod.PhoneInputWebWrapper)
);

export default function PhoneInputWrapper(props: Omit<PhoneInputProps, "defaultCountry">): JSX.Element {
  const isPlatform = useIsPlatform();

  if (isPlatform) {
    return <PhoneInputPlatformWrapper {...props} />;
  }

  return <PhoneInputWebWrapper {...props} />;
}

export type { PhoneInputProps };
