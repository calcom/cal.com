import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { PropsWithChildren, ReactElement } from "react";
import React from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { FiAlertCircle, FiCheck } from "../icon";
import { DialogClose, DialogContent } from "./Dialog";

type ConfirmBtnType =
  | { confirmBtn?: never; confirmBtnText?: string }
  | { confirmBtnText?: never; confirmBtn?: ReactElement };

export type ConfirmationDialogContentProps = {
  cancelBtnText?: string;
  isLoading?: boolean;
  loadingText?: string;
  onConfirm?: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
  title: string;
  variety?: "danger" | "warning" | "success";
} & ConfirmBtnType;

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
    <DialogContent type="creation">
      <div className="flex">
        {variety && (
          <div className="mt-0.5 ltr:mr-3">
            {variety === "danger" && (
              <div className="mx-auto rounded-full bg-red-100 p-2 text-center">
                <FiAlertCircle className="h-5 w-5 text-red-600" />
              </div>
            )}
            {variety === "warning" && (
              <div className="mx-auto rounded-full bg-orange-100 p-2 text-center">
                <FiAlertCircle className="h-5 w-5 text-orange-600" />
              </div>
            )}
            {variety === "success" && (
              <div className="mx-auto rounded-full bg-green-100 p-2 text-center">
                <FiCheck className="h-5 w-5 text-green-600" />
              </div>
            )}
          </div>
        )}
        <div>
          <DialogPrimitive.Title className="font-cal text-xl text-gray-900">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-sm text-gray-500">
            {children}
          </DialogPrimitive.Description>
        </div>
      </div>
      <div className="mt-5 flex flex-row-reverse gap-x-2 sm:mt-8">
        {confirmBtn ? (
          confirmBtn
        ) : (
          <DialogClose color="primary" loading={isLoading} onClick={(e) => onConfirm && onConfirm(e)}>
            {isLoading ? loadingText : confirmBtnText}
          </DialogClose>
        )}
        <DialogClose disabled={isLoading}>{cancelBtnText}</DialogClose>
      </div>
    </DialogContent>
  );
}
