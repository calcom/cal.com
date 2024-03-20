import type { PropsWithChildren } from "react";

import type { ConfirmationDialogContentProps } from "@calcom/ui";
import { Button } from "@calcom/ui";
import { AlertCircle, Check } from "@calcom/ui/components/icon";

import { DialogContent, DialogClose, DialogTitle, DialogDescription, DialogHeader } from "./dialog";

export function ConfirmationDialogContent(props: PropsWithChildren<ConfirmationDialogContentProps>) {
  const {
    title,
    variety,
    confirmBtn = null,
    confirmBtnText = "Confirm",
    cancelBtnText = "Cancel",
    loadingText = "Loading",
    isPending = false,
    onConfirm,
    children,
  } = props;
  return (
    <DialogContent>
      <>
        <div className="flex items-center">
          {variety && (
            <div className="mt-0.5 ltr:mr-3">
              {variety === "danger" && (
                <div className="bg-error mx-auto rounded-full p-2 text-center">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-100" />
                </div>
              )}
              {variety === "warning" && (
                <div className="bg-attention mx-auto rounded-full p-2 text-center">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                </div>
              )}
              {variety === "success" && (
                <div className="bg-success mx-auto rounded-full p-2 text-center">
                  <Check className="h-5 w-5 text-green-600" />
                </div>
              )}
            </div>
          )}
          <DialogHeader>
            <DialogTitle className="font-cal text-emphasis mt-2 text-xl">{title}</DialogTitle>
            <DialogDescription className="text-subtle text-sm">{children}</DialogDescription>
          </DialogHeader>
        </div>
        <div className="my-5 flex flex-row-reverse gap-x-2 sm:my-8">
          {confirmBtn ? (
            confirmBtn
          ) : (
            <DialogClose asChild>
              <Button
                color="primary"
                onClick={(e) => onConfirm && onConfirm(e)}
                data-testid="dialog-confirmation">
                {isPending ? loadingText : confirmBtnText}
              </Button>
            </DialogClose>
          )}
          <DialogClose asChild>
            <Button disabled={isPending}>{cancelBtnText}</Button>
          </DialogClose>
        </div>
      </>
    </DialogContent>
  );
}
