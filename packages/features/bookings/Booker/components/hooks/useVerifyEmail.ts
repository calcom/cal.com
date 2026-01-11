import { useSession } from "next-auth/react";
import { useState } from "react";

import { useBookerStore } from "@calcom/features/bookings/Booker/store";
import { useDebounce } from "@calcom/lib/hooks/useDebounce";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { showToast } from "@calcom/ui/components/toast";

export interface IUseVerifyEmailProps {
  email: string;
  onVerifyEmail?: () => void;
  name?: string | { firstName: string; lastname?: string };
  requiresBookerEmailVerification?: boolean;
}
export type UseVerifyEmailReturnType = ReturnType<typeof useVerifyEmail>;
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
  const { data: session } = useSession();

  const { t, i18n } = useLocale();
  const sendEmailVerificationByCodeMutation = trpc.viewer.auth.sendVerifyEmailCode.useMutation({
    onSuccess: () => {
      setEmailVerificationModalVisible(true);
      showToast(t("email_sent"), "success");
    },
    onError: () => {
      showToast(t("email_not_sent"), "error");
    },
  });

  const { data: isEmailVerificationRequired } =
    trpc.viewer.public.checkIfUserEmailVerificationRequired.useQuery(
      {
        userSessionEmail: session?.user.email || "",
        email: debouncedEmail,
      },
      {
        enabled: !!debouncedEmail && !isRescheduling,
      }
    );

  const handleVerifyEmail = () => {
    onVerifyEmail?.();

    sendEmailVerificationByCodeMutation.mutate({
      email,
      username: typeof name === "string" ? name : name?.firstName,
      language: i18n.language || "en",
    });
  };

  const isVerificationCodeSending = sendEmailVerificationByCodeMutation.isPending;

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
