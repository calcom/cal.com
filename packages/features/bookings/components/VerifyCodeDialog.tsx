import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useState } from "react";
import useDigitInput from "react-digit-input";

import { useBookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter, DialogHeader, DialogClose } from "@calcom/ui/components/dialog";
import { Input } from "@calcom/ui/components/form";
import { Label } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";

export const VerifyCodeDialog = ({
  isOpenDialog,
  setIsOpenDialog,
  email,
  isUserSessionRequiredToVerify = true,
  verifyCodeWithSessionNotRequired,
  verifyCodeWithSessionRequired,
  resetErrors,
  setIsPending,
  isPending,
  error,
}: {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  email: string;
  isUserSessionRequiredToVerify?: boolean;
  verifyCodeWithSessionNotRequired: (code: string, email: string) => void;
  verifyCodeWithSessionRequired: (code: string, email: string) => void;
  resetErrors: () => void;
  isPending: boolean;
  setIsPending: (status: boolean) => void;
  error: string;
}) => {
  const { t } = useLocale();
  const [value, setValue] = useState("");
  const [hasVerified, setHasVerified] = useState(false);
  const setVerificationCode = useBookerStoreContext((state) => state.setVerificationCode);

  const digits = useDigitInput({
    acceptedCharacters: /^[0-9]$/,
    length: 6,
    value,
    onChange: useCallback((value: string) => {
      // whenever there's a change in the input, we reset the error value.
      resetErrors();
      setValue(value);
    }, []),
  });

  const verifyCode = useCallback(() => {
    resetErrors();
    setIsPending(true);
    if (isUserSessionRequiredToVerify) {
      verifyCodeWithSessionRequired(value, email);
    } else {
      verifyCodeWithSessionNotRequired(value, email);
    }
    setVerificationCode(value);
    setHasVerified(true);
  }, [
    resetErrors,
    setIsPending,
    isUserSessionRequiredToVerify,
    verifyCodeWithSessionRequired,
    value,
    email,
    verifyCodeWithSessionNotRequired,
    setVerificationCode,
  ]);

  useEffect(() => {
    // trim the input value because "react-digit-input" creates a string of the given length,
    // even when some digits are missing. And finally we use regex to check if the value consists
    // of 6 non-empty digits.
    if (hasVerified || error || isPending || !/^\d{6}$/.test(value.trim())) return;

    verifyCode();
  }, [error, isPending, value, hasVerified]);

  useEffect(() => setValue(""), [isOpenDialog]);

  const digitClassName = "h-12 w-12 text-xl! text-center";

  return (
    <Dialog
      open={isOpenDialog}
      onOpenChange={() => {
        resetErrors();
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
                  <Icon name="info" className="h-3 w-3" />
                </div>
                <p>{error}</p>
              </div>
            )}
            <DialogFooter noSticky>
              <DialogClose onClick={() => setIsOpenDialog(false)} />
              <Button type="submit" onClick={verifyCode} loading={isPending}>
                {t("submit")}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
