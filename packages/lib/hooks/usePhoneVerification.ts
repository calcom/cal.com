import { isValidPhoneNumber } from "libphonenumber-js";
import { useState, useEffect, useCallback, useMemo } from "react";
import type { UseFormGetValues, Path } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { HttpError } from "@calcom/lib/http-error";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";

// Generic type T must have a `metadata.phoneNumber` field
type WithMetadata = {
  metadata?: {
    phoneNumber?: string;
  };
};

export type UsePhoneNumberVerificationProps<T extends WithMetadata> = {
  getValues: UseFormGetValues<T>;
  defaultValues: T;
};

export function usePhoneNumberVerification<T extends WithMetadata>({
  getValues,
  defaultValues,
}: UsePhoneNumberVerificationProps<T>) {
  const { t } = useTranslation();

  const [otpSent, setOtpSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [numberVerified, setNumberVerified] = useState(defaultValues?.metadata?.phoneNumber !== "");
  const [isNumberValid, setIsNumberValid] = useState<boolean>(
    defaultValues?.metadata?.phoneNumber ? isValidPhoneNumber(defaultValues?.metadata?.phoneNumber) : false
  );

  const { data: _verifiedNumbers } = trpc.viewer.workflows.getVerifiedNumbers.useQuery({
    teamId: undefined,
  });

  const verifiedNumbers = useMemo(
    () => _verifiedNumbers?.map((n) => n.phoneNumber) || [],
    [_verifiedNumbers]
  );

  const getNumberVerificationStatus = useCallback(
    (phoneNumber: string) =>
      !!verifiedNumbers.find((n: string) => n.replace(/\s/g, "") === phoneNumber.replace(/\s/g, "")),
    [verifiedNumbers]
  );

  const sendVerificationCodeMutation = trpc.viewer.workflows.sendVerificationCode.useMutation({
    onMutate: () => {
      setOtpSent(false);
      setVerificationCode("");
    },
    onSuccess: () => {
      showToast(t("verification_code_sent"), "success");
      setOtpSent(true);
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const verifyPhoneNumberMutation = trpc.viewer.workflows.verifyPhoneNumber.useMutation({
    onSuccess: (isVerified: boolean) => {
      showToast(isVerified ? t("verified_successfully") : t("wrong_code"), "success");
      setNumberVerified(isVerified);
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.message}`;
        showToast(message, "error");
        setNumberVerified(false);
      }
    },
  });

  useEffect(() => {
    const phoneNumberPath = "metadata.phoneNumber" as Path<T>;
    const number = getValues(phoneNumberPath);
    if (number) {
      setIsNumberValid(isValidPhoneNumber(number as string));
    } else {
      setIsNumberValid(false);
    }
  }, [getValues]);

  return {
    otpSent,
    verificationCode,
    setVerificationCode,
    numberVerified,
    setNumberVerified,
    isNumberValid,
    setIsNumberValid,
    verifiedNumbers,
    getNumberVerificationStatus,
    sendVerificationCode: sendVerificationCodeMutation.mutate,
    verifyPhoneNumber: verifyPhoneNumberMutation.mutate,
    isSendingCode: sendVerificationCodeMutation.isPending,
    isVerifying: verifyPhoneNumberMutation.isPending,
  };
}
