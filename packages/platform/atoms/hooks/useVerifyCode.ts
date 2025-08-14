import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiResponse, ApiErrorResponse, ApiSuccessResponse } from "@calcom/platform-types";

import http from "../lib/http";
import { useAtomsContext } from "./useAtomsContext";

export type UseVerifyCodeReturnType = ReturnType<typeof useVerifyCode>;

type UseVerifyCodeProps = {
  onSuccess: (isVerified: boolean) => void;
};

interface VerifyEmailInput {
  email: string;
  code: string;
}

interface VerifyEmailResponse {
  verified: boolean;
}

export const useVerifyCode = ({ onSuccess }: UseVerifyCodeProps) => {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const [value, setValue] = useState("");
  const [hasVerified, setHasVerified] = useState(false);
  const { isInit } = useAtomsContext();

  const verifyCodeMutation = useMutation<
    ApiSuccessResponse<VerifyEmailResponse>,
    ApiErrorResponse,
    VerifyEmailInput
  >({
    mutationFn: (props: VerifyEmailInput) => {
      return http
        .post<ApiResponse<{ verified: boolean }>>("/atoms/verification/email/verify-code", props)
        .then((res) => {
          if (res.data.status === SUCCESS_STATUS) {
            return res.data;
          }
          throw new Error(res.data.error?.message || "Invalid verification code");
        });
    },
    enabled: isInit,
    onSuccess: (data) => {
      setIsPending(false);
      setHasVerified(data.data.verified);
      onSuccess(data.data.verified);
    },
    onError: (err) => {
      setIsPending(false);
      setHasVerified(false);
      if (err.error?.message?.includes("invalid") || err.error?.message?.includes("Invalid")) {
        setError("Code provided is invalid");
      } else {
        setError(err.error?.message || "Verification failed");
      }
    },
  });

  const verifyCodeWithSessionRequired = (code: string, email: string) => {
    setIsPending(true);
    setError("");
    verifyCodeMutation.mutate({ code, email });
  };

  const verifyCodeWithSessionNotRequired = (code: string, email: string) => {
    verifyCodeWithSessionRequired(code, email);
  };

  return {
    verifyCodeWithSessionRequired,
    verifyCodeWithSessionNotRequired,
    isPending,
    setIsPending,
    error,
    value,
    hasVerified,
    setValue,
    setHasVerified,
    resetErrors: () => setError(""),
  };
};
