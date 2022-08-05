import * as DialogPrimitive from "@radix-ui/react-dialog";
import React, { PropsWithChildren, ReactNode } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/Button";
import { DialogClose, DialogContent } from "@calcom/ui/Dialog";
import { Icon } from "@calcom/ui/Icon";

export type ConfirmationDialogContentProps = {
  confirmBtn?: ReactNode;
  confirmBtnText?: string;
  cancelBtnText?: string;
  isLoading?: boolean;
  loadingText?: string;
  onConfirm?: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
  title: string;
  variety?: "danger" | "warning" | "success";
};

export default function ConfirmationDialogContent(props: PropsWithChildren<ConfirmationDialogContentProps>) {
  const { t } = useLocale();
  const {
    title,
    variety,
    confirmBtn = null,
    confirmBtnText = t("confirm"),
    cancelBtnText = t("cancel"),
    loadingText = t("loading"),
    isLoading = false,
    onConfirm,
    children,
  } = props;

  return (
    <DialogContent>
      <div className="flex">
        {variety && (
          <div className="mt-0.5 ltr:mr-3">
            {variety === "danger" && (
              <div className="mx-auto rounded-full bg-red-100 p-2 text-center">
                <Icon.FiAlertCircle className="h-5 w-5 text-red-600" />
              </div>
            )}
            {variety === "warning" && (
              <div className="mx-auto rounded-full bg-orange-100 p-2 text-center">
                <Icon.FiAlertCircle className="h-5 w-5 text-orange-600" />
              </div>
            )}
            {variety === "success" && (
              <div className="mx-auto rounded-full bg-green-100 p-2 text-center">
                <Icon.FiCheck className="h-5 w-5 text-green-600" />
              </div>
            )}
          </div>
        )}
        <div>
          <DialogPrimitive.Title className="font-cal text-xl text-gray-900">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-sm text-neutral-500">
            {children}
          </DialogPrimitive.Description>
        </div>
      </div>
      <div className="mt-5 flex flex-row-reverse gap-x-2 sm:mt-8">
        <DialogClose disabled={isLoading} onClick={onConfirm} asChild>
          {confirmBtn || (
            <Button data-testid="confirm-button" color="primary" loading={isLoading}>
              {isLoading ? loadingText : confirmBtnText}
            </Button>
          )}
        </DialogClose>
        <DialogClose disabled={isLoading} asChild>
          <Button color="secondary">{cancelBtnText}</Button>
        </DialogClose>
      </div>
    </DialogContent>
  );
}
