import { ExclamationIcon } from "@heroicons/react/outline";
import { CheckIcon } from "@heroicons/react/solid";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import React, { PropsWithChildren } from "react";

import { useLocale } from "@lib/hooks/useLocale";

import { DialogClose, DialogContent } from "@components/Dialog";
import { Button } from "@components/ui/Button";

export type ConfirmationDialogContentProps = {
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
              <div className="text-center p-2 rounded-full mx-auto bg-red-100">
                <ExclamationIcon className="w-5 h-5 text-red-600" />
              </div>
            )}
            {variety === "warning" && (
              <div className="text-center p-2 rounded-full mx-auto bg-orange-100">
                <ExclamationIcon className="w-5 h-5 text-orange-600" />
              </div>
            )}
            {variety === "success" && (
              <div className="text-center p-2 rounded-full mx-auto bg-green-100">
                <CheckIcon className="w-5 h-5 text-green-600" />
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
      <div className="mt-5 sm:mt-8 sm:flex sm:flex-row-reverse gap-x-2">
        <DialogClose onClick={onConfirm} asChild>
          <Button color="primary">{confirmBtnText}</Button>
        </DialogClose>
        <DialogClose asChild>
          <Button color="secondary">{cancelBtnText}</Button>
        </DialogClose>
      </div>
    </DialogContent>
  );
}
