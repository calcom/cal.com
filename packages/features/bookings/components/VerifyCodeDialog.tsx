import type { Dispatch, SetStateAction } from "react";
import { useState, useEffect, useCallback } from "react";
import useDigitInput from "react-digit-input";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, Label, Input } from "@calcom/ui";
import { Info } from "@calcom/ui/components/icon";

export const VerifyCodeDialog = ({
  isOpenDialog,
  setIsOpenDialog,
  email,
  onSuccess,
  isUserSessionRequiredToVerify = true,
}: {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  email: string;
  onSuccess: (isVerified: boolean) => void;
  isUserSessionRequiredToVerify?: boolean;
}) => {
  const { t } = useLocale();
  // Not using the mutation isLoading flag because after verifying we submit the underlying org creation form
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [value, setValue] = useState("");

  const digits = useDigitInput({
    acceptedCharacters: /^[0-9]$/,
    length: 6,
    value,
    onChange: useCallback((value: string) => {
      // whenever there's a change in the input, we reset the error value.
      setError("");
      setValue(value);
    }, []),
  });

  const verifyCodeMutationUserSessionRequired = trpc.viewer.organizations.verifyCode.useMutation({
    onSuccess: (data) => {
      setIsLoading(false);
      onSuccess(data);
    },
    onError: (err) => {
      setIsLoading(false);
      if (err.message === "invalid_code") {
        setError(t("code_provided_invalid"));
      }
    },
  });

  const verifyCodeMutationUserSessionNotRequired = trpc.viewer.auth.verifyCodeUnAuthenticated.useMutation({
    onSuccess: (data) => {
      setIsLoading(false);
      onSuccess(data);
    },
    onError: (err) => {
      setIsLoading(false);
      if (err.message === "invalid_code") {
        setError(t("code_provided_invalid"));
      }
    },
  });

  const verifyCode = useCallback(() => {
    setError("");
    setIsLoading(true);
    if (isUserSessionRequiredToVerify) {
      verifyCodeMutationUserSessionRequired.mutate({
        code: value,
        email,
      });
    } else {
      verifyCodeMutationUserSessionNotRequired.mutate({
        code: value,
        email,
      });
    }
  }, [
    email,
    isUserSessionRequiredToVerify,
    value,
    verifyCodeMutationUserSessionNotRequired,
    verifyCodeMutationUserSessionRequired,
  ]);

  useEffect(() => {
    // trim the input value because "react-digit-input" creates a string of the given length,
    // even when some digits are missing. And finally we use regex to check if the value consists
    // of 6 non-empty digits.
    if (error || isLoading || !/^\d{6}$/.test(value.trim())) return;

    verifyCode();
  }, [error, isLoading, value, verifyCode]);

  useEffect(() => setValue(""), [isOpenDialog]);

  const digitClassName = "h-12 w-12 !text-xl text-center";

  return (
    <Dialog
      open={isOpenDialog}
      onOpenChange={(open) => {
        setValue("");
        setError("");
        setIsOpenDialog(open);
      }}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-row">
          <div className="w-full">
            <DialogHeader title={t("verify_your_email")} subtitle={t("enter_digit_code", { email })} />
            <Label htmlFor="code">{t("code")}</Label>
            <div className="flex flex-row justify-between">
              <Input
                className={digitClassName}
                name="2fa1"
                inputMode="decimal"
                {...digits[0]}
                autoFocus
                autoComplete="one-time-code"
              />
              <Input className={digitClassName} name="2fa2" inputMode="decimal" {...digits[1]} />
              <Input className={digitClassName} name="2fa3" inputMode="decimal" {...digits[2]} />
              <Input className={digitClassName} name="2fa4" inputMode="decimal" {...digits[3]} />
              <Input className={digitClassName} name="2fa5" inputMode="decimal" {...digits[4]} />
              <Input className={digitClassName} name="2fa6" inputMode="decimal" {...digits[5]} />
            </div>
            {error && (
              <div className="mt-2 flex items-center gap-x-2 text-sm text-red-700">
                <div>
                  <Info className="h-3 w-3" />
                </div>
                <p>{error}</p>
              </div>
            )}
            <DialogFooter>
              <DialogClose />
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
