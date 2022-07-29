import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useRouter } from "next/router";
import React, { ReactNode, useState, MouseEvent } from "react";
import { Icon } from "react-feather";

import classNames from "@calcom/lib/classNames";

import Button from "./Button";

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
      <DialogPrimitive.Overlay className="fadeIn fixed inset-0 z-40 bg-black bg-opacity-50 transition-opacity" />
      {children}
    </DialogPrimitive.Root>
  );
}
type DialogContentProps = React.ComponentProps<typeof DialogPrimitive["Content"]> & {
  size?: "xl" | "lg";
  type?: "creation" | "confirmation";
  title?: string;
  description?: string;
  closeText?: string;
  actionText?: string;
  Icon?: Icon;
  actionOnClick?: () => void;
};

export const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ children, Icon, ...props }, forwardedRef) => (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fadeIn fixed inset-0 z-40 bg-gray-500 bg-opacity-75 transition-opacity" />
      {/*zIndex one less than Toast */}
      <DialogPrimitive.Content
        {...props}
        className={classNames(
          "fadeIn fixed left-1/2 top-1/2 z-[9998] min-w-[360px] -translate-x-1/2 -translate-y-1/2 rounded bg-white text-left shadow-xl focus-visible:outline-none sm:w-full sm:align-middle",
          props.size == "xl"
            ? "p-0.5 sm:max-w-[98vw]"
            : props.size == "lg"
            ? "p-6 sm:max-w-[70rem]"
            : "p-6 sm:max-w-[35rem]",
          "max-h-[560px] overflow-visible overscroll-auto md:h-auto md:max-h-[inherit]",
          `${props.className || ""}`
        )}
        ref={forwardedRef}>
        {props.type === "creation" && (
          <div className="pb-8">
            {props.title && <DialogHeader title={props.title} />}
            {props.description && <p className="pb-8 text-sm text-gray-500">Optional Description</p>}
            <div className="flex flex-col gap-6">{children}</div>
          </div>
        )}
        {props.type === "confirmation" && (
          <div className="flex ">
            {Icon && (
              <div className="mr-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-300">
                <Icon className="h-4 w-4 text-black" />
              </div>
            )}
            <div>
              {props.title && <DialogHeader title={props.title} />}
              {props.description && <p className="mb-6 text-sm text-gray-500">Optional Description</p>}
            </div>
          </div>
        )}
        <DialogFooter>
          <DialogClose asChild>
            {/* This will require the i18n string passed in */}
            <Button color="minimal">{props.closeText ?? "Close"}</Button>
          </DialogClose>
          <Button color="primary" onClick={props.actionOnClick}>
            {props.actionText}
          </Button>
        </DialogFooter>
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
    <>
      <h3 className="leading-20 text-semibold font-cal text-xl text-black" id="modal-title">
        {props.title}
      </h3>
      {props.subtitle && <div className="text-sm text-gray-400">{props.subtitle}</div>}
    </>
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
