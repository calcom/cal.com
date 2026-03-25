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
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@coss/ui/components/input-otp";
import { toastManager } from "@coss/ui/components/toast";
import { PasswordField } from "@coss/ui/shared/password-field";
import { useMemo, useState } from "react";
import TwoFactorAuthAPI from "./TwoFactorAuthAPI";

type SetupStep = "password" | "qrcode" | "totp" | "backup-codes";

interface EnableTwoFactorModalProps {
  open: boolean;
  onClose: () => void;
  onEnable: () => void;
}

function formatBackupCode(code: string) {
  return `${code.slice(0, 5)}-${code.slice(5, 10)}`;
}

export default function EnableTwoFactorModal({ open, onClose, onEnable }: EnableTwoFactorModalProps) {
  const { t } = useLocale();

  const [step, setStep] = useState<SetupStep>("password");
  const [password, setPassword] = useState("");
  const [dataUri, setDataUri] = useState("");
  const [secret, setSecret] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [totpCode, setTotpCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const backupCodesUrl = useMemo(() => {
    if (backupCodes.length === 0) return "";
    const textBlob = new Blob([backupCodes.map(formatBackupCode).join("\n")], {
      type: "text/plain",
    });
    return URL.createObjectURL(textBlob);
  }, [backupCodes]);

  const resetState = () => {
    setStep("password");
    setPassword("");
    setDataUri("");
    setSecret("");
    setBackupCodes([]);
    setTotpCode("");
    setIsSubmitting(false);
    setErrorMessage(null);
  };

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await TwoFactorAuthAPI.setup(password);
      const body = await response.json();

      if (response.status === 200) {
        setDataUri(body.dataUri);
        setSecret(body.secret);
        setBackupCodes(body.backupCodes);
        setStep("qrcode");
        return;
      }

      if (body.error === ErrorCode.IncorrectPassword) {
        setErrorMessage(t("incorrect_password"));
      } else {
        setErrorMessage(t("something_went_wrong"));
      }
    } catch (e) {
      setErrorMessage(t("something_went_wrong"));
      console.error(t("error_enabling_2fa"), e);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleTotpSubmit(e?: React.FormEvent, code?: string) {
    e?.preventDefault();
    if (isSubmitting) return;

    const value = (code ?? totpCode).trim();
    if (value.length !== 6) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await TwoFactorAuthAPI.enable(value);
      const body = await response.json();

      if (response.status === 200) {
        setStep("backup-codes");
        return;
      }

      if (body.error === ErrorCode.IncorrectTwoFactorCode) {
        setErrorMessage(`${t("code_is_incorrect")} ${t("please_try_again")}`);
      } else {
        setErrorMessage(t("something_went_wrong"));
      }
    } catch (e) {
      setErrorMessage(t("something_went_wrong"));
      console.error(t("error_enabling_2fa"), e);
    } finally {
      setIsSubmitting(false);
    }
  }

  const stepDescriptions: Record<SetupStep, string> = {
    password: t("2fa_confirm_current_password"),
    qrcode: t("2fa_scan_image_or_use_code"),
    totp: t("2fa_enter_six_digit_code"),
    "backup-codes": t("backup_code_instructions"),
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      onClose();
    }
  };

  const handleOpenChangeComplete = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetState();
      if (backupCodesUrl) URL.revokeObjectURL(backupCodesUrl);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} onOpenChangeComplete={handleOpenChangeComplete}>
      <DialogPopup showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{step === "backup-codes" ? t("backup_codes") : t("enable_2fa")}</DialogTitle>
          <DialogDescription>{stepDescriptions[step]}</DialogDescription>
        </DialogHeader>

        {step === "password" && (
          <Form className="contents" onSubmit={handlePasswordSubmit}>
            <DialogPanel>
              <Field name="password" invalid={!!errorMessage}>
                <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
                <PasswordField
                  id="password"
                  name="password"
                  required
                  value={password}
                  onChange={(e) => {
                    if (errorMessage) setErrorMessage(null);
                    setPassword(e.target.value);
                  }}
                />
                <FieldError match={errorMessage ? true : "valueMissing"}>
                  {errorMessage ?? t("error_required_field")}
                </FieldError>
              </Field>
            </DialogPanel>
            <DialogFooter>
              <DialogClose render={<Button variant="ghost" />}>{t("cancel")}</DialogClose>
              <Button type="submit" loading={isSubmitting}>
                {t("continue")}
              </Button>
            </DialogFooter>
          </Form>
        )}

        {step === "qrcode" && (
          <>
            <DialogPanel className="flex flex-col gap-1">
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={dataUri} alt="" />
              </div>
              <p data-testid="two-factor-secret" className="text-center font-mono text-xs">
                {secret}
              </p>
            </DialogPanel>
            <DialogFooter>
              <DialogClose render={<Button variant="ghost" />}>{t("cancel")}</DialogClose>
              <Button data-testid="goto-otp-screen" onClick={() => setStep("totp")}>
                {t("continue")}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "totp" && (
          <Form className="contents" onSubmit={handleTotpSubmit}>
            <DialogPanel>
              <Field name="totpCode" invalid={!!errorMessage}>
                <FieldLabel htmlFor="totpCode">{t("2fa_code")}</FieldLabel>
                <InputOTP
                  id="totpCode"
                  aria-label={t("2fa_code")}
                  autoFocus
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={6}
                  pattern={REGEXP_ONLY_DIGITS}
                  value={totpCode}
                  onChange={(value) => {
                    if (errorMessage) setErrorMessage(null);
                    setTotpCode(value);
                    if (value.trim().length === 6) {
                      void handleTotpSubmit(undefined, value);
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
                <FieldError match={!!errorMessage} data-testid="error-submitting-code">
                  {errorMessage}
                </FieldError>
              </Field>
            </DialogPanel>
            <DialogFooter>
              <DialogClose render={<Button variant="ghost" />}>{t("cancel")}</DialogClose>
              <Button
                type="submit"
                data-testid="enable-2fa"
                disabled={totpCode.trim().length !== 6}
                loading={isSubmitting}>
                {t("enable")}
              </Button>
            </DialogFooter>
          </Form>
        )}

        {step === "backup-codes" && (
          <>
            <DialogPanel>
              <div className="grid grid-cols-2 gap-2 text-center font-mono text-sm">
                {backupCodes.map((code) => (
                  <div key={code} className="bg-muted rounded-sm py-1">{formatBackupCode(code)}</div>
                ))}
              </div>
            </DialogPanel>
            <DialogFooter>
              <DialogClose
                render={
                  <Button variant="ghost" data-testid="backup-codes-close" onClick={() => onEnable()} />
                }>
                {t("close")}
              </DialogClose>
              <Button
                variant="outline"
                data-testid="backup-codes-copy"
                onClick={(e) => {
                  e.preventDefault();
                  navigator.clipboard.writeText(backupCodes.map(formatBackupCode).join("\n"));
                  toastManager.add({ title: t("backup_codes_copied"), type: "success" });
                }}>
                {t("copy")}
              </Button>
              <Button data-testid="backup-codes-download" render={<a download="cal-backup-codes.txt" href={backupCodesUrl} />}>{t("download")}</Button>
            </DialogFooter>
          </>
        )}
      </DialogPopup>
    </Dialog>
  );
}
