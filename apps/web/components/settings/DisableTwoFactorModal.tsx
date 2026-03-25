"use client";

import { ErrorCode } from "@calcom/features/auth/lib/ErrorCode";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@coss/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@coss/ui/components/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@coss/ui/components/field";
import { Form } from "@coss/ui/components/form";
import { Input } from "@coss/ui/components/input";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@coss/ui/components/input-otp";
import { PasswordField } from "@coss/ui/shared/password-field";
import { useState } from "react";
import TwoFactorAuthAPI from "./TwoFactorAuthAPI";

interface DisableTwoFactorModalProps {
  open: boolean;
  onClose: () => void;
  onDisable: () => void;
  disablePassword?: boolean;
}

export default function DisableTwoFactorModal({
  open,
  onClose,
  onDisable,
  disablePassword,
}: DisableTwoFactorModalProps) {
  const { t } = useLocale();

  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [isDisabling, setIsDisabling] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [twoFactorLostAccess, setTwoFactorLostAccess] = useState(false);

  const resetState = () => {
    setPassword("");
    setTotpCode("");
    setBackupCode("");
    setIsDisabling(false);
    setPasswordError(null);
    setTwoFactorError(null);
    setTwoFactorLostAccess(false);
  };

  async function handleDisable(e?: React.FormEvent, totpCodeOverride?: string) {
    e?.preventDefault();
    if (isDisabling) return;

    const code = totpCodeOverride ?? totpCode;
    if (!twoFactorLostAccess && code.trim().length !== 6) return;

    setIsDisabling(true);
    setPasswordError(null);
    setTwoFactorError(null);

    try {
      const response = await TwoFactorAuthAPI.disable(password, code, backupCode);
      if (response.status === 200) {
        resetState();
        onDisable();
        return;
      }

      const body = await response.json();
      if (body.error === ErrorCode.IncorrectPassword) {
        setPasswordError(t("incorrect_password"));
      } else if (
        body.error === ErrorCode.SecondFactorRequired ||
        body.error === ErrorCode.IncorrectTwoFactorCode ||
        body.error === ErrorCode.IncorrectBackupCode ||
        body.error === ErrorCode.MissingBackupCodes
      ) {
        const msg =
          body.error === ErrorCode.SecondFactorRequired
            ? t("2fa_required")
            : body.error === ErrorCode.IncorrectTwoFactorCode
              ? t("incorrect_2fa")
              : body.error === ErrorCode.IncorrectBackupCode
                ? t("incorrect_backup_code")
                : t("missing_backup_codes");
        setTwoFactorError(msg);
      } else {
        setTwoFactorError(t("something_went_wrong"));
      }
    } catch (e) {
      setTwoFactorError(t("something_went_wrong"));
      console.error(t("error_disabling_2fa"), e);
    } finally {
      setIsDisabling(false);
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      onClose();
    }
  };

  const handleOpenChangeComplete = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetState();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} onOpenChangeComplete={handleOpenChangeComplete}>
      <DialogPopup showCloseButton={false}>
        <Form className="contents" onSubmit={handleDisable}>
          <DialogHeader>
            <DialogTitle>{t("disable_2fa")}</DialogTitle>
            <DialogDescription>{t("disable_2fa_recommendation")}</DialogDescription>
          </DialogHeader>
          <DialogPanel className="grid gap-4">
            {!disablePassword && (
              <Field name="password" invalid={!!passwordError}>
                <FieldLabel htmlFor="disable-2fa-password">{t("password")}</FieldLabel>
                <PasswordField
                  id="disable-2fa-password"
                  name="password"
                  required
                  value={password}
                  onChange={(e) => {
                    if (passwordError) setPasswordError(null);
                    setPassword(e.target.value);
                  }}
                />
                <FieldError match={passwordError ? true : "valueMissing"}>
                  {passwordError ?? t("error_required_field")}
                </FieldError>
              </Field>
            )}

            {twoFactorLostAccess ? (
              <Field name="backupCode" invalid={!!twoFactorError}>
                <FieldLabel htmlFor="backup-code">{t("backup_code")}</FieldLabel>
                <Input
                  id="backup-code"
                  name="backupCode"
                  placeholder="XXXXX-XXXXX"
                  required
                  value={backupCode}
                  onChange={(e) => {
                    if (twoFactorError) setTwoFactorError(null);
                    setBackupCode(e.target.value);
                  }}
                />
                <FieldDescription>{t("backup_code_instructions")}</FieldDescription>
                <FieldError match={twoFactorError ? true : "valueMissing"}>
                  {twoFactorError ?? t("error_required_field")}
                </FieldError>
              </Field>
            ) : (
              <Field name="totpCode" invalid={!!twoFactorError}>
                <FieldLabel htmlFor="totpCode">{t("2fa_code")}</FieldLabel>
                <InputOTP
                  id="totpCode"
                  aria-label={t("2fa_code")}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={6}
                  pattern={REGEXP_ONLY_DIGITS}
                  value={totpCode}
                  onChange={(value) => {
                    if (twoFactorError) setTwoFactorError(null);
                    setTotpCode(value);
                    if (value.trim().length === 6) {
                      void handleDisable(undefined, value);
                    }
                  }}>
                  <InputOTPGroup size="lg">
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
                <FieldDescription>{t("2fa_enabled_instructions")}</FieldDescription>
                <FieldError match={!!twoFactorError} data-testid="error-submitting-code">
                  {twoFactorError}
                </FieldError>
              </Field>
            )}

          </DialogPanel>
          <DialogFooter>
            <Button
              variant="outline"
              className="me-auto"
              type="button"
              onClick={() => {
                setTwoFactorLostAccess(!twoFactorLostAccess);
                setTotpCode("");
                setBackupCode("");
                setTwoFactorError(null);
              }}>
              {twoFactorLostAccess ? t("go_back") : t("lost_access")}
            </Button>
            <DialogClose render={<Button variant="ghost" />}>{t("cancel")}</DialogClose>
            <Button type="submit" data-testid="disable-2fa" loading={isDisabling}>
              {t("disable")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogPopup>
    </Dialog>
  );
}
