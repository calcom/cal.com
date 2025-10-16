"use client";

import { isSupportedCountry } from "libphonenumber-js";
import type { CSSProperties } from "react";
import { useState, useEffect } from "react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

import { useIsPlatform } from "@calcom/atoms/hooks/useIsPlatform";
import { reverseGeocode, getCountryFromTimezone } from "@calcom/lib/countryDetection";
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
  inputStyle?: CSSProperties;
  flagButtonStyle?: CSSProperties;
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

  // This is to trigger validation on prefill value changes
  useEffect(() => {
    if (!value) return;

    const sanitized = value
      .trim()
      .replace(/[^\d+]/g, "")
      .replace(/^\++/, "+");

    if (sanitized === "+" || sanitized === "") return;

    if (value !== sanitized) {
      onChange(sanitized);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isPlatform) {
    return (
      <BasePhoneInputWeb name={name} className={className} onChange={onChange} value={value} {...rest} />
    );
  }

  return (
    <PhoneInput
      {...rest}
      value={value ? value.trim().replace(/^\+?/, "+") : undefined}
      enableSearch
      disableSearchIcon
      country={defaultCountry}
      inputProps={{
        name,
        required: rest.required,
        placeholder: rest.placeholder,
      }}
      onChange={(val: string) => {
        onChange(`+${val}`);
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
  inputStyle,
  flagButtonStyle,
  ...rest
}: Omit<PhoneInputProps, "defaultCountry">) {
  const { defaultCountry } = useDefaultCountry();

  return (
    <PhoneInput
      {...rest}
      value={value ? value.trim().replace(/^\+?/, "+") : undefined}
      country={value ? undefined : defaultCountry}
      enableSearch
      disableSearchIcon
      inputProps={{
        name,
        required: rest.required,
        placeholder: rest.placeholder,
      }}
      onChange={(val: string) => {
        onChange(`+${val}`);
      }}
      containerClass={classNames(
        "hover:border-emphasis dark:focus:border-emphasis border-default !bg-default rounded-md border focus-within:outline-none focus-within:ring-2 focus-within:ring-brand-default disabled:cursor-not-allowed",
        className
      )}
      inputClass="text-sm focus:ring-0 !bg-default text-default placeholder:text-muted"
      buttonClass="text-emphasis !bg-default hover:!bg-emphasis"
      buttonStyle={{ ...flagButtonStyle }}
      searchClass="!text-default !bg-default hover:!bg-emphasis"
      dropdownClass="!text-default !bg-default"
      inputStyle={{ width: "inherit", border: 0, ...inputStyle }}
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
  const [isDetecting, setIsDetecting] = useState(true);

  const query = trpc.viewer.public.countryCode.useQuery(undefined, {
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });

  useEffect(
    function detectCountryWithFallbacks() {
      const detectCountry = async () => {
        try {
          // Method 1: Try browser language first (most reliable)
          const browserCountry = navigator.language.split("-")[1]?.toLowerCase();
          if (browserCountry && isSupportedCountry(browserCountry.toUpperCase())) {
            setDefaultCountry(browserCountry);
            setIsDetecting(false);
            return;
          }

          // Method 2: Try timezone-based detection
          const timezoneCountry = getCountryFromTimezone();
          if (timezoneCountry && isSupportedCountry(timezoneCountry)) {
            setDefaultCountry(timezoneCountry.toLowerCase());
            setIsDetecting(false);
            return;
          }

          // Method 3: Try browser geolocation API (with user permission)
          if (navigator.geolocation && "geolocation" in navigator) {
            try {
              const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                  timeout: 5000,
                  enableHighAccuracy: false,
                  maximumAge: 300000,
                });
              });

              const countryCode = await reverseGeocode(position.coords.latitude, position.coords.longitude);
              if (countryCode && isSupportedCountry(countryCode)) {
                setDefaultCountry(countryCode.toLowerCase());
                setIsDetecting(false);
                return;
              }
            } catch (geoError) {
              // Geolocation failed
            }
          }

          // Method 4: Fallback to IP-based detection (least reliable)
          if (query.data?.countryCode && isSupportedCountry(query.data.countryCode)) {
            setDefaultCountry(query.data.countryCode.toLowerCase());
            setIsDetecting(false);
            return;
          }

          setDefaultCountry("us");
          setIsDetecting(false);
        } catch (error) {
          setDefaultCountry("us");
          setIsDetecting(false);
        }
      };

      detectCountry();
    },
    [query.data]
  );

  return { defaultCountry, isDetecting };
};

export default BasePhoneInput;
