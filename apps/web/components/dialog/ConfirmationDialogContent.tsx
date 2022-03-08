import { ExclamationIcon } from "@heroicons/react/outline";
import { CheckIcon } from "@heroicons/react/solid";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import React, { PropsWithChildren, ReactNode } from "react";

import { useLocale } from "@lib/hooks/useLocale";

import { DialogClose, DialogContent } from "@components/Dialog";
import { Button } from "@components/ui/Button";

export type ConfirmationDialogContentProps = {
  confirmBtn?: ReactNode;
  confirmBtnText?: string;
  cancelBtnText?: string;
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
                <ExclamationIcon className="h-5 w-5 text-red-600" />
              </div>
            )}
            {variety === "warning" && (
              <div className="bg-orange-100 mx-auto rounded-full p-2 text-center">
                <ExclamationIcon className="text-orange-600 h-5 w-5" />
              </div>
            )}
            {variety === "success" && (
              <div className="mx-auto rounded-full bg-green-100 p-2 text-center">
                <CheckIcon className="h-5 w-5 text-green-600" />
              </div>
            )}
          </div>
        )}
        <div>
          <DialogPrimitive.Title className="font-cal text-xl font-bold text-gray-900">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-neutral-500 text-sm">
            {children}
          </DialogPrimitive.Description>
        </div>
      </div>
      <div className="mt-5 flex flex-row-reverse gap-x-2 sm:mt-8">
        <DialogClose onClick={onConfirm} asChild>
          {confirmBtn || <Button color="primary">{confirmBtnText}</Button>}
        </DialogClose>
        <DialogClose asChild>
          <Button color="secondary">{cancelBtnText}</Button>
        </DialogClose>
      </div>
    </DialogContent>
  );
}
