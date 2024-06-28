import * as DialogPrimitive from "@radix-ui/react-dialog";
import { usePathname, useRouter } from "next/navigation";
import type { ForwardRefExoticComponent, ReactElement, ReactNode } from "react";
import React, { useMemo, useState } from "react";

import { Dialog as PlatformDialogPrimitives, useIsPlatform } from "@calcom/atoms/monorepo";
import classNames from "@calcom/lib/classNames";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import type { IconName } from "../..";
import { Icon } from "../..";
import type { ButtonProps } from "../../components/button";
import { Button } from "../../components/button";

export type DialogProps = React.ComponentProps<(typeof DialogPrimitive)["Root"]> & {
  name?: string;
  clearQueryParamsOnClose?: string[];
};

const enum DIALOG_STATE {
  // Dialog is there in the DOM but not visible.
  CLOSED = "CLOSED",
  // State from the time b/w the Dialog is dismissed and the time the "dialog" query param is removed from the URL.
  CLOSING = "CLOSING",
  // Dialog is visible.
  OPEN = "OPEN",
}

export function Dialog(props: DialogProps) {
  const isPlatform = useIsPlatform();
  return !isPlatform ? <WebDialog {...props} /> : <PlatformDialogPrimitives.Dialog {...props} />;
}

function WebDialog(props: DialogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useCompatSearchParams();
  const newSearchParams = new URLSearchParams(searchParams ?? undefined);
  const { children, name, ...dialogProps } = props;

  // only used if name is set
  const [dialogState, setDialogState] = useState(dialogProps.open ? DIALOG_STATE.OPEN : DIALOG_STATE.CLOSED);
  const shouldOpenDialog = newSearchParams.get("dialog") === name;
  if (name) {
    const clearQueryParamsOnClose = ["dialog", ...(props.clearQueryParamsOnClose || [])];
    dialogProps.onOpenChange = (open) => {
      if (props.onOpenChange) {
        props.onOpenChange(open);
      }

      // toggles "dialog" query param
      if (open) {
        newSearchParams.set("dialog", name);
      } else {
        clearQueryParamsOnClose.forEach((queryParam) => {
          newSearchParams.delete(queryParam);
        });
        router.push(`${pathname}?${newSearchParams.toString()}`);
      }
      setDialogState(open ? DIALOG_STATE.OPEN : DIALOG_STATE.CLOSING);
    };

    if (dialogState === DIALOG_STATE.CLOSED && shouldOpenDialog) {
      setDialogState(DIALOG_STATE.OPEN);
    }

    if (dialogState === DIALOG_STATE.CLOSING && !shouldOpenDialog) {
      setDialogState(DIALOG_STATE.CLOSED);
    }

    // allow overriding
    if (!("open" in dialogProps)) {
      dialogProps.open = dialogState === DIALOG_STATE.OPEN ? true : false;
    }
  }

  return <DialogPrimitive.Root {...dialogProps}>{children}</DialogPrimitive.Root>;
}

type DialogContentProps = React.ComponentProps<(typeof DialogPrimitive)["Content"]> & {
  size?: "xl" | "lg" | "md";
  type?: "creation" | "confirmation";
  title?: string;
  description?: string | JSX.Element | null;
  closeText?: string;
  actionDisabled?: boolean;
  Icon?: IconName;
  enableOverflow?: boolean;
};

