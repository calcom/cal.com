"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import type { ForwardRefExoticComponent, ReactNode } from "react";
import React from "react";
import type { ButtonProps } from "../button";
import { Button } from "../button";
import type { IconName } from "../icon";
import { Icon } from "../icon";

const dialogClasses = cva(
  "fadeIn bg-default scroll-bar fixed left-1/2 top-1/2 z-50 w-[95vw] m-auto -translate-x-1/2 -translate-y-1/2 rounded-2xl text-left shadow-xl focus-visible:outline-none sm:align-middle",
  {
    variants: {
      size: {
        xl: "px-8 pt-8 sm:max-w-360",
        lg: "px-8 pt-8 sm:max-w-280",
        md: "px-8 pt-8 sm:max-w-3xl",
        default: "px-8 pt-8 sm:max-w-140",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

export type DialogProps = React.ComponentProps<(typeof DialogPrimitive)["Root"]>;

export function Dialog(props: DialogProps) {
  const { children, ...dialogProps } = props;
  return <DialogPrimitive.Root {...dialogProps}>{children}</DialogPrimitive.Root>;
}

type DialogContentProps = React.ComponentProps<(typeof DialogPrimitive)["Content"]> & {
  type?: "creation" | "confirmation";
  title?: string;
  description?: string | JSX.Element | null;
  closeText?: string;
  actionDisabled?: boolean;
  Icon?: IconName;
  enableOverflow?: boolean;
  forceOverlayWhenNoModal?: boolean;
  /**
   * Disables the ability to close the dialog by clicking outside of it. Could be useful when the dialog is doing something critical which might be in progress.
   */
  preventCloseOnOutsideClick?: boolean;
} & VariantProps<typeof dialogClasses>;

// enableOverflow:- use this prop whenever content inside DialogContent could overflow and require scrollbar
export const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  (
    {
      children,
      title,
      Icon: icon,
      enableOverflow,
      forceOverlayWhenNoModal,
      type = "creation",
      preventCloseOnOutsideClick,
      ...props
    },
    forwardedRef
  ) => {
    return (
      <DialogPrimitive.Portal>
        {forceOverlayWhenNoModal ? (
          <div className="fadeIn fixed inset-0 z-50  bg-neutral-800/70 transition-opacity" />
        ) : (
          <DialogPrimitive.Overlay className="fadeIn fixed inset-0 z-50 bg-neutral-800/70 transition-opacity dark:bg-neutral-800/80" />
        )}
        <DialogPrimitive.Content
          {...props}
          onPointerDownOutside={(e) => {
            if (preventCloseOnOutsideClick) {
              e.preventDefault();
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className={classNames(
            dialogClasses({ size: props.size }),
            "max-h-[95vh]",
            enableOverflow ? "overflow-y-auto" : "overflow-visible",
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
                <div className="bg-emphasis flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                  <Icon name={icon} className="text-emphasis h-4 w-4" />
                </div>
              )}
              <div className="ml-4 grow">
                <DialogHeader title={title} subtitle={props.description} />
                <div data-testid="dialog-confirmation">{children}</div>
              </div>
            </div>
          )}
          {!type && children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
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
      <h2
        data-testid="dialog-title"
        className="text-semibold text-emphasis font-cal mb-1 text-xl"
        id="modal-title">
        {props.title}
      </h2>
      {props.subtitle && (
        <p className="text-subtle text-sm" data-testid="dialog-subtitle">
          {props.subtitle}
        </p>
      )}
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
    <div
      className={classNames(
        "bg-cal-muted border-muted bottom-0 -mx-8 mt-10 rounded-b-2xl border",
        props?.noSticky ? "" : "sticky",
        props.className
      )}>
      {props.showDivider && <div data-testid="divider" className="border-subtle border-t" />}
      <div className={classNames("flex justify-end space-x-2 px-8 py-4 font-sans rtl:space-x-reverse")}>
        {props.children}
      </div>
    </div>
  );
}

DialogContent.displayName = "DialogContent";

export const DialogTrigger: ForwardRefExoticComponent<
  DialogPrimitive.DialogTriggerProps & React.RefAttributes<HTMLButtonElement>
> = React.forwardRef((props, ref) => {
  return <DialogPrimitive.Trigger {...props} ref={ref} />;
});

DialogTrigger.displayName = "DialogTrigger";

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
  const { className, ...buttonProps } = props;

  return (
    <DialogPrimitive.Close asChild {...props.dialogCloseProps}>
      <Button
        data-testid={props["data-testid"] || "dialog-rejection"}
        color={props.color || "minimal"}
        className={classNames(props.color === "destructive" && "destructive", className)}
        {...buttonProps}>
        {props.children ? props.children : t("close")}
      </Button>
    </DialogPrimitive.Close>
  );
}
