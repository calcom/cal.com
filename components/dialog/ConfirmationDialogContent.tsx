import { DialogClose, DialogContent } from "@components/Dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ExclamationIcon } from "@heroicons/react/outline";
import React from "react";

export default function ConfirmationDialogContent({
  title,
  alert,
  confirmBtnText,
  cancelBtnText,
  onConfirm,
  children,
}) {
  confirmBtnText = confirmBtnText || "Confirm";
  cancelBtnText = cancelBtnText || "Cancel";

  return (
    <DialogContent>
      <div className="flex">
        {alert && (
          <div className="mr-3 mt-0.5">
            {alert === "danger" && (
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
      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
        <DialogClose onClick={onConfirm} className="btn btn-primary">
          {confirmBtnText}
        </DialogClose>
        <DialogClose className="btn btn-white mx-2">{cancelBtnText}</DialogClose>
      </div>
    </DialogContent>
  );
}
