import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

export function Dialog({ children, ...props }) {
  return (
    <DialogPrimitive.Root {...props} className="fixed z-10 inset-0 overflow-y-auto">
      <DialogPrimitive.Overlay className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
      {children}
    </DialogPrimitive.Root>
  );
}

export const DialogContent = React.forwardRef(({ children, ...props }, forwardedRef) => (
  <DialogPrimitive.Content
    {...props}
    ref={forwardedRef}
    className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
    <div className="inline-block align-bottom bg-white rounded-sm px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
      {children}
    </div>
  </DialogPrimitive.Content>
));

DialogContent.displayName = "DialogContent";

export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