// enableOverflow:- use this prop whenever content inside DialogContent could overflow and require scrollbar
export const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ children, title, Icon: icon, enableOverflow, type = "creation", ...props }, forwardedRef) => {
    const isPlatform = useIsPlatform();
    const [Portal, Overlay, Content] = useMemo(
      () =>
        isPlatform
          ? [
              ({ children }: { children: ReactElement | ReactElement[] }) => <>{children}</>,
              PlatformDialogPrimitives.DialogOverlay,
              PlatformDialogPrimitives.DialogContent,
            ]
          : [DialogPrimitive.Portal, DialogPrimitive.Overlay, DialogPrimitive.Content],
      [isPlatform]
    );
    return (
      <Portal>
        <Overlay className="fadeIn fixed inset-0 z-50 bg-neutral-800 bg-opacity-70 transition-opacity dark:bg-opacity-70 " />
        <Content
          {...props}
          className={classNames(
            "fadeIn bg-default scroll-bar fixed left-1/2 top-1/2 z-50 w-full max-w-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-md text-left shadow-xl focus-visible:outline-none sm:align-middle",
            props.size == "xl"
              ? "px-8 pt-8 sm:max-w-[90rem]"
              : props.size == "lg"
              ? "px-8 pt-8 sm:max-w-[70rem]"
              : props.size == "md"
              ? "px-8 pt-8 sm:max-w-[48rem]"
              : "px-8 pt-8 sm:max-w-[35rem]",
            "max-h-[95vh]",
            enableOverflow ? "overflow-auto" : "overflow-visible",
            `${props.className || ""}`
          )}
          ref={forwardedRef}>
          {type === "creation" && (
            <div>
              <DialogHeader title={title} subtitle={props.description} />
              <div data-testid="dialog-creation" className="flex flex-col">
                {children}
              </div>
            </div>
          )}
          {type === "confirmation" && (
            <div className="flex">
              {icon && (
                <div className="bg-emphasis flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full">
                  <Icon name={icon} className="text-emphasis h-4 w-4" />
                </div>
              )}
              <div className="ml-4 flex-grow">
                <DialogHeader title={title} subtitle={props.description} />
                <div data-testid="dialog-confirmation">{children}</div>
              </div>
            </div>
          )}
          {!type && children}
        </Content>
      </Portal>
    );
  }
);

type DialogHeaderProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>;

export function DialogHeader(props: DialogHeaderProps) {
  if (!props.title) return null;

  return (
    <div className="mb-4">
      <h3
        data-testid="dialog-title"
        className="leading-20 text-semibold font-cal text-emphasis pb-1 text-xl"
        id="modal-title">
        {props.title}
      </h3>
      {props.subtitle && <p className="text-subtle text-sm">{props.subtitle}</p>}
    </div>
  );
}

type DialogFooterProps = {
  children: React.ReactNode;
  showDivider?: boolean;
  noSticky?: boolean;
} & React.HTMLAttributes<HTMLDivElement>;

export function DialogFooter(props: DialogFooterProps) {
  return (
    <div className={classNames("bg-default bottom-0", props?.noSticky ? "" : "sticky", props.className)}>
      {props.showDivider && (
        // TODO: the -mx-8 is causing overflow in the dialog buttons
        <hr data-testid="divider" className="border-subtle -mx-8" />
      )}
      <div
        className={classNames(
          "flex justify-end space-x-2 pb-4 pt-4 rtl:space-x-reverse",
          !props.showDivider && "pb-8"
        )}>
        {props.children}
      </div>
    </div>
  );
}

DialogContent.displayName = "DialogContent";

export const DialogTrigger: ForwardRefExoticComponent<
  DialogPrimitive.DialogTriggerProps & React.RefAttributes<HTMLButtonElement>
> = React.forwardRef((props, ref) => {
  const isPlatform = useIsPlatform();
  return !isPlatform ? (
    <DialogPrimitive.Trigger {...props} ref={ref} />
  ) : (
    <PlatformDialogPrimitives.DialogTrigger {...props} ref={ref} />
  );
});

DialogTrigger.displayName = "DialogTrigger";

type DialogCloseProps = {
  "data-testid"?: string;
  dialogCloseProps?: React.ComponentProps<(typeof DialogPrimitive)["Close"]>;
  children?: ReactNode;
  onClick?: (e: React.MouseEvent<HTMLElement, MouseEvent>) => void;
  disabled?: boolean;
  color?: ButtonProps["color"];
} & React.ComponentProps<typeof Button>;

export function DialogClose(
  props: {
    "data-testid"?: string;
    dialogCloseProps?: React.ComponentProps<(typeof DialogPrimitive)["Close"]>;
    children?: ReactNode;
    onClick?: (e: React.MouseEvent<HTMLElement, MouseEvent>) => void;
    disabled?: boolean;
    color?: ButtonProps["color"];
  } & React.ComponentProps<typeof Button>
) {
  const { t } = useLocale();
  const isPlatform = useIsPlatform();
  const Close = useMemo(
    () => (isPlatform ? PlatformDialogPrimitives.DialogClose : DialogPrimitive.Close),
    [isPlatform]
  );

  return (
    <Close asChild {...props.dialogCloseProps}>
      {/* This will require the i18n string passed in */}
      <Button
        data-testid={props["data-testid"] || "dialog-rejection"}
        color={props.color || "minimal"}
        {...props}>
        {props.children ? props.children : t("close")}
      </Button>
    </Close>
  );
}

DialogClose.displayName = "WebDialogClose";
