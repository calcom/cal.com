"use client";

import { cn } from "@calid/features/lib/cn";
import { Icon } from "@calid/features/ui/components/icon";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

const dialogClasses = cva(
  "fixed left-[50%] top-[50%] z-50 grid w-[95vw] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-md border bg-white shadow-lg duration-200",
  {
    variants: {
      size: {
        xl: "max-w-[90rem] p-8",
        lg: "max-w-[70rem] p-8",
        md: "max-w-[48rem] p-8",
        default: "max-w-lg p-6",
        sm: "w-1/3 p-6",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

export type DialogProps = React.ComponentProps<(typeof DialogPrimitive)["Root"]>;
export const DialogClose = DialogPrimitive.Close;

export function Dialog(props: DialogProps) {
  const { children, ...dialogProps } = props;
  return <DialogPrimitive.Root {...dialogProps}>{children}</DialogPrimitive.Root>;
}

export const DialogTrigger = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Trigger>
>(({ children, ...props }, ref) => (
  <DialogPrimitive.Trigger ref={ref} asChild {...props}>
    {children}
  </DialogPrimitive.Trigger>
));
DialogTrigger.displayName = "DialogTrigger";

export const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/30 backdrop-blur-sm",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> &
    VariantProps<typeof dialogClasses> & {
      type?: "creation" | "confirmation";
      title?: string;
      description?: string | JSX.Element | null;
      Icon?: React.ComponentProps<typeof Icon>["name"];
      enableOverflow?: boolean;
      preventCloseOnOutsideClick?: boolean;
    }
>(
  (
    {
      className,
      children,
      size,
      type,
      title,
      description,
      Icon: icon,
      enableOverflow,
      preventCloseOnOutsideClick,
      ...props
    },
    ref
  ) => (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          dialogClasses({ size }),
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
          "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
          "max-h-[95vh]",
          enableOverflow ? "overflow-y-auto" : "overflow-visible",
          className
        )}
        onPointerDownOutside={(e) => {
          if (preventCloseOnOutsideClick) {
            e.preventDefault();
          }
        }}
        {...props}>
        {type === "creation" && (
          <div>
            <DialogHeader title={title} subtitle={description} />
            <div data-testid="dialog-creation" className="flex flex-col">
              {children}
            </div>
          </div>
        )}

        {type === "confirmation" && (
          <div className="flex">
            {icon && (
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-100">
                <Icon name={icon} className="h-4 w-4 text-slate-600" />
              </div>
            )}
            <div className={cn("flex-grow", icon && "ml-4")}>
              <DialogHeader title={title} subtitle={description} />
              <div data-testid="dialog-confirmation">{children}</div>
            </div>
          </div>
        )}

        {!type && children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
);
DialogContent.displayName = DialogPrimitive.Content.displayName;

export const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

export const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-row justify-end space-x-2", className)} {...props} />
);
DialogFooter.displayName = "DialogFooter";

export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight text-slate-900", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-slate-600", className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;
