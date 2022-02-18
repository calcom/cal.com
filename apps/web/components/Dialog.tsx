import * as DialogPrimitive from "@radix-ui/react-dialog";
import React, { ReactNode } from "react";

export type DialogProps = React.ComponentProps<typeof DialogPrimitive["Root"]>;
export function Dialog(props: DialogProps) {
  const { children, ...other } = props;
  return (
    <DialogPrimitive.Root {...other}>
      <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-gray-500 bg-opacity-75 transition-opacity" />
      {children}
    </DialogPrimitive.Root>
  );
}
type DialogContentProps = React.ComponentProps<typeof DialogPrimitive["Content"]>;

export const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ children, ...props }, forwardedRef) => (
    <DialogPrimitive.Content
      {...props}
      className="fixed left-1/2 top-1/2 z-50 min-w-[360px] -translate-x-1/2 -translate-y-1/2 rounded bg-white p-6 text-left shadow-xl sm:w-full sm:max-w-lg sm:align-middle"
      ref={forwardedRef}>
      {children}
    </DialogPrimitive.Content>
  )
);

type DialogHeaderProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
};

export function DialogHeader(props: DialogHeaderProps) {
  return (
    <div className="mb-8">
      <h3 className="leading-16 font-cal text-xl text-gray-900" id="modal-title">
        {props.title}
      </h3>
      {props.subtitle && <div className="text-sm text-gray-400">{props.subtitle}</div>}
    </div>
  );
}

export function DialogFooter(props: { children: ReactNode }) {
  return (
    <div>
      <div className="mt-5 flex justify-end space-x-2 rtl:space-x-reverse">{props.children}</div>
    </div>
  );
}

DialogContent.displayName = "DialogContent";

export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
