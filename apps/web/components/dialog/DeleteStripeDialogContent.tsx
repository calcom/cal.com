import { ExclamationIcon } from "@heroicons/react/outline";
import { CheckIcon } from "@heroicons/react/solid";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import React, { PropsWithChildren, ReactNode } from "react";

import { Button } from "@calcom/ui/Button";
import { DialogClose, DialogContent } from "@calcom/ui/Dialog";

import { useLocale } from "@lib/hooks/useLocale";

export type DeleteStripeDialogContentProps = {
  confirmBtn?: ReactNode;
  cancelAllBookingsBtnText?: string;
  removeBtnText?: string;
  cancelBtnText?: string;
  onConfirm?: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
  onRemove?: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
  title: string;
  variety?: "danger" | "warning" | "success";
};

export default function DeleteStripeDialogContent(props: PropsWithChildren<DeleteStripeDialogContentProps>) {
  const { t } = useLocale();
  const {
    title,
    variety,
    confirmBtn = null,
    cancelAllBookingsBtnText,
    removeBtnText,
    cancelBtnText = t("cancel"),
    onConfirm,
    onRemove,
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
              <div className="mx-auto rounded-full bg-orange-100 p-2 text-center">
                <ExclamationIcon className="h-5 w-5 text-orange-600" />
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
          <DialogPrimitive.Title className="font-cal text-xl text-gray-900">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-sm text-neutral-500">
            {children}
          </DialogPrimitive.Description>
        </div>
      </div>
      <div className="mt-5 flex flex-row-reverse gap-x-2 sm:mt-8">
        <DialogClose onClick={onConfirm} asChild>
          <Button color="alert">{cancelAllBookingsBtnText}</Button>
        </DialogClose>
        <DialogClose onClick={onRemove} asChild>
          <Button color="alert2">{removeBtnText}</Button>
        </DialogClose>
        <DialogClose asChild>
          <Button color="secondary">{cancelBtnText}</Button>
        </DialogClose>
      </div>
    </DialogContent>
  );
}
