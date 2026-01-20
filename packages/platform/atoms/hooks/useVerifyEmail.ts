import { useMutation } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { useBookerStore } from "@calcom/features/bookings/Booker/store";
import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiResponse, ApiErrorResponse, ApiSuccessResponseWithoutData } from "@calcom/platform-types";

import { useMe } from "../hooks/useMe";
import http from "../lib/http";

export interface IUseVerifyEmailProps {
  email: string;
  onVerifyEmail?: () => void;
  name?: string | { firstName: string; lastname?: string };
  requiresBookerEmailVerification?: boolean;
}

export type UseVerifyEmailReturnType = ReturnType<typeof useVerifyEmail>;

interface RequestEmailVerificationInput {
  email: string;
  username?: string;
}

export const useVerifyEmail = ({
  email,
  name,
  requiresBookerEmailVerification,
  onVerifyEmail,
}: IUseVerifyEmailProps) => {
  const [isEmailVerificationModalVisible, setEmailVerificationModalVisible] = useState(false);
  const verifiedEmail = useBookerStore((state) => state.verifiedEmail);
  const setVerifiedEmail = useBookerStore((state) => state.setVerifiedEmail);
  const isRescheduling = useBookerStore((state) => Boolean(state.rescheduleUid && state.bookingData));
  const debouncedEmail = useDebounce(email, 600);
  const { data: user } = useMe();

  const { data: isEmailVerificationRequired } = useQuery<boolean>({
    queryKey: ["isEmailVerificationRequired", debouncedEmail],
    queryFn: () => {
      return http
        ?.get<ApiResponse<boolean>>("/atoms/verification/email/check", {
          params: {
            email: debouncedEmail,
            userSessionEmail: user?.data?.email || "",
          },
        })
        .then((res) => {
          if (res.data.status === SUCCESS_STATUS) {
            return res.data.data;
          }
          throw new Error(res.data.error.message);
        });
    },
    enabled: !!debouncedEmail && !isRescheduling,
  });

  const sendEmailVerificationMutation = useMutation<
    ApiSuccessResponseWithoutData,
    ApiErrorResponse,
    RequestEmailVerificationInput
  >({
    mutationFn: (props: RequestEmailVerificationInput) => {
      return http
        .post<ApiResponse<{ sent: boolean }>>("/atoms/verification/email/send-code", props)
        .then((res) => {
          if (res.data.status === SUCCESS_STATUS) {
            return res.data;
          }
          throw new Error(res.data.error?.message || "Failed to send verification email");
        });
    },
    onSuccess: () => {
      setEmailVerificationModalVisible(true);
    },
    onError: (err) => {
      console.error("Failed to send verification email:", err);
    },
  });

  const handleVerifyEmail = () => {
    onVerifyEmail?.();
    sendEmailVerificationMutation.mutate({
      email,
      username: typeof name === "string" ? name : name?.firstName,
    });
  };

  const isVerificationCodeSending = sendEmailVerificationMutation.isPending;

  const renderConfirmNotVerifyEmailButtonCond =
    isRescheduling ||
    (!requiresBookerEmailVerification && !isEmailVerificationRequired) ||
    (email && verifiedEmail && verifiedEmail === email);

  return {
    handleVerifyEmail,
    isEmailVerificationModalVisible,
    setEmailVerificationModalVisible,
    setVerifiedEmail,
    renderConfirmNotVerifyEmailButtonCond: Boolean(renderConfirmNotVerifyEmailButtonCond),
    isVerificationCodeSending,
  };
};
