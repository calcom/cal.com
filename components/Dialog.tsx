import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

export function Dialog({ children, ...props }) {
  return (
    <DialogPrimitive.Root {...props}>
      <DialogPrimitive.Overlay className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
      {children}
    </DialogPrimitive.Root>
  );
}

export const DialogContent = React.forwardRef(({ children, ...props }, forwardedRef) => (
  <DialogPrimitive.Content
    {...props}
    className="fixed bg-white min-w-[360px] rounded top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-left overflow-hidden shadow-xl sm:align-middle sm:max-w-lg sm:w-full p-6"
    ref={forwardedRef}>
    {children}
  </DialogPrimitive.Content>
));

export function DialogHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-8">
      <h3 className="text-lg leading-6 font-bold text-gray-900" id="modal-title">
        {title}
      </h3>
      <div>
        <p className="text-sm text-gray-400">{subtitle}</p>
      </div>
    </div>
  );
}

DialogContent.displayName = "DialogContent";

export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
