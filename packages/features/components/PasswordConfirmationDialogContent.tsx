"use client";

import type { PropsWithChildren, ReactElement } from "react";
import { useRef, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { DialogClose, DialogContent } from "@calcom/ui/components/dialog";
import { PasswordField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";

type ConfirmBtnType =
  | { confirmBtn?: never; confirmBtnText?: string }
  | { confirmBtnText?: never; confirmBtn?: ReactElement };

export type PasswordConfirmationDialogContentProps = {
  cancelBtnText?: string;
  isPending?: boolean;
  loadingText?: string;
  onConfirm?: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
  title: string;
  variety?: "danger" | "warning" | "success";
} & ConfirmBtnType;

export function PasswordConfirmationDialogContent(
  props: PropsWithChildren<PasswordConfirmationDialogContentProps>
) {
  return (
    <DialogContent type="creation">
      <PasswordConfirmationContent {...props} />
    </DialogContent>
  );
}

export const PasswordConfirmationContent = (
  props: PropsWithChildren<PasswordConfirmationDialogContentProps>
) => {
  const { t } = useLocale();
  const {
    title,
    variety,
    confirmBtn = null,
    confirmBtnText = t("confirm"),
    cancelBtnText = t("cancel"),
    loadingText = t("loading"),
    isPending = false,
    onConfirm,
    children,
  } = props;

  const [passwordError, setPasswordError] = useState<string | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null!);

  const verifyPasswordMutation = trpc.viewer.auth.verifyPassword.useMutation({
    onSuccess() {
      setPasswordError(null);
    },
    onError() {
      setPasswordError(t("incorrect_password"));
    },
  });

  const handleConfirm = async (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
    e.preventDefault();
    const password = passwordRef.current?.value;

    if (!password) {
      setPasswordError(t("error_required_field"));
      return;
    }

    try {
      await verifyPasswordMutation.mutateAsync({ passwordInput: password });
      onConfirm?.(e);
    } catch {
      // Error is handled in onError callback
    }
  };

  const isLoading = isPending || verifyPasswordMutation.isPending;

  return (
    <>
      <div className="flex">
        {variety && (
          <div className="mt-0.5 ltr:mr-3">
            {variety === "danger" && (
              <div className="bg-error mx-auto rounded-full p-2 text-center">
                <Icon name="circle-alert" className="h-5 w-5 text-red-600 dark:text-red-100" />
              </div>
            )}
            {variety === "warning" && (
              <div className="bg-attention mx-auto rounded-full p-2 text-center">
                <Icon name="circle-alert" className="h-5 w-5 text-orange-600" />
              </div>
            )}
            {variety === "success" && (
              <div className="bg-cal-success mx-auto rounded-full p-2 text-center">
                <Icon name="check" className="h-5 w-5 text-green-600" />
              </div>
            )}
          </div>
        )}
        <div className="w-full">
          <h2 className="font-cal text-emphasis mt-2 text-xl">{title}</h2>
          <div className="text-subtle text-sm">{children}</div>
        </div>
      </div>
      <div className="mt-5">
        <PasswordField
          data-testid="password-confirmation"
          name="password"
          id="password-confirmation"
          autoComplete="current-password"
          required
          label={t("password")}
          ref={passwordRef}
          onChange={() => setPasswordError(null)}
        />
        {passwordError && <p className="text-error mt-1 text-sm">{passwordError}</p>}
      </div>
      <div className="my-5 flex flex-row-reverse gap-x-2 sm:my-8">
        {confirmBtn ? (
          confirmBtn
        ) : (
          <Button
            color="primary"
            loading={isLoading}
            onClick={handleConfirm}
            data-testid="dialog-confirmation">
            {isLoading ? loadingText : confirmBtnText}
          </Button>
        )}
        <DialogClose disabled={isLoading}>{cancelBtnText}</DialogClose>
      </div>
    </>
  );
};
