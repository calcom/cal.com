import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { useState } from "react";

export type UseVerifyCodeReturnType = ReturnType<typeof useVerifyCode>;

type UseVerifyCodeProps = {
  onSuccess: (isVerified: boolean) => void;
};

export const useVerifyCode = ({ onSuccess }: UseVerifyCodeProps) => {
  const { t } = useLocale();

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const [value, setValue] = useState("");
  const [hasVerified, setHasVerified] = useState(false);

  const verifyCodeMutationUserSessionRequired = trpc.viewer.organizations.verifyCode.useMutation({
    onSuccess: (data) => {
      setIsPending(false);
      onSuccess(data);
    },
    onError: (err) => {
      setIsPending(false);
      setHasVerified(false);
      if (err.message === "invalid_code") {
        setError(t("code_provided_invalid"));
      }
    },
  });

  const verifyCodeMutationUserSessionNotRequired = trpc.viewer.auth.verifyCodeUnAuthenticated.useMutation({
    onSuccess: (data) => {
      setIsPending(false);
      onSuccess(data);
    },
    onError: (err) => {
      setIsPending(false);
      setHasVerified(false);
      if (err.message === "invalid_code") {
        setError(t("code_provided_invalid"));
      }
    },
  });

  const verifyCodeWithSessionRequired = (code: string, email: string) => {
    verifyCodeMutationUserSessionRequired.mutate({
      code,
      email,
    });
  };

  const verifyCodeWithSessionNotRequired = (code: string, email: string) => {
    verifyCodeMutationUserSessionNotRequired.mutate({
      code,
      email,
    });
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
