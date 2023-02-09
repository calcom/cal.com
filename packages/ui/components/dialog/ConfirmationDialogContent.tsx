import * as DialogPrimitive from "@radix-ui/react-dialog";
import React, { PropsWithChildren, ReactNode } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { FiAlertCircle, FiCheck } from "../icon";
import { DialogClose, DialogContent, DialogFooter } from "./Dialog";

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

export function ConfirmationDialogContent(props: PropsWithChildren<ConfirmationDialogContentProps>) {
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
    <DialogContent
      Icon={FiAlertCircle}
      title={title}
      type={variety === "danger" ? "destruction" : undefined}
      description={<>{children}</>}>
      <DialogFooter>
        <DialogClose disabled={isLoading}>{cancelBtnText}</DialogClose>
        {confirmBtn ? (
          confirmBtn
        ) : (
          <DialogClose color="primary" loading={isLoading} onClick={(e) => onConfirm && onConfirm(e)}>
            {isLoading ? loadingText : confirmBtnText}
          </DialogClose>
        )}
      </DialogFooter>
    </DialogContent>
  );
}
