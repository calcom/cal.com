import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useRouter } from "next/router";
import React, { ReactNode, useState } from "react";

export type DialogProps = React.ComponentProps<typeof DialogPrimitive["Root"]> & {
  name?: string;
  clearQueryParamsOnClose?: string[];
};
export function Dialog(props: DialogProps) {
  const router = useRouter();
  const { children, name, ...dialogProps } = props;
  // only used if name is set
  const [open, setOpen] = useState(!!dialogProps.open);

  if (name) {
    const clearQueryParamsOnClose = ["dialog", ...(props.clearQueryParamsOnClose || [])];
    dialogProps.onOpenChange = (open) => {
      if (props.onOpenChange) {
        props.onOpenChange(open);
      }
      // toggles "dialog" query param
      if (open) {
        router.query["dialog"] = name;
      } else {
        clearQueryParamsOnClose.forEach((queryParam) => {
          delete router.query[queryParam];
        });
      }
      router.push(
        {
          pathname: router.pathname,
          query: {
            ...router.query,
          },
        },
        undefined,
        { shallow: true }
      );
      setOpen(open);
    };
    // handles initial state
    if (!open && router.query["dialog"] === name) {
      setOpen(true);
    }
    // allow overriding
    if (!("open" in dialogProps)) {
      dialogProps.open = open;
    }
  }

  return (
    <DialogPrimitive.Root {...dialogProps}>
      <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-gray-500 bg-opacity-75 transition-opacity" />
      {children}
    </DialogPrimitive.Root>
  );
}
type DialogContentProps = React.ComponentProps<typeof DialogPrimitive["Content"]>;

export const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ children, ...props }, forwardedRef) => (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-gray-500 bg-opacity-75 transition-opacity" />
      <DialogPrimitive.Content
        {...props}
        className="fixed left-1/2 top-1/2 z-[9999999999] min-w-[360px] -translate-x-1/2 -translate-y-1/2 rounded bg-white p-6 text-left shadow-xl focus-visible:outline-none sm:w-full sm:max-w-[35rem] sm:align-middle"
        ref={forwardedRef}>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
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
