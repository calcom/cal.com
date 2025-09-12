import { Badge } from "@calid/features/ui/components/badge";
import { Button } from "@calid/features/ui/components/button";
import { Input } from "@calid/features/ui/components/input/input";
import { PhoneInput } from "@calid/features/ui/components/input/phone-input";
import { Label } from "@calid/features/ui/components/label";
import { isValidPhoneNumber } from "libphonenumber-js";
import React from "react";
import type { UseFormGetValues, UseFormSetValue } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { usePhoneNumberVerification } from "@calcom/lib/hooks/usePhoneVerification";

interface PhoneNumberFieldProps<T extends Record<string, any>> {
  // Form methods
  getValue: () => string;
  setValue: (value: string, options?: { shouldDirty?: boolean }) => void;
  getValues: UseFormGetValues<T>;
  defaultValues: T;

  // Configuration
  isRequired?: boolean;
  allowDelete?: boolean;
  hasExistingNumber?: boolean;
  isNumberVerificationRequired?: boolean; // New prop to control OTP verification

  // Error handling
  errorMessage?: string;

  // Callbacks
  onDeleteNumber?: () => void;

  // Field name for form integration
  fieldName?: string;
}

export function PhoneNumberField<T extends Record<string, any>>({
  getValue,
  setValue,
  getValues,
  defaultValues,
  isRequired = false,
  allowDelete = false,
  hasExistingNumber = false,
  isNumberVerificationRequired = true, // Default to true for backward compatibility
  errorMessage,
  onDeleteNumber,
  fieldName = "metadata.phoneNumber",
}: PhoneNumberFieldProps<T>) {
  const { t } = useLocale();

  const {
    otpSent,
    verificationCode,
    setVerificationCode,
    numberVerified,
    setNumberVerified,
    isNumberValid,
    setIsNumberValid,
    getNumberVerificationStatus,
    sendVerificationCode,
    verifyPhoneNumber,
    isSendingCode,
    isVerifying,
  } = usePhoneNumberVerification<T>({
    getValues,
    defaultValues,
  });

  const handlePhoneNumberChange = (val: string | undefined) => {
    const phoneNumber = val || "";
    setValue(phoneNumber, { shouldDirty: true });
    setIsNumberValid(isValidPhoneNumber(phoneNumber));

    // If verification is not required, consider the number verified when it's valid
    if (!isNumberVerificationRequired && isValidPhoneNumber(phoneNumber)) {
      setNumberVerified(true);
    } else {
      setNumberVerified(getNumberVerificationStatus(phoneNumber));
    }
  };

  const handleSendCode = () => {
    sendVerificationCode({
      phoneNumber: getValue(),
    });
  };

  const handleVerifyCode = () => {
    verifyPhoneNumber({
      phoneNumber: getValue() || "",
      code: verificationCode,
      teamId: undefined,
    });
  };

  const handleDeleteNumber = () => {
    setValue("", { shouldDirty: true });
    setIsNumberValid(false);
    onDeleteNumber?.();
  };

  return (
    <div className="w-full">
      <Label className="flex">
        <p className="text-sm">
          {t("phone_number")}
          {isRequired && <span className="ml-1 text-red-500">*</span>}
        </p>
        {/* <InfoBadge content={t("number_in_international_format")} /> */}
      </Label>

      <div className="flex gap-3">
        <div className="w-full md:w-1/3">
          <PhoneInput value={getValue()} onChange={handlePhoneNumberChange} />
        </div>

        <Button
          color="secondary"
          className="-ml-[2px] h-[38px] min-w-fit py-0 sm:block"
          disabled={!isNumberValid || numberVerified || !isNumberVerificationRequired}
          loading={isSendingCode}
          onClick={handleSendCode}
          style={{ display: isNumberVerificationRequired ? "block" : "none" }}>
          {t("send_code")}
        </Button>

        {allowDelete && isNumberValid && hasExistingNumber && (
          <Button
            color="destructive"
            className="-ml-[2px] h-[38px] min-w-fit py-0 sm:block"
            disabled={!isNumberValid}
            onClick={handleDeleteNumber}>
            {t("delete")}
          </Button>
        )}
      </div>

      {errorMessage && <div className="mt-1 text-sm text-red-600">{errorMessage}</div>}

      {numberVerified ? (
        <div className="mt-1">
          <Badge variant="success">
            {isNumberVerificationRequired ? t("number_verified") : t("number_valid")}
          </Badge>
        </div>
      ) : isNumberVerificationRequired ? (
        <div className="mt-3 flex gap-3">
          <Input
            className="h-[38px] w-full"
            placeholder="Verification code"
            disabled={otpSent === false || isVerifying}
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            required={isRequired}
          />
          <Button
            color="secondary"
            className="-ml-[2px] h-[38px] min-w-fit py-0 sm:block"
            disabled={!verificationCode}
            loading={isVerifying}
            onClick={handleVerifyCode}>
            {t("verify")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

// Utility hook for form integration
export function usePhoneNumberField<T extends Record<string, any>>(
  formMethods: {
    getValues: UseFormGetValues<T>;
    setValue: UseFormSetValue<T>;
  },
  defaultValues: T,
  fieldPath = "metadata.phoneNumber"
) {
  const getValue = () => {
    const keys = fieldPath.split(".");
    let value: any = formMethods.getValues();
    for (const key of keys) {
      value = value?.[key];
    }
    return value || "";
  };

  const setValue = (value: string, options?: { shouldDirty?: boolean }) => {
    const keys = fieldPath.split(".");
    if (keys.length === 1) {
      formMethods.setValue(keys[0] as any, value, options);
    } else if (keys.length === 2) {
      formMethods.setValue(`${keys[0]}.${keys[1]}` as any, value, options);
    }
    // Add more cases if needed for deeper nesting
  };

  return { getValue, setValue };
}

export function isPhoneNumberComplete(
  phoneNumber: string,
  isNumberVerificationRequired = true,
  numberVerified = false
): boolean {
  const isValid = isValidPhoneNumber(phoneNumber);

  if (!isValid) return false;

  if (isNumberVerificationRequired) {
    return numberVerified;
  }

  return true;
}
