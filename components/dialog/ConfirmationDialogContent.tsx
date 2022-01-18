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
          <div className="mr-3 mt-0.5">
            {variety === "danger" && (
              <div className="p-2 mx-auto text-center bg-red-100 rounded-full">
                <ExclamationIcon className="w-5 h-5 text-red-600" />
              </div>
            )}
            {variety === "warning" && (
              <div className="p-2 mx-auto text-center bg-orange-100 rounded-full">
                <ExclamationIcon className="w-5 h-5 text-orange-600" />
              </div>
            )}
            {variety === "success" && (
              <div className="p-2 mx-auto text-center bg-green-100 rounded-full">
                <CheckIcon className="w-5 h-5 text-green-600" />
              </div>
            )}
          </div>
        )}
        <div>
          <DialogPrimitive.Title className="text-xl font-bold text-gray-900 font-cal">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-sm text-neutral-500">
            {children}
          </DialogPrimitive.Description>
        </div>
      </div>
      <div className="mt-5 sm:mt-8 sm:flex sm:flex-row-reverse gap-x-2">
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
