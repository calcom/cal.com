import { DialogClose, DialogContent } from "@components/Dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ExclamationIcon } from "@heroicons/react/outline";
import React, { PropsWithChildren } from "react";
import { Button } from "@components/ui/Button";

export type ConfirmationDialogContentProps = {
  confirmBtnText?: string;
  cancelBtnText?: string;
  onConfirm: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
  title: string;
  variety?: "danger" /* no others yet */;
};

export default function ConfirmationDialogContent(props: PropsWithChildren<ConfirmationDialogContentProps>) {
  const { title, variety, confirmBtnText = "Confirm", cancelBtnText = "Cancel", onConfirm, children } = props;

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
          </div>
        )}
        <div>
          <DialogPrimitive.Title className="text-xl font-bold text-gray-900">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-neutral-500">{children}</DialogPrimitive.Description>
        </div>
      </div>
      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-x-2">
        <DialogClose as={Button} color="primary" onClick={onConfirm}>
          {confirmBtnText}
        </DialogClose>
        <DialogClose as={Button} color="secondary">
          {cancelBtnText}
        </DialogClose>
      </div>
    </DialogContent>
  );
}
