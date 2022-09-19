import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useRouter } from "next/router";
import React, { ReactNode, useState } from "react";
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
          // This is temporary till we are doing rewrites to /v2.
          // If not done, opening/closing a modalbox can take the user to /v2 paths.
          pathname: router.pathname.replace("/v2", ""),
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
  size?: "xl" | "lg" | "md";
  type: "creation" | "confirmation";
  title?: string;
  description?: string | JSX.Element | undefined;
  closeText?: string;
  actionDisabled?: boolean;
  actionText?: string;
  Icon?: Icon;
  // If this is set it allows you to overide the action buttons. Usefull if you need to use formcontext
  useOwnActionButtons?: boolean;
  actionOnClick?: (e: Event | React.MouseEvent<HTMLElement, MouseEvent>) => void;
  actionOnClose?: () => void;
  actionProps?: React.ComponentProps<typeof Button>;
};

export const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ children, Icon, actionProps, ...props }, forwardedRef) => (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fadeIn fixed inset-0 z-40 bg-gray-500 bg-opacity-75 transition-opacity" />
      {/*zIndex one less than Toast */}
      <DialogPrimitive.Content
        {...props}
        className={classNames(
          "fadeIn fixed left-1/2 top-1/2 z-[9998] min-w-[360px] -translate-x-1/2 -translate-y-1/2 rounded bg-white text-left shadow-xl focus-visible:outline-none sm:w-full sm:align-middle",
          props.size == "xl"
            ? "p-8 sm:max-w-[90rem]"
            : props.size == "lg"
            ? "p-8 sm:max-w-[70rem]"
            : props.size == "md"
            ? "p-8 sm:max-w-[40rem]"
            : "p-8 sm:max-w-[35rem]",
          "max-h-[560px] overflow-visible overscroll-auto md:h-auto md:max-h-[inherit]",
          `${props.className || ""}`
        )}
        ref={forwardedRef}>
        {props.type === "creation" && (
          <div>
            {props.title && <DialogHeader title={props.title} />}
            {props.description && <p className="pb-5 text-sm text-gray-500">{props.description}</p>}
            <div className="flex flex-col space-y-6">{children}</div>
          </div>
        )}
        {props.type === "confirmation" && (
          <div className="flex">
            {Icon && (
              <div className="mr-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-300">
                <Icon className="h-4 w-4 text-black" />
              </div>
            )}
            <div>
              {props.title && <DialogHeader title={props.title} />}
              {props.description && <p className="mb-6 text-sm text-gray-500">{props.description}</p>}
            </div>
          </div>
        )}
        {!props.useOwnActionButtons && (
          <DialogFooter>
            <div className="mt-2 flex space-x-2">
              <DialogClose asChild>
                {/* This will require the i18n string passed in */}
                <Button color="minimal" onClick={props.actionOnClose}>
                  {props.closeText ?? "Close"}
                </Button>
              </DialogClose>
              {props.actionOnClick ? (
                <Button
                  color="primary"
                  disabled={props.actionDisabled}
                  onClick={props.actionOnClick}
                  {...actionProps}>
                  {props.actionText}
                </Button>
              ) : (
                <Button color="primary" type="submit" disabled={props.actionDisabled} {...actionProps}>
                  {props.actionText}
                </Button>
              )}
            </div>
          </DialogFooter>
        )}
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
      <h3 className="leading-20 text-semibold font-cal pb-1 text-xl text-gray-900" id="modal-title">
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
