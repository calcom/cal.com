import type { Dispatch, SetStateAction } from "react";
import { useState, useEffect } from "react";
import useDigitInput from "react-digit-input";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  Label,
  Input,
} from "@calcom/ui";
import { Info } from "@calcom/ui/components/icon";

/**
 * This component verifies the code for org creation as well as for Booker Email verification which both use different endpoints to verify
 * TODO: We should create separate components for these two tasks, sharing whatever is needed
 */
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
  const [value, onChange] = useState("");

  const digits = useDigitInput({
    acceptedCharacters: /^[0-9]$/,
    length: 6,
    value,
    onChange,
  });

  // Used by org creation as it passes isUserSessionRequiredToVerify=true
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

  // Used by Booker Email verification as it passes isUserSessionRequiredToVerify=false
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

  useEffect(() => onChange(""), [isOpenDialog]);

  const digitClassName = "h-12 w-12 !text-xl text-center";

  return (
    <Dialog
      open={isOpenDialog}
      onOpenChange={(open) => {
        onChange("");
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
              <Button
                loading={isLoading}
                disabled={isLoading}
                onClick={() => {
                  setError("");
                  if (value === "") {
                    setError("The code is a required field");
                  } else {
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
                  }
                }}>
                {t("verify")}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
